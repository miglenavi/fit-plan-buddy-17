import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const inviteTrainer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      email: z.string().email().max(255),
      fullName: z.string().min(1).max(255),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify caller is super_admin
    const { data: roleRow, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "super_admin")
      .maybeSingle();
    if (roleErr) throw new Error(roleErr.message);
    if (!roleRow) throw new Error("Only super admins can invite trainers");

    const redirectTo = `${process.env.SITE_URL ?? ""}/auth`.replace(/\/+$/, "/auth");

    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      {
        data: {
          full_name: data.fullName,
          invited_as: "trainer",
        },
        redirectTo: redirectTo || undefined,
      },
    );
    if (error) throw new Error(error.message);

    return { userId: invited.user?.id ?? null, email: data.email };
  });
