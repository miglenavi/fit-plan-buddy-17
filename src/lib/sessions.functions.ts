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

    // If an in-progress session already exists for this client+training, resume it.
    const { data: existing } = await supabase
      .from("training_sessions")
      .select("id")
      .eq("client_id", clientId)
      .eq("training_id", data.trainingId)
      .eq("status", "in_progress")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing?.id) return { sessionId: existing.id };

    // Load template exercises
    const { data: tplExs, error: tplErr } = await supabase
      .from("training_exercises")
      .select("id, exercise_id, alternative_exercise_id, order_index, target_sets, target_reps_min, target_reps_max, target_weight, coach_notes, alt_target_sets, alt_target_reps_min, alt_target_reps_max, alt_target_weight")
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
        alt_target_sets: t.alt_target_sets,
        alt_target_reps_min: t.alt_target_reps_min,
        alt_target_reps_max: t.alt_target_reps_max,
        alt_target_weight: t.alt_target_weight,
        notes: t.coach_notes,
      }));
      const { error: seErr } = await supabase.from("session_exercises").insert(seRows);
      if (seErr) throw new Error(seErr.message);
    }

    // Additive: if this session falls inside a booking today for this client
    // (and trainer, when a trainer is logging), link them. Never blocks starting.
    try {
      const now = new Date();
      const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999);
      let q = supabase
        .from("bookings")
        .select("id, start_at, end_at, training_id, training_session_id")
        .eq("client_id", clientId)
        .eq("status", "booked")
        .is("training_session_id", null)
        .gte("start_at", dayStart.toISOString())
        .lte("start_at", dayEnd.toISOString())
        .order("start_at");
      if (trainerId) q = q.eq("trainer_id", trainerId);
      const { data: candidates } = await q;
      // Match a booking whose window contains "now", allowing a 60-minute
      // grace before the start (starting a bit early) and after the end.
      const ts = now.getTime();
      const GRACE = 60 * 60 * 1000;
      const match = candidates?.find(
        (b: any) =>
          new Date(b.start_at).getTime() - GRACE <= ts &&
          new Date(b.end_at).getTime() + GRACE >= ts,
      );

      if (match) {
        await supabase
          .from("bookings")
          .update({
            training_session_id: session.id,
            ...(match.training_id ? {} : { training_id: data.trainingId }),
          })
          .eq("id", match.id);
      }
    } catch {
      // linking is best-effort only
    }

    return { sessionId: session.id };
  });

