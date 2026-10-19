import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SetSaveQueue, draftIsNewer, type DraftStore, type DraftEntry } from "../src/lib/setSaveQueue";
import { resolveCompleted } from "../src/lib/progress";
import { admin, cleanupUsers, createTestUser, linkTrainerClient, type TestUser } from "./helpers";

type Row = { set_index: number; reps: number | null; completed: boolean; completedExplicit?: boolean };
const memDrafts = (): DraftStore & { data: Record<string, DraftEntry> } => {
  const o: any = { data: {} };
  o.get = () => JSON.parse(JSON.stringify(o.data));
  o.set = (v: any) => { o.data = v; };
  return o;
};
function deferred<T>() { let resolve!: (v: T) => void, reject!: (e: any) => void; const promise = new Promise<T>((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }

describe("set save queue", () => {
  let trainer: TestUser; let client: TestUser; let seId = "";
  beforeAll(async () => {
    trainer = await createTestUser("trainer-q", "trainer");
    client = await createTestUser("client-q", "client");
    await linkTrainerClient(trainer.id, client.id);
    const { data: ex } = await admin.from("exercises").select("id").is("trainer_id", null).limit(1).single();
    const s = await trainer.client.from("training_sessions").insert({ client_id: client.id, trainer_id: trainer.id, status: "in_progress", logged_by: "trainer", custom_name: "QA queue" }).select("id").single();
    const se = await trainer.client.from("session_exercises").insert({ session_id: s.data!.id, exercise_id: ex!.id, order_index: 0, target_sets: 1 }).select("id").single();
    seId = se.data!.id;
  }, 60_000);
  afterAll(async () => { await cleanupUsers([trainer.id, client.id]); }, 60_000);

  const realWrite = async (r: Row) => {
    const { data, error } = await trainer.client.from("set_logs").upsert(
      { session_exercise_id: seId, set_index: r.set_index, reps: r.reps, completed: resolveCompleted(r), is_dropset: false },
      { onConflict: "session_exercise_id,set_index" }).select("id").single();
    if (error) throw error;
    return { id: data!.id };
  };

  it("a delayed older save can't overwrite a newer explicit untick (state and reload stay false)", async () => {
    let row: Row = { set_index: 0, reps: 8, completed: true };
    const gate = deferred<void>();
    let calls = 0;
    const q = new SetSaveQueue<Row>({
      getRow: () => row,
      write: async (r) => { const snap = { ...r }; calls++; if (calls === 1) await gate.promise; return realWrite(snap); },
      onAck: () => { /* only ids are patched; completion is never echoed into state */ },
    });
    q.edited("k"); const first = q.save("k");             // old save, completed=true, held open
    row = { ...row, completed: false, completedExplicit: true }; q.edited("k"); // user unticks
    const second = q.save("k");
    gate.resolve(); await first; await second;
    expect(row.completed).toBe(false);
    expect(q.isDirty("k")).toBe(false);
    const { data } = await admin.from("set_logs").select("completed").eq("session_exercise_id", seId).eq("set_index", 0).single();
    expect(data!.completed).toBe(false);
  });

  it("a failed save stays dirty, flush reports it, and retry saves it", async () => {
    const row: Row = { set_index: 1, reps: 5, completed: false };
    let fail = true;
    const drafts = memDrafts();
    const q = new SetSaveQueue<Row>({ getRow: () => row, write: async (r) => { if (fail) throw new Error("offline"); return realWrite(r); }, drafts });
    q.edited("k1");
    const r1 = await q.flush();
    expect(r1.ok).toBe(false);
    expect(q.errorCount).toBe(1);
    expect(drafts.data.k1).toBeTruthy();           // edit kept locally
    fail = false;
    const r2 = await q.flush();
    expect(r2.ok).toBe(true);
    expect(q.errorCount).toBe(0);
    expect(drafts.data.k1).toBeUndefined();        // acknowledged -> draft cleared
    const { data } = await admin.from("set_logs").select("reps").eq("session_exercise_id", seId).eq("set_index", 1).single();
    expect(data!.reps).toBe(5);
  });

  it("an immediate refresh (no blur, no debounce) restores the typed value from the draft", async () => {
    const drafts = memDrafts();
    let row: Row = { set_index: 2, reps: null, completed: false };
    const q1 = new SetSaveQueue<Row>({ getRow: () => row, write: realWrite, drafts, debounceMs: 600 });
    row = { ...row, reps: 11 }; q1.edited("k2"); q1.schedule("k2");
    // "refresh": page dies before the 600ms debounce; nothing was sent.
    const { data: none } = await admin.from("set_logs").select("id").eq("session_exercise_id", seId).eq("set_index", 2);
    expect(none?.length ?? 0).toBe(0);
    const d = drafts.get().k2;
    expect(d.row.reps).toBe(11);
    expect(draftIsNewer(d, null)).toBe(true);
    // New page instance restores and saves it.
    let restored: Row = d.row;
    const q2 = new SetSaveQueue<Row>({ getRow: () => restored, write: realWrite, drafts });
    q2.edited("k2"); expect((await q2.flush()).ok).toBe(true);
    const { data } = await admin.from("set_logs").select("reps").eq("session_exercise_id", seId).eq("set_index", 2).single();
    expect(data!.reps).toBe(11);
    expect(drafts.data.k2).toBeUndefined();
    q1.forget("k2");
  });

  it("an older draft does not override a newer server value", () => {
    expect(draftIsNewer({ row: {}, editedAt: Date.parse("2026-01-01T10:00:00Z") }, "2026-01-01T11:00:00Z")).toBe(false);
    expect(draftIsNewer({ row: {}, editedAt: Date.parse("2026-01-01T12:00:00Z") }, "2026-01-01T11:00:00Z")).toBe(true);
  });
});
