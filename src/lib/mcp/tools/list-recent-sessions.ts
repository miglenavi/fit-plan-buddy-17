import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_recent_sessions",
  title: "List recent training sessions",
  description:
    "List the signed-in user's recent training sessions (as client or as trainer). Returns most-recent first.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Max sessions to return (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    const uid = ctx.getUserId();
    const { data, error } = await sb
      .from("training_sessions")
      .select("id, client_id, trainer_id, training_id, status, started_at, completed_at")
      .or(`client_id.eq.${uid},trainer_id.eq.${uid}`)
      .order("started_at", { ascending: false })
      .limit(limit ?? 10);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { sessions: data ?? [] },
    };
  },
});
