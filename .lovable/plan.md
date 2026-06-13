
# Client-logs-workout flow — audit + minimal fix

## 1. Components / pages in this flow

| Step | File |
|---|---|
| Login | `src/routes/auth.tsx` + `src/lib/auth.tsx` (unchanged) |
| See assigned trainings | `src/routes/client.index.tsx` (the "Today" page) |
| Start a session (server) | `src/lib/sessions.functions.ts` → `startSession` |
| Session page (route shell) | `src/routes/client.sessions.$sessionId.tsx` |
| Log sets/reps/weight + save + finish | `src/components/SessionLogger.tsx` |
| Trainer reviews completed data | `src/routes/trainer.clients.$clientId.tsx` + `src/routes/trainer.clients.$clientId.sessions.$sessionId.tsx` (reuses `SessionLogger`) |

## 2. Database tables used

- `plans` — trainer-owned workout plan
- `client_programs` — links a `plan` to a `client` (active assignment)
- `trainings` — a training day within a plan (reusable template)
- `training_exercises` — exercises in a training day (template)
- `training_sessions` — one workout instance: `client_id`, `training_id`, `trainer_id`, `logged_by`, `started_at`, `completed_at`, `status`
- `session_exercises` — snapshot of the template exercises for that session (preserves what the plan looked like at log time)
- `set_logs` — individual sets: `reps`, `weight`, `rpe`, `completed`, linked to `session_exercises`

The "saved workout log is connected to client / plan / training day / exercise / date" requirement is already satisfied by this shape:
`set_logs → session_exercises → training_sessions(client_id, training_id, started_at) → trainings(plan_id) → plans`.

## 3. Where the flow is actually breaking

I checked the live DB. For the test client there are **5 in-progress sessions for the same training, created within ~25 seconds**, all from the trainer's "Start" button. Same root cause applies to the client side.

Root cause: `startSession` (server fn) always **inserts a new** `training_sessions` row. There is no "if an in-progress session for this (client, training) already exists, return it" check. Combined with:

- Client `client.index.tsx` only disables one button via local `starting` state — a refresh or second tab spawns another session.
- After creating a session, there is no UI anywhere telling the client "you already have one in progress" — so the only path back is to tap Start again, which makes yet another.
- Two earlier non-blocking issues are already fixed in this branch: the ambiguous `exercises` FK embed in `SessionLogger`, and the SessionLogger now renders for both roles.

Net effect for the client: tap Start → land on an empty session → tap back → tap Start again → new session, exercises don't appear consistently, "Finish" feels random because they keep landing on different rows. That is the "stuck" feeling.

RLS, GRANTs, the snapshot insert, the set_logs upsert, and the Finish update are all correct. No schema change is required.

## 4. Exact fix (smallest safe change)

**No DB migration. No schema changes. No redesign.** Three small code edits:

### a) `src/lib/sessions.functions.ts` — make `startSession` idempotent
Before inserting, query for an existing in-progress session:
```ts
const { data: existing } = await supabase
  .from("training_sessions")
  .select("id")
  .eq("client_id", clientId)
  .eq("training_id", data.trainingId)
  .eq("status", "in_progress")
  .order("started_at", { ascending: false })
  .limit(1)
  .maybeSingle();
if (existing) return { sessionId: existing.id };
```
Only when none exists do we insert + snapshot template exercises (existing code).

### b) `src/routes/client.index.tsx` — show "Resume" instead of a second "Start"
On load, also fetch the client's current in-progress session (one query):
```ts
supabase.from("training_sessions")
  .select("id, training_id")
  .eq("status", "in_progress")
  .order("started_at", { ascending: false })
  .limit(1)
```
If present:
- Pin a "Resume your session" card above the trainings list linking to `/client/sessions/$sessionId`.
- On the matching training card, swap the Start button label/handler to "Resume" linking to that session id (no server call).

### c) `src/components/SessionLogger.tsx` — guard double-finish
Small: disable the "Finish session" button while the update is in flight, so a double-tap doesn't fire two updates. (One-line `useState` + `disabled`.)

That's it. Trainer review of completed sessions already works through the existing trainer routes — no change needed there because once duplicate creation stops, the trainer sees exactly one completed session per workout.

## Files I will touch

- `src/lib/sessions.functions.ts`
- `src/routes/client.index.tsx`
- `src/components/SessionLogger.tsx`

## Out of scope (explicitly not touching)

- Auth, roles, RLS, GRANTs.
- Schema / migrations.
- Trainer "Start for client" UX (separate concern; the server-fn fix also benefits it, but I won't change the trainer pages).
- Any visual redesign.
- Discard / cancel a session, calendar scheduling, reordering, history filters.

## One thing to confirm before I implement

Should "Resume" appear **only on the matching training card** (minimal), or also as a pinned banner at the top of the Today page? Default if you don't reply: both, because it's the same one-query data and avoids confusion if the client scrolls past the matching card.
