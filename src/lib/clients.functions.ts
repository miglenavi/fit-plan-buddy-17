import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

export const inviteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      email: z.string().email().max(255),
      fullName: z.string().min(1).max(255),
      redirectTo: z.string().url().max(500),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertTrainer(supabase, userId);

    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      {
        redirectTo: data.redirectTo,
        data: {
          full_name: data.fullName,
          invited_as: "client",
          invited_by: userId,
          must_change_password: true,
        },

    );
    if (error) throw new Error(error.message);
    const clientId = invited.user?.id;
    if (!clientId) throw new Error("Failed to invite user");

    return { clientId, email: data.email };
  });

export const resendClientInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      clientId: z.string().uuid(),
      redirectTo: z.string().url().max(500),
    }).parse(input),
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

    // Fetch the client's email
    const { data: userRes, error: userErr } =
      await supabaseAdmin.auth.admin.getUserById(data.clientId);
    if (userErr) throw new Error(userErr.message);
    const email = userRes.user?.email;
    if (!email) throw new Error("Client email not found");

    // Generate a fresh magic link (works whether or not the user already confirmed)
    const { error: linkGenErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: data.redirectTo },
    });
    if (linkGenErr) throw new Error(linkGenErr.message);

    return { ok: true, email };
  });

export const clearMustChangePassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { must_change_password: false },
    });
    return { ok: true };
  });
