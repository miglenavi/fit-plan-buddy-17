import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Start a new training session. If called by a trainer, clientId must be
 * one of their clients (enforced via RLS + is_trainer_of).
 * Snapshots the current training_exercises into session_exercises.
 */
export const startSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      trainingId: z.string().uuid(),
      clientId: z.string().uuid().optional(), // omit = self (client logging own)
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Decide who is being logged
    const clientId = data.clientId ?? userId;
    const loggedBy: "client" | "trainer" = clientId === userId ? "client" : "trainer";
    const trainerId = loggedBy === "trainer" ? userId : null;

    // Load template exercises
    const { data: tplExs, error: tplErr } = await supabase
      .from("training_exercises")
      .select("id, exercise_id, alternative_exercise_id, order_index, target_sets, target_reps_min, target_reps_max, target_weight, coach_notes")
      .eq("training_id", data.trainingId)
      .order("order_index");
    if (tplErr) throw new Error(tplErr.message);

    // Create session
    const { data: session, error: sErr } = await supabase
      .from("training_sessions")
      .insert({
        training_id: data.trainingId,
        client_id: clientId,
        trainer_id: trainerId,
        logged_by: loggedBy,
        status: "in_progress",
      })
      .select("id")
      .single();
    if (sErr || !session) throw new Error(sErr?.message ?? "Failed to create session");

    if (tplExs && tplExs.length > 0) {
      const seRows = tplExs.map((t: any) => ({
        session_id: session.id,
        training_exercise_id: t.id,
        exercise_id: t.exercise_id,
        alternative_exercise_id: t.alternative_exercise_id,
        order_index: t.order_index,
        target_sets: t.target_sets,
        target_reps_min: t.target_reps_min,
        target_reps_max: t.target_reps_max,
        target_weight: t.target_weight,
        notes: t.coach_notes,
      }));
      const { error: seErr } = await supabase.from("session_exercises").insert(seRows);
      if (seErr) throw new Error(seErr.message);
    }

    return { sessionId: session.id };
  });
