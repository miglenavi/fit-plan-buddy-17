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
    // The trigger completes the other row instead of creating two actives.
    expect(error).toBeNull();
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
