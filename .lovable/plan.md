## The bug

When trainer or client opens an in-progress session, the page shows **"Day 1 — 0 / 0"** with no exercises and no working "Finish" button, even though the session was created correctly and `session_exercises` rows exist in the database (verified: 6 rows for the latest session).

Root cause is in `src/components/SessionLogger.tsx`. The Supabase query embeds the `exercises` table twice:

```ts
.select("*, exercises(name, description, image_url, video_url, default_rest_seconds), alternative:exercises!alternative_exercise_id(name), set_logs(*)")
```

`session_exercises` has **two** foreign keys to `exercises` (`exercise_id` and `alternative_exercise_id`), so the bare `exercises(...)` embed is ambiguous. PostgREST returns error `PGRST201` ("Could not embed because more than one relationship was found"). Confirmed by hitting the REST endpoint directly.

The `load()` catch block sets `errorMsg` and the component should render an error card, but on the trainer-branded route the error gets buried because the UI still shows the session header from the first successful query (the `trainings(name)` embed on `training_sessions` is fine — only one FK there). The result for the user: zero exercises rendered, nothing to log, "Finish" button effectively disabled because `sets.length === 0`.

## The fix

Single small change in `src/components/SessionLogger.tsx`:

1. Disambiguate the embed by naming the primary FK explicitly:
   ```ts
   .select("*, exercise:exercises!exercise_id(name, description, image_url, video_url, default_rest_seconds), alternative:exercises!alternative_exercise_id(name), set_logs(*)")
   ```
2. Update the two places that read `row.exercises` to read `row.exercise` instead (one in `exerciseMeta[row.id] = row.exercises` inside `load()`, one in the render fallback `se.exercises`).

That's it. The trainer-vs-client routing, RLS policies, `startSession` server fn, and grants are all correct — the only thing blocking the flow is this embed.

## Out of scope

- No DB / RLS / migration changes
- No changes to `startSession`, the trainer route, the client route, or `AppShell`
- No new UI

## Verification after build

- Trainer: `/trainer/clients/$clientId` → click "Start training" → land on `/trainer/clients/$clientId/sessions/$sessionId` → see all 6 exercises listed → log a set → click **Finish session** → returns to client profile.
- Client: `/client` → tap an assigned training → land on `/client/sessions/$sessionId` → same flow.
