import { must } from "@/lib/loadState";

export type CurrentAssignment = { plan_id: string; name: string } | null;

/** The client's active program visible to this trainer. Throws on query failure — never returns a false "none". */
export async function fetchCurrentAssignment(db: any, clientId: string): Promise<CurrentAssignment> {
  const rows = must(
    await db.from("client_programs").select("plan_id, plans(name)")
      .eq("client_id", clientId).eq("status", "active").limit(1),
  ) as any[] | null;
  const r = rows?.[0];
  return r ? { plan_id: r.plan_id, name: r.plans?.name ?? "Current program" } : null;
}

export type LookupState =
  | { clientId: string; status: "loading" }
  | { clientId: string; status: "error" }
  | { clientId: string; status: "ready"; current: CurrentAssignment };

/** Only a successful lookup for the currently selected client allows submitting. */
export function lookupFor(state: LookupState | null, clientId: string): LookupState {
  return state && state.clientId === clientId ? state : { clientId, status: "loading" };
}
