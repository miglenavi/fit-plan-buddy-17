import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { defaultLoad, fetchLastTimeByExercise, latestPerformed, performedRegular, regularOrdinal, wasPerformed } from "../src/lib/lastLoads";
import { resolveCompleted } from "../src/lib/progress";
import { admin, cleanupUsers, createTestUser, linkTrainerClient, type TestUser } from "./helpers";

const set = (i: number, reps: number | null, weight: number | null, extra: any = {}) =>
  ({ set_index: i, reps, weight, completed: reps != null, band_level: null, is_dropset: false, ...extra });
const target10 = { weight: 10, band_level: null };

describe("default load rules", () => {
  it("screenshot case: plan 10 kg, last time 12@14,12@14,10@14 → today's sets start at 14", () => {
    const prev = performedRegular([set(0, 12, 14), set(1, 12, 14), set(2, 10, 14)]);
    expect(defaultLoad(prev, 0, target10, "kg").weight).toBe(14);
    expect(defaultLoad(prev, 1, target10, "kg").weight).toBe(14);
  });

  it("matches working-set number, ignores drop sets, extra sets repeat the last regular load", () => {
    const prev = performedRegular([set(0, 10, 20), set(1, 8, 22.5), set(2, 12, 12, { is_dropset: true }), set(3, 6, 25)]);
    expect([0, 1, 2, 3, 4].map((o) => defaultLoad(prev, o, target10, "kg").weight)).toEqual([20, 22.5, 25, 25, 25]);
  });

  it("no history → plan target", () => {
    expect(defaultLoad([], 0, target10, "kg").weight).toBe(10);
    expect(latestPerformed([])).toBeNull();
  });

  it("0 kg is a real previous value; a blank previous weight falls back to the plan target", () => {
    const prev = performedRegular([set(0, 10, 0), set(1, 10, null)]);
    expect(defaultLoad(prev, 0, target10, "kg").weight).toBe(0);
    expect(defaultLoad(prev, 1, target10, "kg").weight).toBe(10);
  });

  it("blank/unperformed leftovers aren't 'last time'", () => {
    const blank = { sets: [set(0, null, 30, { completed: false })] };
    const real = { sets: [set(0, 8, 14)] };
    expect(wasPerformed(blank.sets[0])).toBe(false);
    expect(latestPerformed([blank, real])).toBe(real);
  });

  it("bands carry the previous band level; assisted kg stays the same assistance; unassisted bodyweight untouched", () => {
    const prevBand = performedRegular([set(0, 10, null, { band_level: 3 })]);
    expect(defaultLoad(prevBand, 0, { weight: null, band_level: 2 }, "band")).toEqual({ weight: null, band_level: 3 });
    const prevAssist = performedRegular([set(0, 8, 30)]);
    expect(defaultLoad(prevAssist, 0, { weight: 40, band_level: null }, "kg").weight).toBe(30);
    expect(defaultLoad(prevAssist, 0, { weight: null, band_level: null }, "none")).toEqual({ weight: null, band_level: null });
  });

  it("drop sets today don't shift the working-set number", () => {
    expect(regularOrdinal([{ set_index: 0 }, { set_index: 1, is_dropset: true }, { set_index: 2 }], 3)).toBe(2);
  });

  it("a prefilled load alone never marks a set done", () => {
    expect(resolveCompleted({ completed: false, reps: null })).toBe(false);
  });
});

describe("latest result lookup (real database)", () => {
  let t: TestUser, c: TestUser, c2: TestUser;
  let exA: string, exB: string, exC: string, training: string;
  const ids: string[] = [];
  const sess = async (client: string, daysAgo: number, opts: { training?: string | null; status?: string } = {}) =>
    ( admin.from("training_sessions").insert({
      client_id: client, training_id: opts.training ?? null, custom_name: opts.training ? null : "Custom",
      status: opts.status ?? "completed", completed_at: opts.status === "in_progress" ? null : new Date(Date.now() - daysAgo * 864e5).toISOString(),
      started_at: new Date(Date.now() - daysAgo * 864e5 - 36e5).toISOString(), logged_by: "client",
    }).select("id").single().then((r) => { if (r.error) throw new Error(r.error.message); return r.data!.id as string; }));
  const log = async (sessionId: string, exId: string, sets: any[]) => {
    const se = (await admin.from("session_exercises").insert({ session_id: sessionId, exercise_id: exId, order_index: 0 }).select("id").single()).data!.id;
    if (sets.length) await admin.from("set_logs").insert(sets.map((s) => ({ session_exercise_id: se, ...s })));
  };

  beforeAll(async () => {
    [t, c, c2] = await Promise.all([createTestUser("llT", "trainer"), createTestUser("llC", "client"), createTestUser("llC2", "client")]);
    ids.push(t.id, c.id, c2.id);
    await linkTrainerClient(t.id, c.id);
    const exs = (await admin.from("exercises").select("id").is("trainer_id", null).limit(3)).data!;
    [exA, exB, exC] = [exs[0].id, exs[1].id, exs[2].id];
    const plan = (await admin.from("plans").insert({ trainer_id: t.id, name: "LL" }).select("id").single()).data!.id;
    training = (await admin.from("trainings").insert({ plan_id: plan, name: "LL1", order_index: 0 }).select("id").single()).data!.id;

    // 60 older sessions without exA (would push it out of the old 50-session window)…
    const old = await sess(c.id, 30, { training });
    await log(old, exA, [{ set_index: 0, reps: 10, weight: 8, completed: true }]);
    await log(old, exC, [{ set_index: 0, reps: 10, weight: 42, completed: true }]);
    const filler = Array.from({ length: 60 }, (_, i) => ({
      client_id: c.id, training_id: training, status: "completed", logged_by: "client",
      completed_at: new Date(Date.now() - (20 - i * 0.1) * 864e5).toISOString(),
    }));
    await admin.from("training_sessions").insert(filler);
    // …the newest exA result was a custom session; a newer blank leftover must be skipped.
    const custom = await sess(c.id, 2);
    await log(custom, exA, [{ set_index: 0, reps: 12, weight: 14, completed: true }, { set_index: 1, reps: 12, weight: 14, completed: true }]);
    const blank = await sess(c.id, 1, { training });
    await log(blank, exA, [{ set_index: 0, reps: null, weight: 50, completed: false }]);
    // Alternative exercise has its own history; unfinished sessions and other clients don't count.
    const alt = await sess(c.id, 3);
    await log(alt, exB, [{ set_index: 0, reps: 8, weight: 30, completed: true }]);
    const ip = await sess(c.id, 0, { status: "in_progress" });
    await log(ip, exB, [{ set_index: 0, reps: 8, weight: 99, completed: true }]);
    const other = await sess(c2.id, 0);
    await log(other, exA, [{ set_index: 0, reps: 8, weight: 77, completed: true }]);
  }, 120_000);
  afterAll(() => cleanupUsers(ids), 60_000);

  it("finds the true latest performed result per actual exercise, across custom and plan sessions", async () => {
    const r = await fetchLastTimeByExercise(c.client, c.id, [exA, exB], "00000000-0000-0000-0000-000000000000");
    expect(performedRegular(r[exA]!.sets).map((s) => Number(s.weight))).toEqual([14, 14]);
    expect(performedRegular(r[exB]!.sets).map((s) => Number(s.weight))).toEqual([30]);
  });

  it("an exercise last done before 60+ newer sessions is still found (no 50-session cutoff)", async () => {
    const r = await fetchLastTimeByExercise(c.client, c.id, [exC], "00000000-0000-0000-0000-000000000000");
    expect(Number(r[exC]!.sets[0].weight)).toBe(42);
  });

  it("the trainer sees the same latest result for their client", async () => {
    const r = await fetchLastTimeByExercise(t.client, c.id, [exA], "00000000-0000-0000-0000-000000000000");
    expect(Number(performedRegular(r[exA]!.sets)[0].weight)).toBe(14);
  });
});
