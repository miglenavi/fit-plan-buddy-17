import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, cleanupUsers, createTestUser, linkTrainerClient, type TestUser } from "./helpers";

describe("dropsets", () => {
  let trainer: TestUser; let client: TestUser;
  beforeAll(async () => {
    trainer = await createTestUser("trainer-drop", "trainer");
    client = await createTestUser("client-drop", "client");
    await linkTrainerClient(trainer.id, client.id);
  }, 60_000);
  afterAll(async () => { await cleanupUsers([trainer.id, client.id]); }, 60_000);

  it("a set can be marked as dropset and back, other sets stay normal", async () => {
    const { data: ex } = await admin.from("exercises").select("id").is("trainer_id", null).limit(1).single();
    const s = await trainer.client.from("training_sessions").insert({ client_id: client.id, trainer_id: trainer.id, status: "in_progress", logged_by: "trainer", custom_name: "QA drop" }).select("id").single();
    expect(s.error).toBeNull();
    const se = await trainer.client.from("session_exercises").insert({ session_id: s.data!.id, exercise_id: ex!.id, order_index: 0, target_sets: 3 }).select("id").single();
    expect(se.error).toBeNull();
    const seId = se.data!.id;

    const ins = await trainer.client.from("set_logs").insert([
      { session_exercise_id: seId, set_index: 0, reps: 10, weight: 40, completed: true, is_dropset: false },
      { session_exercise_id: seId, set_index: 2, reps: 2, weight: 40, completed: true, is_dropset: true },
    ]).select("set_index, is_dropset");
    expect(ins.error).toBeNull();
    const rows = (ins.data ?? []).sort((a, b) => a.set_index - b.set_index);
    expect(rows[0].is_dropset).toBe(false);
    expect(rows[1].is_dropset).toBe(true);

    const back = await trainer.client.from("set_logs").upsert(
      { session_exercise_id: seId, set_index: 2, reps: 2, weight: 40, completed: true, is_dropset: false },
      { onConflict: "session_exercise_id,set_index" },
    ).select("is_dropset").single();
    expect(back.error).toBeNull();
    expect(back.data!.is_dropset).toBe(false);
  });
});
