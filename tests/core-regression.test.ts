import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, cleanupUsers, createTestUser, linkTrainerClient, type TestUser } from "./helpers";

/**
 * Regression guards for the pre-scheduling core workflow:
 * trainer builds a plan, assigns it to a client, client logs a session.
 */
describe("core trainer/client workflow", () => {
  let trainer: TestUser;
  let client: TestUser;
  let planId: string;
  let trainingId: string;
  let exerciseId: string;

  beforeAll(async () => {
    trainer = await createTestUser("trainer-core", "trainer");
    client = await createTestUser("client-core", "client");
    await linkTrainerClient(trainer.id, client.id);
  }, 60_000);

  afterAll(async () => {
    await cleanupUsers([trainer.id, client.id]);
  }, 60_000);

  it("trainer can create an exercise, plan and training day", async () => {
    const ex = await trainer.client
      .from("exercises")
      .insert({
        trainer_id: trainer.id,
        name: "QA Squat",
        muscle_groups: ["quads"],
        primary_muscle_group: "quads",
        secondary_muscle_groups: ["glutes"],
      })
      .select("id")
      .single();
    expect(ex.error).toBeNull();
    exerciseId = ex.data!.id;

    const plan = await trainer.client
      .from("plans")
      .insert({ trainer_id: trainer.id, name: "QA Plan", status: "active" })
      .select("id")
      .single();
    expect(plan.error).toBeNull();
    planId = plan.data!.id;

    const training = await trainer.client
      .from("trainings")
      .insert({ plan_id: planId, name: "Day 1", order_index: 0 })
      .select("id")
      .single();
    expect(training.error).toBeNull();
    trainingId = training.data!.id;

    const te = await trainer.client.from("training_exercises").insert({
      training_id: trainingId,
      exercise_id: exerciseId,
      order_index: 0,
      target_sets: 3,
      target_reps_min: 8,
      target_reps_max: 10,
      target_weight: 60,
    });
    expect(te.error).toBeNull();
  });

  it("trainer can assign the plan to their client, and the client can see it", async () => {
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

    const seen = await client.client.from("plans").select("id, name").eq("id", planId);
    expect(seen.error).toBeNull();
    expect(seen.data).toHaveLength(1);

    const days = await client.client.from("trainings").select("id").eq("plan_id", planId);
    expect(days.data).toHaveLength(1);
  });

  it("trainer cannot assign a plan to someone who is not their client", async () => {
    const stranger = await createTestUser("stranger-core", "client");
    const res = await trainer.client.from("client_programs").insert({
      trainer_id: trainer.id,
      client_id: stranger.id,
      plan_id: planId,
      start_date: new Date().toISOString().slice(0, 10),
      status: "active",
    });
    expect(res.error).not.toBeNull();
    await cleanupUsers([stranger.id]);
  }, 60_000);

  it("client can log a session with sets/reps/weight against targets", async () => {
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
    const sessionId = session.data!.id;

    const se = await client.client
      .from("session_exercises")
      .insert({
        session_id: sessionId,
        exercise_id: exerciseId,
        order_index: 0,
        target_sets: 3,
        target_reps_min: 8,
        target_reps_max: 10,
        target_weight: 60,
      })
      .select("id")
      .single();
    expect(se.error).toBeNull();

    const logs = await client.client.from("set_logs").insert([
      { session_exercise_id: se.data!.id, set_index: 0, reps: 10, weight: 60, completed: true },
      { session_exercise_id: se.data!.id, set_index: 1, reps: 9, weight: 62.5, completed: true },
    ]);
    expect(logs.error).toBeNull();

    const finish = await client.client
      .from("training_sessions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", sessionId);
    expect(finish.error).toBeNull();

    const check = await admin
      .from("set_logs")
      .select("set_index, reps, weight")
      .eq("session_exercise_id", se.data!.id)
      .order("set_index");
    expect(check.data).toEqual([
      { set_index: 0, reps: 10, weight: 60 },
      { set_index: 1, reps: 9, weight: 62.5 },
    ]);
  });

  it("trainer can run an improvised session with no plan day, and its sets stay in the client's exercise history", async () => {
    // Improvised session: no training_id, just a name.
    const session = await trainer.client
      .from("training_sessions")
      .insert({
        training_id: null,
        custom_name: "Injury rehab / deload",
        client_id: client.id,
        trainer_id: trainer.id,
        status: "in_progress",
        logged_by: "trainer",
      })
      .select("id, custom_name, training_id")
      .single();
    expect(session.error).toBeNull();
    expect(session.data!.training_id).toBeNull();
    expect(session.data!.custom_name).toBe("Injury rehab / deload");
    const sessionId = session.data!.id;

    // Exercise added mid-session from the library.
    const se = await trainer.client
      .from("session_exercises")
      .insert({ session_id: sessionId, exercise_id: exerciseId, order_index: 0, target_sets: 2 })
      .select("id")
      .single();
    expect(se.error).toBeNull();

    const logs = await trainer.client.from("set_logs").insert([
      { session_exercise_id: se.data!.id, set_index: 0, reps: 12, weight: 70, completed: true },
      { session_exercise_id: se.data!.id, set_index: 1, reps: 10, weight: 72.5, completed: true },
    ]);
    expect(logs.error).toBeNull();

    const finish = await trainer.client
      .from("training_sessions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", sessionId);
    expect(finish.error).toBeNull();

    // Progress lookup is exercise-first: a later plan workout must find these
    // numbers even though they were logged outside any plan day.
    const prevSessions = await trainer.client
      .from("training_sessions")
      .select("id, completed_at")
      .eq("client_id", client.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(50);
    expect(prevSessions.error).toBeNull();
    const sessIds = (prevSessions.data ?? []).map((s) => s.id);
    expect(sessIds).toContain(sessionId);

    const history = await trainer.client
      .from("session_exercises")
      .select("session_id, exercise_id, set_logs(set_index, reps, weight)")
      .in("session_id", sessIds)
      .eq("exercise_id", exerciseId);
    expect(history.error).toBeNull();
    const fromCustom = (history.data ?? []).find((h: any) => h.session_id === sessionId);
    expect(fromCustom).toBeTruthy();
    expect(
      (fromCustom!.set_logs as any[]).sort((a, b) => a.set_index - b.set_index).map((l) => ({ reps: l.reps, weight: l.weight })),
    ).toEqual([
      { reps: 12, weight: 70 },
      { reps: 10, weight: 72.5 },
    ]);

    // And the plan-based session logged earlier is still in the same history.
    expect((history.data ?? []).length).toBeGreaterThan(1);
  });

  it("a client cannot read another client's sessions", async () => {
    const other = await createTestUser("other-core", "client");
    const res = await other.client.from("training_sessions").select("id").eq("client_id", client.id);
    expect(res.error).toBeNull();
    expect(res.data).toHaveLength(0);
    await cleanupUsers([other.id]);
  }, 60_000);
});

