import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL!;
const ANON = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const admin = createClient(URL, SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type TestUser = { id: string; email: string; client: SupabaseClient };

const PASSWORD = "valhalla-test-pw-2026!";

/** Creates a confirmed auth user and returns a signed-in anon-key client (RLS applies as that user). */
export async function createTestUser(
  label: string,
  role: "trainer" | "client",
): Promise<TestUser> {
  const email = `qa+${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@valhallafit.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    // role: 'trainer' makes handle_new_user create a pending application instead of a role,
    // so we grant the trainer role explicitly below (mirrors super-admin approval).
    user_metadata: { full_name: `QA ${label}`, role },
  });
  if (error) throw error;
  const id = data.user!.id;

  if (role === "trainer") {
    const { error: rErr } = await admin.from("user_roles").insert({ user_id: id, role: "trainer" });
    if (rErr && !rErr.message.includes("duplicate")) throw rErr;
  }

  const client = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error: sErr } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (sErr) throw sErr;

  return { id, email, client };
}

/** Creates a confirmed auth user WITHOUT granting any role (exercises the real signup path). */
export async function createRawUser(label: string, metadata: Record<string, unknown> = {}) {
  const email = `qa+${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@valhallafit.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: `QA ${label}`, ...metadata },
  });
  if (error) throw error;
  return { id: data.user!.id, email };
}

/** Signs in an existing test account and returns an anon-key client (RLS applies as that user). */
export async function signInAs(email: string): Promise<SupabaseClient> {
  const client = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  return client;
}

export async function linkTrainerClient(trainerId: string, clientId: string) {
  const { error } = await admin
    .from("trainer_clients")
    .insert({ trainer_id: trainerId, client_id: clientId });
  if (error) throw error;
}

/** Removes every row the test suite created, then the auth users themselves. */
export async function cleanupUsers(ids: string[]) {
  for (const id of ids) {
    await admin.from("bookings").delete().or(`trainer_id.eq.${id},client_id.eq.${id}`);
    await admin.from("booking_series").delete().or(`trainer_id.eq.${id},client_id.eq.${id}`);
    await admin.from("trainer_availability").delete().eq("trainer_id", id);
    await admin.from("training_sessions").delete().eq("client_id", id);
    await admin.from("client_programs").delete().or(`trainer_id.eq.${id},client_id.eq.${id}`);
    await admin.from("plans").delete().eq("trainer_id", id);
    await admin.from("exercises").delete().eq("trainer_id", id);
    await admin.from("client_notes").delete().or(`trainer_id.eq.${id},client_id.eq.${id}`);
    await admin.from("client_invites").delete().or(`trainer_id.eq.${id},accepted_by.eq.${id}`);
    await admin.from("trainer_requests").delete().or(`trainer_id.eq.${id},client_id.eq.${id}`);
    await admin.from("trainer_clients").delete().or(`trainer_id.eq.${id},client_id.eq.${id}`);
    await admin.from("trainer_applications").delete().eq("user_id", id);
    await admin.from("user_roles").delete().eq("user_id", id);
    await admin.auth.admin.deleteUser(id);
  }
}

export const iso = (d: Date) => d.toISOString();
export function nextWeekdayAt(dow: number, hour: number, weeksAhead = 1): Date {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  while (d.getDay() !== dow || d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
  d.setDate(d.getDate() + 7 * (weeksAhead - 1));
  return d;
}
