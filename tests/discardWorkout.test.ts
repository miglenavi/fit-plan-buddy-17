import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SetSaveQueue, type DraftStore } from "../src/lib/setSaveQueue";
import { admin, cleanupUsers, createTestUser, linkTrainerClient, type TestUser } from "./helpers";

const memDrafts = (): DraftStore & { v: any } => {
  const s: any = { v: {} };
  s.get = () => ({ ...s.v }); s.set = (x: any) => { s.v = x; };
  return s;
};

describe("save queue when a workout is discarded", () => {
  it("pending debounced saves never write after dispose, and drafts are cleared", async () => {
    const writes: string[] = [];
    const drafts = memDrafts();
    const q = new SetSaveQueue<{ k: string }>({ getRow: (k) => ({ k }), write: async (r) => { writes.push(r.k); return {}; }, drafts, debounceMs: 20 });
    q.edited("a"); q.schedule("a");
    await q.pause();
    q.dispose();
    q.edited("b"); q.schedule("b"); await q.save("b");
    await new Promise((r) => setTimeout(r, 60));
    expect(writes).toEqual([]);
    expect(drafts.v).toEqual({});
  });

  it("pause waits for an in-flight save before the delete runs", async () => {
    let finished = false;
    const q = new SetSaveQueue<{ k: string }>({ getRow: (k) => ({ k }), write: () => new Promise((r) => setTimeout(() => { finished = true; r({}); }, 30)) });
    q.edited("a"); void q.save("a");
    await new Promise((r) => setTimeout(r, 5)); // write is now in flight
    await q.pause();
    expect(finished).toBe(true);
  });

  it("if the delete fails, resume keeps and saves the pending edits", async () => {
    const writes: string[] = [];
    const q = new SetSaveQueue<{ k: string }>({ getRow: (k) => ({ k }), write: async (r) => { writes.push(r.k); return {}; }, debounceMs: 5 });
    q.edited("a"); q.schedule("a");
    await q.pause();
    expect(q.isDirty("a")).toBe(true);
    q.resume();
    await new Promise((r) => setTimeout(r, 30));
    expect(writes).toEqual(["a"]);
  });
});

describe("who can discard an unfinished workout", () => {
  let t: TestUser, t2: TestUser, c: TestUser, other: TestUser;
  let trainingId: string, planId: string;
  const ids: string[] = [];
  const start = async (by: TestUser, clientId: string, loggedBy: "client" | "trainer") => {
    const { data, error } = await admin.from("training_sessions").insert({
      client_id: clientId, training_id: trainingId, status: "in_progress", logged_by: loggedBy,
      trainer_id: loggedBy === "trainer" ? by.id : null,
    }).select("id").single();
    if (error) throw error;
    const ex = (await admin.from("exercises").select("id").is("trainer_id", null).limit(1)).data![0].id;
    const { data: se } = await admin.from("session_exercises").insert({ session_id: data!.id, exercise_id: ex, order_index: 0 }).select("id").single();
    await admin.from("set_logs").insert({ session_exercise_id: se!.id, set_index: 0, reps: 5, completed: true });
    return data!.id as string;
  };
  const exists = async (id: string) => !!(await admin.from("training_sessions").select("id").eq("id", id).maybeSingle()).data;
  const del = (u: TestUser, id: string) => u.client.from("training_sessions").delete({ count: "exact" }).eq("id", id);

  beforeAll(async () => {
    [t, t2, c, other] = await Promise.all([
      createTestUser("dwT", "trainer"), createTestUser("dwT2", "trainer"), createTestUser("dwC", "client"), createTestUser("dwOther", "client"),
    ]);
    ids.push(t.id, t2.id, c.id, other.id);
    await linkTrainerClient(t.id, c.id);
    planId = (await admin.from("plans").insert({ trainer_id: t.id, name: "DW" }).select("id").single()).data!.id;
    trainingId = (await admin.from("trainings").insert({ plan_id: planId, name: "DW1", order_index: 0 }).select("id").single()).data!.id;
  }, 60_000);
  afterAll(() => cleanupUsers(ids), 60_000);

  it("client discards own accidental workout; sets go, booking/plan/other history stay", async () => {
    const keep = (await admin.from("training_sessions").insert({ client_id: c.id, training_id: trainingId, status: "completed", completed_at: new Date().toISOString(), logged_by: "client" }).select("id").single()).data!.id;
    const id = await start(c, c.id, "client");
    const { data: b } = await admin.from("bookings").insert({
      trainer_id: t.id, client_id: c.id, start_at: new Date(Date.now() + 864e5).toISOString(), end_at: new Date(Date.now() + 864e5 + 36e5).toISOString(),
      status: "booked", training_session_id: id,
    }).select("id").single();

    const { error, count } = await del(c, id);
    expect(error).toBeNull();
    expect(count).toBe(1);
    expect(await exists(id)).toBe(false);
    expect((await admin.from("session_exercises").select("id").eq("session_id", id)).data).toEqual([]);
    const booking = (await admin.from("bookings").select("status, training_session_id").eq("id", b!.id).single()).data;
    expect(booking).toEqual({ status: "booked", training_session_id: null });
    expect(await exists(keep)).toBe(true);
    expect((await admin.from("trainings").select("id").eq("id", trainingId)).data).toHaveLength(1);
  });

  it("client cannot discard a workout their trainer started", async () => {
    const id = await start(t, c.id, "trainer");
    expect((await del(c, id)).count).toBe(0);
    expect(await exists(id)).toBe(true);
  });

  it("another client cannot discard someone else's workout", async () => {
    const id = await start(c, c.id, "client");
    expect((await del(other, id)).count ?? 0).toBe(0);
    expect(await exists(id)).toBe(true);
  });

  it("the client's trainer can discard; an unrelated trainer cannot", async () => {
    const id = await start(t, c.id, "trainer");
    expect((await del(t2, id)).count ?? 0).toBe(0);
    expect(await exists(id)).toBe(true);
    expect((await del(t, id)).count).toBe(1);
    expect(await exists(id)).toBe(false);
  });
});
