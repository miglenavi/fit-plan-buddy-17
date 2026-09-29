import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, cleanupUsers, createTestUser, linkTrainerClient, type TestUser } from "./helpers";

describe("band levels on assisted band exercises", () => {
  let trainer: TestUser; let client: TestUser;
  beforeAll(async () => {
    trainer = await createTestUser("trainer-band", "trainer");
    client = await createTestUser("client-band", "client");
    await linkTrainerClient(trainer.id, client.id);
  }, 60_000);
  afterAll(async () => { await cleanupUsers([trainer.id, client.id]); }, 60_000);

  it("persists band_level and swaps band targets with the alternative", async () => {
    const { data: exs } = await admin.from("exercises").select("id, name, is_assisted")
      .in("name", ["Band Assisted Pull-Up", "Machine Assisted Pull-Up"]).is("trainer_id", null);
    const band = exs!.find((e) => e.name === "Band Assisted Pull-Up")!;
    const machine = exs!.find((e) => e.name === "Machine Assisted Pull-Up")!;
    expect(band.is_assisted).toBe(true);
    expect(machine.is_assisted).toBe(true);

    const s = await client.client.from("training_sessions").insert({ client_id: client.id, status: "in_progress", logged_by: "client", custom_name: "QA band" }).select("id").single();
    expect(s.error).toBeNull();
    const se = await client.client.from("session_exercises").insert({
      session_id: s.data!.id, exercise_id: machine.id, alternative_exercise_id: band.id, order_index: 0,
      target_sets: 2, target_weight: 20, alt_target_band_level: 3,
    }).select("id").single();
    expect(se.error).toBeNull();

    const sw = await client.client.rpc("choose_session_exercise", { _se_id: se.data!.id, _use_alternative: true });
    expect(sw.error).toBeNull();
    const after = await client.client.from("session_exercises").select("exercise_id, target_band_level, alt_target_weight").eq("id", se.data!.id).single();
    expect(after.data!.exercise_id).toBe(band.id);
    expect(after.data!.target_band_level).toBe(3);
    expect(Number(after.data!.alt_target_weight)).toBe(20);

    const log = await client.client.from("set_logs").insert({ session_exercise_id: se.data!.id, set_index: 0, reps: 8, band_level: 2, completed: true }).select("band_level").single();
    expect(log.error).toBeNull();
    expect(log.data!.band_level).toBe(2);
    const bad = await client.client.from("set_logs").insert({ session_exercise_id: se.data!.id, set_index: 1, band_level: 9 });
    expect(bad.error).not.toBeNull();
  });
});
