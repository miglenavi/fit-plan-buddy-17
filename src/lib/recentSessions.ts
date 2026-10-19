import type { SupabaseClient } from "@supabase/supabase-js";

export type RecentSession = {
  id: string;
  client_id: string;
  client_name: string | null;
  title: string;
  started_at: string;
  status: string;
  logged_by: string;
};

type Row = {
  id: string; client_id: string; started_at: string; status: string; logged_by: string;
  custom_name: string | null; trainings: { name: string } | null;
};

export function shapeRecent(rows: Row[], names: { id: string; full_name: string | null }[]): RecentSession[] {
  const byId = new Map(names.map((n) => [n.id, n.full_name]));
  return rows.map((s) => ({
    id: s.id,
    client_id: s.client_id,
    client_name: byId.get(s.client_id) ?? null,
    title: s.custom_name ?? s.trainings?.name ?? "Custom session",
    started_at: s.started_at,
    status: s.status,
    logged_by: s.logged_by,
  }));
}

/**
 * Newest sessions of the given trainer's own clients (archived included).
 * training_sessions.client_id references auth.users, not profiles, so names are a
 * separate lookup. Scoped by trainer_clients so super admins only see their own clients here.
 * Throws on any query error so the UI can tell "failed" apart from "none".
 */
export async function loadRecentSessions(supabase: SupabaseClient, trainerId: string, limit = 8): Promise<RecentSession[]> {
  const { data: links, error: lErr } = await supabase
    .from("trainer_clients").select("client_id").eq("trainer_id", trainerId);
  if (lErr) throw lErr;
  const ids = [...new Set((links ?? []).map((l) => l.client_id as string))];
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("training_sessions")
    .select("id, client_id, started_at, status, logged_by, custom_name, trainings(name)")
    .in("client_id", ids)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = (data ?? []) as unknown as Row[];
  if (rows.length === 0) return [];
  const { data: profs, error: pErr } = await supabase
    .from("profiles").select("id, full_name").in("id", [...new Set(rows.map((r) => r.client_id))]);
  if (pErr) throw pErr;
  return shapeRecent(rows, profs ?? []);
}
