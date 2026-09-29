import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, cleanupUsers, createTestUser, linkTrainerClient, type TestUser } from "./helpers";

/**
 * Duplicate-exercise merge safety: re-pointing every reference (training_exercises
 * and session_exercises, both exercise_id and alternative_exercise_id) before
 * deleting a duplicate must preserve all set logs — history follows the kept
 * exercise id. Also covers the new Lats muscle group and equipment field.
 */
describe("duplicate exercise merge preserves history", () => {
  let trainer: TestUser;
  let client: TestUser;
  let planId: string;
  let trainingId: string;
  let sessionId: string;
  let seId: string;
  let dupId: string;
  let keptId: string;

  beforeAll(async () => {
    trainer = await createTestUser("trainer-merge", "trainer");
    client = await createTestUser("client-merge", "client");
    await linkTrainerClient(trainer.id, client.id);
  }, 60_000);

  afterAll(async () => {
    await cleanupUsers([trainer.id, client.id]);
  }, 60_000);

  it("sets up duplicate + kept exercises, a workout day and a logged session on the duplicate", async () => {
    const ins = async (name: string) => {
      const r = await trainer.client
        .from("exercises")
        .insert({
          trainer_id: trainer.id,
          name,
          muscle_groups: ["chest"],
          primary_muscle_group: "chest",
          secondary_muscle_groups: ["triceps"],
          equipment: "barbell",
        })
        .select("id")
        .single();
      expect(r.error).toBeNull();
      return r.data!.id;
    };
    dupId = await ins("QA Merge Dup");
    keptId = await ins("QA Merge Kept");

    const plan = await trainer.client
      .from("plans")
      .insert({ trainer_id: trainer.id, name: "QA Merge Plan", status: "active" })
      .select("id")
      .single();
    expect(plan.error).toBeNull();
    planId = plan.data!.id;

    const training = await trainer.client
      .from("trainings")
      .insert({ plan_id: planId, name: "Merge Day", order_index: 0 })
      .select("id")
      .single();
    expect(training.error).toBeNull();
    trainingId = training.data!.id;

    const te = await trainer.client
      .from("training_exercises")
      .insert({
        training_id: trainingId,
        exercise_id: dupId,
        order_index: 0,
        target_sets: 3,
        target_reps_min: 8,
        target_reps_max: 10,
      })
      .select("id")
      .single();
    expect(te.error).toBeNull();

    const assign = await trainer.client
      .from("client_programs")
      .insert({
        trainer_id: trainer.id,
        client_id: client.id,
        plan_id: planId,
        start_date: new Date().toISOString().slice(0, 10),
        status: "active",
      })
      .select("id")
      .single();
    expect(assign.error).toBeNull();

    const session = await client.client
      .from("training_sessions")
      .insert({
        training_id: trainingId,
        client_id: client.id,
        status: "in_progress",
        logged_by: "client",
      })
      .select("id")
      .single();
    expect(session.error).toBeNull();
    sessionId = session.data!.id;

    const se = await client.client
      .from("session_exercises")
      .insert({
        session_id: sessionId,
        exercise_id: dupId,
        order_index: 0,
        target_sets: 3,
        target_reps_min: 8,
        target_reps_max: 10,
      })
      .select("id")
      .single();
    expect(se.error).toBeNull();
    seId = se.data!.id;

    const logs = await client.client.from("set_logs").insert([
      { session_exercise_id: seId, set_index: 0, reps: 10, weight: 40, completed: true },
      { session_exercise_id: seId, set_index: 1, reps: 8, weight: 42.5, completed: true },
    ]);
    expect(logs.error).toBeNull();
  });

  it("merging re-points every reference and keeps all set logs", async () => {
    // Re-point all four reference kinds, same order as the production merge.
    const up1 = await trainer.client.from("training_exercises").update({ exercise_id: keptId }).eq("exercise_id", dupId);
    expect(up1.error).toBeNull();
    const up2 = await trainer.client.from("training_exercises").update({ alternative_exercise_id: keptId }).eq("alternative_exercise_id", dupId);
    expect(up2.error).toBeNull();
    const up3 = await trainer.client.from("session_exercises").update({ exercise_id: keptId }).eq("exercise_id", dupId);
    expect(up3.error).toBeNull();
    const up4 = await trainer.client.from("session_exercises").update({ alternative_exercise_id: keptId }).eq("alternative_exercise_id", dupId);
    expect(up4.error).toBeNull();

    // Zero references remain on the duplicate before deletion.
    const sessRefs = await admin
      .from("session_exercises")
      .select("id", { count: "exact" })
      .or(`exercise_id.eq.${dupId},alternative_exercise_id.eq.${dupId}`);
    expect(sessRefs.error).toBeNull();
    expect(sessRefs.count).toBe(0);
    const teRefs = await admin
      .from("training_exercises")
      .select("id", { count: "exact" })
      .or(`exercise_id.eq.${dupId},alternative_exercise_id.eq.${dupId}`);
    expect(teRefs.error).toBeNull();
    expect(teRefs.count).toBe(0);

    const del = await trainer.client.from("exercises").delete().eq("id", dupId);
    expect(del.error).toBeNull();

    // The session row now points at the kept exercise...
    const se = await admin.from("session_exercises").select("id, exercise_id").eq("id", seId).single();
    expect(se.error).toBeNull();
    expect(se.data!.exercise_id).toBe(keptId);

    // ...and every logged set survived.
    const logs = await admin
      .from("set_logs")
      .select("set_index, reps, weight")
      .eq("session_exercise_id", seId)
      .order("set_index");
    expect(logs.error).toBeNull();
    expect(logs.data).toEqual([
      { set_index: 0, reps: 10, weight: 40 },
      { set_index: 1, reps: 8, weight: 42.5 },
    ]);

    const te = await admin.from("training_exercises").select("id, exercise_id").eq("training_id", trainingId).single();
    expect(te.error).toBeNull();
    expect(te.data!.exercise_id).toBe(keptId);

    // The new Lats group and equipment enum are usable end-to-end.
    const lats = await trainer.client
      .from("exercises")
      .insert({
        trainer_id: trainer.id,
        name: "QA Lats Move",
        muscle_groups: ["lats"],
        primary_muscle_group: "lats",
        secondary_muscle_groups: ["biceps"],
        equipment: "cable",
      })
      .select("id, primary_muscle_group, equipment")
      .single();
    expect(lats.error).toBeNull();
    expect(lats.data!.primary_muscle_group).toBe("lats");
    expect(lats.data!.equipment).toBe("cable");
  });
});
