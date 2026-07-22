import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMe from "./tools/get-me";
import listMyClients from "./tools/list-my-clients";
import listMyPlans from "./tools/list-my-plans";
import listRecentSessions from "./tools/list-recent-sessions";
import searchExercises from "./tools/search-exercises";

// The OAuth issuer must be the direct Supabase host (not the .lovable.cloud proxy).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "valhallafit-mcp",
  title: "ValhallaFit",
  version: "0.1.0",
  instructions:
    "Tools for ValhallaFit: read the signed-in user's profile, clients (trainer), workout plans, recent training sessions, and the exercise library. All tools act as the signed-in user under row-level security.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMe, listMyClients, listMyPlans, listRecentSessions, searchExercises],
});
