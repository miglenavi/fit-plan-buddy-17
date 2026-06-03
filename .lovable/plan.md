# Restructure: Plan → Training → Exercises + Session/Set logging

## Goal

Move from the current flat model (a `workout_plans` row = a single workout) to a real three-layer planning model with a separate logging layer that supports per-set logging and progression vs. last session.

```text
PLANNING                          LOGGING
plans                             training_sessions  (one started instance)
 └─ trainings (templates)           └─ session_exercises (one per exercise)
      └─ training_exercises              └─ set_logs (one row per set)
            → exercises (library)
```

## New schema

Single migration, with GRANTs + RLS for every new table.

**New tables**
- `plans` — `id, trainer_id, name, description, status ('draft'|'active'|'archived'), created_at, updated_at`
- `trainings` — `id, plan_id, name, description, order_index, created_at, updated_at` (the reusable "Lower Body A", "Push Day")
- `training_exercises` — `id, training_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, target_weight, rest_seconds, coach_notes`
- `training_sessions` — `id, training_id, client_id, trainer_id, started_at, completed_at, status ('in_progress'|'completed'|'abandoned'), logged_by ('client'|'trainer'), client_notes, trainer_notes`
- `session_exercises` — `id, session_id, training_exercise_id, exercise_id, order_index, notes` (snapshot of the template at start)
- `set_logs` — `id, session_exercise_id, set_index, reps, weight, rpe, completed, created_at`

**Extend `exercises`**
- Add `muscle_groups text[]` (array of muscle group tags), `default_rest_seconds int`.

**Client ↔ plan assignment**
- Reuse `client_programs` table, renamed concept: it links a client to a `plan` for a date range. Add `plan_id uuid` column. Keep `start_date/end_date/status`. (`workout_plan_id` on old `client_programs` doesn't exist; it's via `program_workouts`.)

**Drop / deprecate**
- `assigned_workouts` (the materialized weekly rotation) — gone.
- `program_workouts` — gone (replaced by `trainings.plan_id`).
- `workout_plan_exercises` — gone (replaced by `training_exercises`).
- `workout_plans` — gone (split into `plans` + `trainings`).
- `exercise_logs` — gone (replaced by `session_exercises` + `set_logs`).

Because the app has minimal real data, the migration **drops & recreates** rather than backfilling. If you want backfill, say so and I'll add it.

**RLS sketch**
- `plans`, `trainings`, `training_exercises`: trainer manages own (via `plans.trainer_id`); client SELECTs if they have an active `client_programs` row referencing the plan.
- `training_sessions`, `session_exercises`, `set_logs`: client manages own (`client_id = auth.uid()`); trainer manages sessions for their clients via `is_trainer_of(auth.uid(), client_id)`. **This finally enables trainer-side logging.**

## Routes (after migration)

**Trainer**
- `/trainer/plans` — list plans, create new
- `/trainer/plans/$planId` — plan detail: edit name, list trainings, add training, reorder
- `/trainer/plans/$planId/trainings/$trainingId` — training detail: add/reorder exercises with sets/reps/weight/rest/notes
- `/trainer/clients/$clientId` — assign a plan (date range), list past sessions, "Start session for this client" button per training
- `/trainer/clients/$clientId/sessions/$sessionId` — trainer-side logging UI (same component as client logging, `logged_by='trainer'`)
- `/trainer/exercises` — library (keep current, add muscle groups field)

**Client**
- `/client` — today / my plan summary, "Start training" CTAs
- `/client/start` — list of trainings in active plan, with "next suggested" highlighted (based on last completed `training_sessions.training_id` and `trainings.order_index`)
- `/client/plan` — read-only view of active plan and its trainings
- `/client/sessions/$sessionId` — live logging UI:
  - For each exercise: planned sets/reps/weight, **"Last time" row** from the most recent completed `session_exercises` + `set_logs` for the same `(client_id, training_exercise_id)`, simple progression suggestion (last weight + small step if all sets hit top of rep range), and per-set inputs (`reps`, `weight`, RPE optional, completed checkbox).
- `/client/history` — list of completed sessions
- `/client/history/$sessionId` — past session detail
- `/client/progress` — keep current chart shape, point at `set_logs`

## Server functions (new file `src/lib/sessions.functions.ts`)

- `startSession({ trainingId, clientId? })` — creates `training_sessions` + snapshot `session_exercises`. If called by trainer, requires `is_trainer_of`.
- `logSet({ sessionExerciseId, setIndex, reps, weight, rpe?, completed })` — upsert by `(session_exercise_id, set_index)`.
- `completeSession({ sessionId })` — set `completed_at`, status='completed'.
- `getSessionWithLastTime({ sessionId })` — returns exercises + planned targets + last-time set logs for the suggestion UI.
- `getNextSuggestedTraining({ clientId })` — returns the training to do next.

## Out of scope (this turn)

- Backfilling existing data (will be wiped).
- Calendar scheduling.
- Per-week progression / mesocycle progression beyond the "last time + small bump" suggestion.
- Real RPE/1RM math — RPE is just a stored number.

## Risks

- Generated `src/integrations/supabase/types.ts` regenerates after migration; every file referencing `workout_plans`, `workout_plan_exercises`, `assigned_workouts`, `program_workouts`, `exercise_logs` will fail to typecheck and needs rewriting. That's a lot of routes: `trainer.plans.*`, `trainer.clients.$clientId`, `client.index`, `client.history`, `client.workouts.$assignedId`, `client.profile`. I'll delete the old route files and create the new ones in the same code pass after the migration runs.
- Order of operations: (1) run migration (you approve), (2) I delete obsolete routes + write new ones + new serverFns in one batch, (3) verify build.

## Confirm before I run the migration

Two questions worth answering before I press go:

1. **Wipe existing workout data?** Plans, assignments, and logs in the DB today get deleted. OK?
2. **Muscle groups** — free-text array (you type "quads, glutes"), or a fixed enum list (`chest, back, shoulders, biceps, triceps, quads, hamstrings, glutes, calves, core, full_body`)? I'd default to the fixed list.
