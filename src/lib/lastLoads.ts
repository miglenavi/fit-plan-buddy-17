// Starting loads for today's sets come from the client's latest real performance
// of the same (actually performed) exercise. Pure helpers so the rules are testable.

export type HistSet = {
  set_index: number;
  reps: number | string | null;
  weight: number | string | null;
  completed: boolean | null;
  band_level?: number | null;
  is_dropset?: boolean | null;
};

/** A set the client actually did: ticked, or has reps logged. Blank leftovers don't count. */
export const wasPerformed = (s: HistSet) => !!s.completed || (s.reps != null && s.reps !== "" && Number(s.reps) > 0);

/** Performed regular (non-drop) sets in order — the source for default loads. */
export function performedRegular(sets: HistSet[]): HistSet[] {
  return sets.filter((s) => !s.is_dropset && wasPerformed(s)).sort((a, b) => a.set_index - b.set_index);
}

export type LoadKind = "kg" | "band" | "none";

/**
 * Default load for the Nth regular working set today (0-based).
 * Uses the same ordinal from last time; extra sets repeat the last regular set's load.
 * A missing/blank value there falls back to the plan target. 0 is a real value.
 */
export function defaultLoad(
  prevRegular: HistSet[],
  ordinal: number,
  target: { weight: number | null; band_level: number | null },
  kind: LoadKind,
): { weight: number | null; band_level: number | null } {
  if (kind === "none") return { weight: target.weight, band_level: target.band_level };
  const src = prevRegular.length ? prevRegular[Math.min(ordinal, prevRegular.length - 1)] : null;
  if (kind === "band") {
    const b = src?.band_level;
    return { weight: target.weight, band_level: b == null ? target.band_level : Number(b) };
  }
  const w = src?.weight;
  const has = w != null && w !== "" && Number.isFinite(Number(w));
  return { weight: has ? Number(w) : target.weight, band_level: target.band_level };
}

/** 0-based ordinal of a set among the regular (non-drop) sets of this exercise today. */
export function regularOrdinal(sets: { set_index: number; is_dropset?: boolean | null }[], setIndex: number): number {
  return sets.filter((s) => !s.is_dropset && s.set_index < setIndex).length;
}

/** Newest-first candidates → the latest one that has at least one performed set. */
export function latestPerformed<T extends { sets: HistSet[] }>(newestFirst: T[]): T | null {
  return newestFirst.find((c) => c.sets.some(wasPerformed)) ?? null;
}

export type LastTime = { date: string; sets: HistSet[] };

/**
 * Latest completed performance per exercise for one client, excluding the current session.
 * Per exercise it reads only the newest few completed sessions that contain it (bounded),
 * so a long history never hides the true latest result.
 */
export async function fetchLastTimeByExercise(
  db: any, clientId: string, exerciseIds: string[], excludeSessionId: string, window = 10,
): Promise<Record<string, LastTime | null>> {
  const out: Record<string, LastTime | null> = {};
  await Promise.all(exerciseIds.map(async (exId) => {
    const { data, error } = await db
      .from("session_exercises")
      .select("set_logs(set_index, reps, weight, rpe, completed, band_level, is_dropset), training_sessions!inner(completed_at, client_id, status)")
      .eq("exercise_id", exId)
      .eq("training_sessions.client_id", clientId)
      .eq("training_sessions.status", "completed")
      .neq("session_id", excludeSessionId)
      .order("training_sessions(completed_at)", { ascending: false })
      .limit(window);
    if (error) throw error;
    out[exId] = latestPerformed((data ?? []).map((r: any) => ({
      date: r.training_sessions?.completed_at ?? "",
      sets: (r.set_logs ?? []).map((l: any) => ({ ...l, is_dropset: !!l.is_dropset })).sort((x: HistSet, y: HistSet) => x.set_index - y.set_index),
    })));
  }));
  return out;
}
