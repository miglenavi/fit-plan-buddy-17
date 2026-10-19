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
