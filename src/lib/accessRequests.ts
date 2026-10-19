import type { SupabaseClient } from "@supabase/supabase-js";

export type PendingRequest = {
  id: string;
  client_id: string;
  note: string | null;
  created_at: string;
  full_name: string | null;
};

/** Attach names to requests; missing names stay null (shown as "New client"). */
export function attachNames(
  reqs: Omit<PendingRequest, "full_name">[],
  profiles: { id: string; full_name: string | null }[],
): PendingRequest[] {
  const byId = new Map(profiles.map((p) => [p.id, p.full_name]));
  return reqs.map((r) => ({ ...r, full_name: byId.get(r.client_id) ?? null }));
}

/**
 * Pending access requests addressed to the signed-in trainer.
 * trainer_requests.client_id references auth.users (not profiles), so names are a
 * separate lookup allowed by the "Trainer views requesting client profiles" policy.
 * Throws on any query error so callers can tell "failed" apart from "none".
 */
export async function loadPendingRequests(supabase: SupabaseClient): Promise<PendingRequest[]> {
  const { data, error } = await supabase
    .from("trainer_requests")
    .select("id, client_id, note, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const reqs = data ?? [];
  if (reqs.length === 0) return [];
  const ids = [...new Set(reqs.map((r) => r.client_id))];
  const { data: profs, error: pErr } = await supabase.from("profiles").select("id, full_name").in("id", ids);
  if (pErr) throw pErr;
  return attachNames(reqs, profs ?? []);
}
