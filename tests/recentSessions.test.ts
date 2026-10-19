import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { loadRecentSessions, shapeRecent } from "../src/lib/recentSessions";
import { admin, cleanupUsers, createTestUser, linkTrainerClient, type TestUser } from "./helpers";

describe("trainer dashboard recent sessions", () => {
  let trainer: TestUser, other: TestUser, empty: TestUser, a: TestUser, b: TestUser;
  const ids: string[] = [];
  const at = (minsAgo: number) => new Date(Date.now() - minsAgo * 60_000).toISOString();

  beforeAll(async () => {
    trainer = await createTestUser("rsTrainer", "trainer");
    other = await createTestUser("rsOther", "trainer");
    empty = await createTestUser("rsEmpty", "trainer");
    a = await createTestUser("rsAnna", "client");
    b = await createTestUser("rsBen", "client");
    ids.push(trainer.id, other.id, empty.id, a.id, b.id);
    await linkTrainerClient(trainer.id, a.id);
    await linkTrainerClient(other.id, b.id);
    const { data: plan } = await admin.from("plans").insert({ trainer_id: trainer.id, name: "P" }).select().single();
    const { data: tr } = await admin.from("trainings").insert({ plan_id: plan!.id, name: "Day A", order_index: 0 }).select().single();
    const { error } = await admin.from("training_sessions").insert([
      { client_id: a.id, training_id: tr!.id, started_at: at(120), status: "completed", completed_at: at(60), logged_by: "client" },
      { client_id: a.id, trainer_id: trainer.id, custom_name: "Knee rehab", started_at: at(10), status: "in_progress", logged_by: "trainer" },
      { client_id: b.id, custom_name: "Foreign", started_at: at(5), status: "in_progress", logged_by: "client" },
    ]);
    expect(error).toBeNull();
  });
  afterAll(async () => { await cleanupUsers(ids); });

  it("old embedded profiles join is rejected (why the list was empty)", async () => {
    const r = await trainer.client.from("training_sessions")
      .select("id, profiles!training_sessions_client_id_fkey(full_name)").limit(1);
    expect(r.error).not.toBeNull();
  });

  it("lists own clients' sessions newest first with names and titles", async () => {
    const list = await loadRecentSessions(trainer.client, trainer.id);
    expect(list.map((s) => s.title)).toEqual(["Knee rehab", "Day A"]);
    expect(list.every((s) => s.client_name === "QA rsAnna" && s.client_id === a.id)).toBe(true);
    expect(list[0]).toMatchObject({ status: "in_progress", logged_by: "trainer" });
  });

  it("another trainer's client sessions never appear", async () => {
    const list = await loadRecentSessions(other.client, other.id);
    expect(list.map((s) => s.title)).toEqual(["Foreign"]);
  });

  it("a trainer with no clients gets an empty list, not an error", async () => {
    await expect(loadRecentSessions(empty.client, empty.id)).resolves.toEqual([]);
  });

  it("a failed query throws instead of looking empty", async () => {
    const broken = createClient("http://127.0.0.1:1", "x", { auth: { persistSession: false } });
    await expect(loadRecentSessions(broken, trainer.id)).rejects.toBeTruthy();
  });

  it("missing training name falls back to Custom session", () => {
    const [s] = shapeRecent([{ id: "s", client_id: "c", started_at: "", status: "completed", logged_by: "client", custom_name: null, trainings: null }], []);
    expect(s.title).toBe("Custom session");
    expect(s.client_name).toBeNull();
  });
});
