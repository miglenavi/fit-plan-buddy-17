import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 12; i++) out += chars[bytes[i] % chars.length];
  return out;
}

async function assertTrainer(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "trainer")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Only trainers can perform this action");
}

export const createClientWithTempPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      email: z.string().email().max(255),
      fullName: z.string().min(1).max(255),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertTrainer(supabase, userId);

    const tempPassword = generateTempPassword();

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName,
        invited_as: "client",
        invited_by: userId,
        must_change_password: true,
      },
    });
    if (error) throw new Error(error.message);
    const clientId = created.user?.id;
    if (!clientId) throw new Error("Failed to create user");

    const { error: insErr } = await supabaseAdmin
      .from("client_temp_passwords")
      .upsert({
        client_id: clientId,
        trainer_id: userId,
        temp_password: tempPassword,
      });
    if (insErr) throw new Error(insErr.message);

    return { clientId, email: data.email, tempPassword };
  });

export const resetClientTempPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ clientId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertTrainer(supabase, userId);

    // Verify trainer owns this client
    const { data: link, error: linkErr } = await supabase
      .from("trainer_clients")
      .select("client_id")
      .eq("trainer_id", userId)
      .eq("client_id", data.clientId)
      .maybeSingle();
    if (linkErr) throw new Error(linkErr.message);
    if (!link) throw new Error("Not your client");

    const tempPassword = generateTempPassword();

    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(
      data.clientId,
      {
        password: tempPassword,
        user_metadata: { must_change_password: true },
      },
    );
    if (updErr) throw new Error(updErr.message);

    const { error: upsertErr } = await supabaseAdmin
      .from("client_temp_passwords")
      .upsert({
        client_id: data.clientId,
        trainer_id: userId,
        temp_password: tempPassword,
      });
    if (upsertErr) throw new Error(upsertErr.message);

    return { tempPassword };
  });

export const clearMustChangePassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { must_change_password: false },
    });

    await supabaseAdmin
      .from("client_temp_passwords")
      .delete()
      .eq("client_id", userId);

    return { ok: true };
  });
