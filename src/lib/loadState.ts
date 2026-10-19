/**
 * Shared loading/error/empty state for screen reads.
 * Rule: a section only shows "empty" after its queries succeeded; a failed
 * query shows an error with Retry instead of looking like "nothing here".
 */
export type LoadStatus = "loading" | "ready" | "error";
export type LoadView = "loading" | "error" | "content" | "content-stale";

/** Return data from a Supabase result, or throw its error (so failures never become empty data). */
export function must<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data;
}

/** What a section should render. Already-loaded content is kept (with a notice) when a refresh fails. */
export function viewFor(status: LoadStatus, loaded: boolean): LoadView {
  if (status === "error") return loaded ? "content-stale" : "error";
  if (status === "loading" && !loaded) return "loading";
  return "content";
}

export type LoadSnapshot = { status: LoadStatus; loaded: boolean };

/**
 * Runs loads with a generation counter: results from an older run (changed route,
 * identity, or a newer reload) are discarded, and both thrown network errors and
 * rejected Supabase errors end in "error" — never stuck in "loading".
 */
export function createLoadRunner(onChange: (s: LoadSnapshot) => void) {
  let gen = 0;
  let loaded = false;
  return {
    async run(fn: (isCurrent: () => boolean) => Promise<void>, opts?: { reset?: boolean }) {
      const g = ++gen;
      if (opts?.reset) loaded = false;
      onChange({ status: "loading", loaded });
      try {
        await fn(() => g === gen);
        if (g !== gen) return;
        loaded = true;
        onChange({ status: "ready", loaded });
      } catch {
        if (g !== gen) return;
        onChange({ status: "error", loaded });
      }
    },
    cancel() { gen++; },
  };
}
