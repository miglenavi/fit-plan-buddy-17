import { describe, expect, it } from "vitest";
import { createLoadRunner, must, viewFor, type LoadSnapshot } from "../src/lib/loadState";

const deferred = () => {
  let resolve!: () => void, reject!: (e: unknown) => void;
  const promise = new Promise<void>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

describe("loading / error / empty states", () => {
  it("must() throws a rejected Supabase result instead of returning empty data", () => {
    expect(() => must({ data: null, error: { message: "permission denied" } })).toThrow();
    expect(must({ data: [], error: null })).toEqual([]);
  });

  it("view: loading first, error (not empty) on first failure, keeps content on later failure", () => {
    expect(viewFor("loading", false)).toBe("loading");
    expect(viewFor("error", false)).toBe("error");
    expect(viewFor("ready", true)).toBe("content");
    expect(viewFor("loading", true)).toBe("content");
    expect(viewFor("error", true)).toBe("content-stale");
  });

  it("a rejected query ends in error, and Retry success ends in ready", async () => {
    const seen: LoadSnapshot[] = [];
    const r = createLoadRunner((s) => seen.push(s));
    await r.run(async () => { must({ data: null, error: { message: "boom" } }); });
    expect(seen.at(-1)).toEqual({ status: "error", loaded: false });
    await r.run(async () => {});
    expect(seen.at(-1)).toEqual({ status: "ready", loaded: true });
  });

  it("a thrown network error never leaves the section stuck loading", async () => {
    const seen: LoadSnapshot[] = [];
    const r = createLoadRunner((s) => seen.push(s));
    await r.run(async () => { throw new TypeError("Failed to fetch"); });
    expect(seen.at(-1)?.status).toBe("error");
  });

  it("an older load finishing late is ignored (changed route/identity)", async () => {
    const seen: LoadSnapshot[] = [];
    const r = createLoadRunner((s) => seen.push(s));
    const slow = deferred();
    let applied = "";
    const first = r.run(async (cur) => { await slow.promise; if (cur()) applied = "old"; });
    await r.run(async (cur) => { if (cur()) applied = "new"; });
    slow.resolve();
    await first;
    expect(applied).toBe("new");
    expect(seen.at(-1)).toEqual({ status: "ready", loaded: true });

    // A late failure from an old run doesn't flip the current state to error either.
    const slowFail = deferred();
    const p = r.run(async () => { await slowFail.promise; });
    await r.run(async () => {});
    slowFail.reject(new Error("late"));
    await p;
    expect(seen.at(-1)?.status).toBe("ready");
  });

  it("reset (new record) drops 'loaded' so the old record isn't shown as current", async () => {
    const seen: LoadSnapshot[] = [];
    const r = createLoadRunner((s) => seen.push(s));
    await r.run(async () => {});
    const p = r.run(async () => {}, { reset: true });
    expect(seen.at(-1)).toEqual({ status: "loading", loaded: false });
    await p;
  });
});
