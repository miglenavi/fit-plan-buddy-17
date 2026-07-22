import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_me",
  title: "Get my account",
  description: "Return the signed-in user's profile, roles, and email.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const userId = ctx.getUserId();
    const email = ctx.getUserEmail();
    const sb = supabaseForUser(ctx);
    const [{ data: profile }, { data: roleRows }] = await Promise.all([
      sb.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
      sb.from("user_roles").select("role").eq("user_id", userId),
    ]);
    const roles = (roleRows ?? []).map((r) => r.role);
    const payload = { userId, email, fullName: profile?.full_name ?? null, roles };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
