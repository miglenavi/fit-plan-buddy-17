// Shared progress rules. For assisted exercises the logged load is ASSISTANCE,
// so less = harder = progress. Band exercises log a band level instead of kg.

export const BAND_LEVELS = [
  { level: 1, name: "Extra light", color: "yellow" },
  { level: 2, name: "Light", color: "red" },
  { level: 3, name: "Medium", color: "green" },
  { level: 4, name: "Heavy", color: "black" },
  { level: 5, name: "Extra heavy", color: "purple" },
] as const;

type ExLike = { is_assisted?: boolean | null; equipment?: string | null } | null | undefined;

export const isAssisted = (ex: ExLike) => !!ex?.is_assisted;
export const usesBand = (ex: ExLike) => ex?.equipment === "resistance_band";

/** +1 when a higher number is better, -1 when lower is better (assisted). */
export const betterDirection = (ex: ExLike): 1 | -1 => (isAssisted(ex) ? -1 : 1);

export const bandLabel = (level: number | null | undefined) => {
  const b = BAND_LEVELS.find((x) => x.level === Number(level));
  return b ? `${b.name} (${b.color})` : "";
};

export const weightLabel = (ex: ExLike) =>
  usesBand(ex) ? (isAssisted(ex) ? "Band (assistance)" : "Band") : isAssisted(ex) ? "Assistance (kg)" : "Weight (kg)";

/** Short column header for the logging grid. */
export const weightHeader = (ex: ExLike) => (usesBand(ex) ? "Band" : isAssisted(ex) ? "Assist kg" : "Weight");

/** Text like "@ 20kg", "@ 20kg assistance" or "@ Light (red) band". Empty when no load. */
export const formatLoad = (
  load: { weight?: number | string | null; band_level?: number | null },
  ex: ExLike,
) => {
  if (usesBand(ex)) {
    const l = bandLabel(load.band_level);
    return l ? ` @ ${l} band` : "";
  }
  if (load.weight == null || load.weight === "" || Number(load.weight) === 0) return "";
  return ` @ ${load.weight}kg${isAssisted(ex) ? " assistance" : ""}`;
};

/** Next-session hint when the client hit the top of the rep range. */
export const progressionHint = (
  lastSets: { weight?: number | string | null; band_level?: number | null }[],
  ex: ExLike,
): string | null => {
  if (usesBand(ex)) {
    const levels = lastSets.map((s) => Number(s.band_level)).filter((n) => n >= 1);
    if (!levels.length) return null;
    if (isAssisted(ex)) {
      const lightest = Math.min(...levels);
      return lightest > 1
        ? `You hit the top of the rep range last time — try the ${bandLabel(lightest - 1)} band today.`
        : `You hit the top of the rep range on the lightest band — try it without the band.`;
    }
    const heaviest = Math.max(...levels);
    return heaviest < 5 ? `You hit the top of the rep range last time — try the ${bandLabel(heaviest + 1)} band today.` : null;
  }
  const weights = lastSets.map((s) => Number(s.weight ?? 0)).filter((n) => n > 0);
  if (!weights.length) return null;
  if (isAssisted(ex)) {
    const minW = Math.min(...weights);
    const step = minW >= 20 ? 2.5 : minW >= 5 ? 2 : 1;
    const next = Math.max(0, minW - step);
    return next > 0
      ? `You hit the top of the rep range last time — try less assistance today (${next}kg).`
      : `You hit the top of the rep range last time — try it without assistance today.`;
  }
  const maxW = Math.max(...weights);
  const bump = maxW >= 60 ? 2.5 : maxW >= 20 ? 2 : 1;
  return `You hit the top of the rep range last time — try ${maxW + bump}kg today.`;
};

/** Working-set number for row `idx`: dropsets don't advance the counter. */
export function workingSetNumber(sets: { is_dropset?: boolean | null }[], idx: number): number {
  let n = 0;
  for (let i = 0; i <= idx && i < sets.length; i++) if (!sets[i]?.is_dropset) n++;
  return Math.max(n, 1);
}

/** Unassisted bodyweight exercises have no load to log, so the weight input is hidden. */
export const hidesLoad = (ex: ExLike) => ex?.equipment === "bodyweight" && !isAssisted(ex);

/**
 * Whether a set counts as completed when saved. Typing positive reps auto-completes,
 * unless the user explicitly set the checkbox (then their choice wins, incl. uncheck).
 */
export function resolveCompleted(s: { completed?: boolean | null; completedExplicit?: boolean; reps?: string | number | null }): boolean {
  if (s.completedExplicit) return !!s.completed;
  return !!s.completed || (s.reps != null && s.reps !== "" && Number(s.reps) > 0);
}
