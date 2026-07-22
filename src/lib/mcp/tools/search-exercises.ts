import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_exercises",
  title: "Search exercises",
  description:
    "Search the exercise library by name (partial, case-insensitive) and optional primary muscle group.",
  inputSchema: {
    query: z.string().trim().optional().describe("Partial name to match."),
    primary_muscle_group: z
      .string()
      .trim()
      .optional()
      .describe("Filter by primary muscle group (e.g. 'chest', 'quads')."),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, primary_muscle_group, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("exercises")
      .select("id, name, description, primary_muscle_group, secondary_muscle_groups")
      .order("name", { ascending: true })
      .limit(limit ?? 25);
    if (query) q = q.ilike("name", `%${query}%`);
    if (primary_muscle_group) q = q.eq("primary_muscle_group", primary_muscle_group);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { exercises: data ?? [] },
    };
  },
});
