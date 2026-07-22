import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_clients",
  title: "List my clients",
  description: "List clients assigned to the signed-in trainer. Trainer role required.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("trainer_clients")
      .select("client_id, archived_at, profiles:client_id(full_name)")
      .eq("trainer_id", ctx.getUserId())
      .is("archived_at", null);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = (data ?? []).map((r) => {
      const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      return { clientId: r.client_id as string, fullName: (profile?.full_name as string | null) ?? null };
    });
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { clients: rows },
    };
  },
});
