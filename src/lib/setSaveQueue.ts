// Reliable per-set saving for the session logger.
// - Every edit bumps a revision; a save only marks a set clean if no newer edit
//   happened while it was in flight (stale responses never win).
// - Saves for one set run strictly in order; each reads the latest values.
// - Failed saves keep the set dirty and are reported by flush(), so callers
//   can block finishing/navigation until they succeed.
// - Unsaved edits are mirrored synchronously into a local draft store, so an
//   immediate refresh can restore them. Drafts are cleared once acknowledged.

export type DraftStore = {
  get(): Record<string, DraftEntry>;
  set(v: Record<string, DraftEntry>): void;
};
export type DraftEntry = { row: any; editedAt: number };

export type WriteResult = { id?: string };

export class SetSaveQueue<Row> {
  private rev: Record<string, number> = {};
  private chains: Record<string, Promise<void>> = {};
  private timers: Record<string, ReturnType<typeof setTimeout>> = {};
  private dirty = new Set<string>();
  private errors = new Map<string, string>();
  private paused = false;
  private disposed = false;

  constructor(
    private opts: {
      getRow: (key: string) => Row | undefined;
      write: (row: Row) => Promise<WriteResult>; // throws on validation/network/RLS error
      onAck?: (key: string, res: WriteResult) => void; // patch only server-assigned fields (id)
      onChange?: () => void;
      drafts?: DraftStore;
      debounceMs?: number;
    },
  ) {}

  /** Record an edit: bumps revision and stores a local draft right away. */
  edited(key: string) {
    if (this.disposed) return;
    this.rev[key] = (this.rev[key] ?? 0) + 1;
    this.dirty.add(key);
    const row = this.opts.getRow(key);
    if (this.opts.drafts && row) {
      const all = this.opts.drafts.get();
      all[key] = { row, editedAt: Date.now() };
      this.opts.drafts.set(all);
    }
    this.opts.onChange?.();
  }

  save(key: string): Promise<void> {
    if (this.timers[key]) { clearTimeout(this.timers[key]); delete this.timers[key]; }
    const run = (this.chains[key] ?? Promise.resolve()).then(async () => {
      if (this.paused || this.disposed || !this.dirty.has(key)) return;
      const row = this.opts.getRow(key);
      if (!row) { this.forget(key); return; }
      const sentRev = this.rev[key] ?? 0;
      try {
        const res = await this.opts.write(row);
        this.opts.onAck?.(key, res);
        if ((this.rev[key] ?? 0) === sentRev) {
          this.dirty.delete(key);
          this.errors.delete(key);
          this.clearDraft(key);
        }
      } catch (e: any) {
        this.errors.set(key, e?.message ?? "Save failed");
      } finally {
        this.opts.onChange?.();
      }
    });
    this.chains[key] = run;
    return run;
  }

  schedule(key: string) {
    if (this.paused || this.disposed) return;
    if (this.timers[key]) clearTimeout(this.timers[key]);
    this.timers[key] = setTimeout(() => { delete this.timers[key]; void this.save(key); }, this.opts.debounceMs ?? 600);
  }

  /** Save every dirty set and wait. ok=false if anything is still unsaved. */
  async flush(): Promise<{ ok: boolean; errors: string[] }> {
    for (const k of Array.from(this.dirty)) void this.save(k);
    await Promise.all(Object.values(this.chains));
    return { ok: this.dirty.size === 0, errors: Array.from(this.errors.values()) };
  }

  /** Wait for in-flight work on a key (e.g. before deleting the row). */
  async settle(key: string) {
    if (this.timers[key]) { clearTimeout(this.timers[key]); delete this.timers[key]; }
    await this.chains[key];
  }

  /** The set was deleted: drop any pending state and draft. */
  forget(key: string) {
    if (this.timers[key]) { clearTimeout(this.timers[key]); delete this.timers[key]; }
    this.dirty.delete(key);
    this.errors.delete(key);
    this.clearDraft(key);
    this.opts.onChange?.();
  }

  /** Stop starting new writes and wait for in-flight ones (e.g. before deleting the session). Edits stay dirty. */
  async pause() {
    this.paused = true;
    for (const k of Object.keys(this.timers)) { clearTimeout(this.timers[k]); delete this.timers[k]; }
    await Promise.all(Object.values(this.chains));
  }

  /** Undo pause (the delete failed): pending edits are saved again. */
  resume() {
    if (this.disposed) return;
    this.paused = false;
    for (const k of Array.from(this.dirty)) this.schedule(k);
  }

  /** The whole session was discarded: drop every pending edit and draft; never write again. */
  dispose() {
    this.disposed = true;
    this.paused = true;
    for (const k of Object.keys(this.timers)) { clearTimeout(this.timers[k]); delete this.timers[k]; }
    this.dirty.clear();
    this.errors.clear();
    this.opts.drafts?.set({});
    this.opts.onChange?.();
  }

  get errorCount() { return this.errors.size; }
  isDirty(key: string) { return this.dirty.has(key); }
  hasError(key: string) { return this.errors.has(key); }

  private clearDraft(key: string) {
    if (!this.opts.drafts) return;
    const all = this.opts.drafts.get();
    if (key in all) { delete all[key]; this.opts.drafts.set(all); }
  }
}

/** localStorage draft store scoped to one user + one session. */
export function localDraftStore(userId: string, sessionId: string): DraftStore {
  const k = `vf-set-drafts:${userId}:${sessionId}`;
  return {
    get() {
      try { return JSON.parse(localStorage.getItem(k) ?? "{}"); } catch { return {}; }
    },
    set(v) {
      try {
        if (Object.keys(v).length) localStorage.setItem(k, JSON.stringify(v));
        else localStorage.removeItem(k);
      } catch { /* storage full/blocked: server saves still run */ }
    },
  };
}

/** A draft only wins if it was edited after the server row was last updated. */
export function draftIsNewer(draft: DraftEntry, serverUpdatedAt?: string | null) {
  if (!serverUpdatedAt) return true;
  return draft.editedAt > new Date(serverUpdatedAt).getTime();
}
