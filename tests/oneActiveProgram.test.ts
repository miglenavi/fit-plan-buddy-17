import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, cleanupUsers, createTestUser, linkTrainerClient, type TestUser } from "./helpers";

const today = new Date().toISOString().slice(0, 10);
const dayOffset = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

let t: TestUser, other: TestUser, c: TestUser, c2: TestUser;
let planA: string, planB: string, planC: string, otherPlan: string, trainingA: string;
const ids: string[] = [];

const assign = (u: TestUser, client: string, plan: string, start = today, end?: string) =>
  u.client.rpc("assign_client_program", { _client_id: client, _plan_id: plan, _start_date: start, _end_date: end });
const rows = async (client: string) =>
  (await admin.from("client_programs").select("id, plan_id, status, end_date").eq("client_id", client).order("created_at")).data!;

beforeAll(async () => {
  [t, other, c, c2] = await Promise.all([
    createTestUser("oapT", "trainer"), createTestUser("oapOther", "trainer"),
    createTestUser("oapC", "client"), createTestUser("oapC2", "client"),
  ]);
  ids.push(t.id, other.id, c.id, c2.id);
  await linkTrainerClient(t.id, c.id);
  await linkTrainerClient(t.id, c2.id);
  const mk = async (owner: string, name: string) =>
    (await admin.from("plans").insert({ trainer_id: owner, name }).select("id").single()).data!.id as string;
  [planA, planB, planC, otherPlan] = await Promise.all([mk(t.id, "A"), mk(t.id, "B"), mk(t.id, "C"), mk(other.id, "X")]);
  trainingA = (await admin.from("trainings").insert({ plan_id: planA, name: "A1", order_index: 0 }).select("id").single()).data!.id;
}, 60_000);
afterAll(() => cleanupUsers(ids), 60_000);

describe("one active program per client", () => {
  it("first assignment becomes the single active program", async () => {
    const { error } = await assign(t, c.id, planA);
    expect(error).toBeNull();
    expect((await rows(c.id)).map((r) => [r.plan_id, r.status])).toEqual([[planA, "active"]]);
  });

  it("assigning the same active program again is a no-op (no duplicate row)", async () => {
    const before = await rows(c.id);
    const { data, error } = await assign(t, c.id, planA);
    expect(error).toBeNull();
    expect(data).toBe(before[0].id);
    expect(await rows(c.id)).toHaveLength(1);
  });

  it("replacing keeps history: old program completed today, new one active, sessions/sets intact", async () => {
    const { data: s } = await admin.from("training_sessions").insert({
      client_id: c.id, training_id: trainingA, status: "completed", completed_at: new Date().toISOString(), logged_by: "client",
    }).select("id").single();
    const { data: custom } = await admin.from("training_sessions").insert({
      client_id: c.id, training_id: null, custom_name: "Custom", status: "completed", completed_at: new Date().toISOString(), logged_by: "client",
    }).select("id").single();
    const ex = (await admin.from("exercises").select("id").is("trainer_id", null).limit(1)).data![0].id;
    const { data: se } = await admin.from("session_exercises").insert({ session_id: s!.id, exercise_id: ex, order_index: 0 }).select("id").single();
    await admin.from("set_logs").insert({ session_exercise_id: se!.id, set_index: 0, reps: 8, weight: 50, completed: true });

    expect((await assign(t, c.id, planB)).error).toBeNull();
    const r = await rows(c.id);
    expect(r.map((x) => [x.plan_id, x.status])).toEqual([[planA, "completed"], [planB, "active"]]);
    expect(r[0].end_date).toBe(today);

    const sessions = (await admin.from("training_sessions").select("id").in("id", [s!.id, custom!.id])).data!;
    expect(sessions).toHaveLength(2);
    expect((await admin.from("set_logs").select("reps").eq("session_exercise_id", se!.id)).data).toEqual([{ reps: 8 }]);
  });

  it("rejects a future start date and an end date before the start", async () => {
    const before = await rows(c.id);
    expect((await assign(t, c.id, planC, dayOffset(3))).error?.message).toMatch(/future/);
    expect((await assign(t, c.id, planC, today, dayOffset(-1))).error?.message).toMatch(/End date/);
    expect(await rows(c.id)).toEqual(before);
  });

  it("concurrent replacements leave exactly one active program", async () => {
    const res = await Promise.all([assign(t, c2.id, planA), assign(t, c2.id, planB), assign(t, c2.id, planC)]);
    expect(res.every((x) => x.error === null)).toBe(true);
    expect((await rows(c2.id)).filter((x) => x.status === "active")).toHaveLength(1);
  });

  it("the database refuses a second active row even outside the function", async () => {
    const { error } = await admin.from("client_programs").update({ status: "active" }).eq("client_id", c.id).eq("plan_id", planA);
    expect(error?.message).toMatch(/client_programs_one_active_per_client/);
    expect((await rows(c.id)).filter((x) => x.status === "active")).toHaveLength(1);
  });

  it("another trainer cannot assign to someone else's client or use someone else's plan", async () => {
    const before = await rows(c.id);
    expect((await assign(other, c.id, otherPlan)).error?.message).toMatch(/Not your client/);
    await linkTrainerClient(other.id, c2.id);
    expect((await assign(other, c2.id, planA)).error?.message).toMatch(/Not your plan/);
    expect((await assign(c, c.id, planA)).error?.message).toMatch(/Only trainers/);
    expect(await rows(c.id)).toEqual(before);
  });
});

describe("current-program lookup in the assign window", () => {
  it("a failed lookup throws instead of reporting 'no active program'", async () => {
    const { fetchCurrentAssignment } = await import("../src/lib/currentAssignment");
    const chain: any = { select: () => chain, eq: () => chain, limit: async () => ({ data: null, error: { message: "boom" } }) };
    await expect(fetchCurrentAssignment({ from: () => chain }, "x")).rejects.toThrow();
  });

  it("while loading, or with a result for a previously selected client, it's not ready", async () => {
    const { lookupFor } = await import("../src/lib/currentAssignment");
    expect(lookupFor(null, "c1").status).toBe("loading");
    expect(lookupFor({ clientId: "c0", status: "ready", current: null }, "c1").status).toBe("loading");
    expect(lookupFor({ clientId: "c1", status: "error" }, "c1").status).toBe("error");
    expect(lookupFor({ clientId: "c1", status: "ready", current: null }, "c1").status).toBe("ready");
  });
});

describe("client linked to two trainers", () => {
  let tA: TestUser, tB: TestUser, shared: TestUser, pA: string, pB: string;
  beforeAll(async () => {
    [tA, tB, shared] = await Promise.all([createTestUser("oap2A", "trainer"), createTestUser("oap2B", "trainer"), createTestUser("oap2C", "client")]);
    ids.push(tA.id, tB.id, shared.id);
    await linkTrainerClient(tA.id, shared.id);
    await linkTrainerClient(tB.id, shared.id);
    pA = (await admin.from("plans").insert({ trainer_id: tA.id, name: "PA" }).select("id").single()).data!.id;
    pB = (await admin.from("plans").insert({ trainer_id: tB.id, name: "PB" }).select("id").single()).data!.id;
  }, 60_000);

  it("second trainer can't end the first trainer's active program, and learns nothing about it", async () => {
    expect((await assign(tA, shared.id, pA)).error).toBeNull();
    const { error } = await assign(tB, shared.id, pB);
    expect(error?.message).toMatch(/another trainer/);
    expect(error?.message).not.toMatch(/PA/);
    expect((await rows(shared.id)).map((r) => [r.plan_id, r.status])).toEqual([[pA, "active"]]);
  });

  it("racing trainers: exactly one active program, never a foreign replacement", async () => {
    await admin.from("client_programs").update({ status: "completed" }).eq("client_id", shared.id);
    const res = await Promise.all([assign(tA, shared.id, pA), assign(tB, shared.id, pB)]);
    expect(res.filter((r) => r.error === null)).toHaveLength(1);
    const active = (await rows(shared.id)).filter((r) => r.status === "active");
    expect(active).toHaveLength(1);
    // The loser's call must not have completed the winner's row.
    expect(active[0].plan_id).toBe(res[0].error === null ? pA : pB);
  });
});
