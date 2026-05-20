# Weekly programs + progression + trainer progress view

Shift from one-off date-based workout assignments to a weekly recurring program with built-in progression and trainer-side analytics.

## 1. Weekly programs (replaces single-date assignments)

A trainer assigns a **program** to a client: a set of workout plans the client owes each week, for a fixed number of weeks. The client picks any day in the week to do each one.

- New table `client_programs`: `trainer_id`, `client_id`, `start_date`, `end_date`, `status` (active/ended).
- New table `program_workouts`: `program_id`, `workout_plan_id`, `slot` (1..N) — defines "this program contains 3 workouts per week: A, B, C".
- Keep `assigned_workouts` but repurpose it as the per-week instance: one row per (program_workout × week). Add `program_id`, `week_start_date` (Monday). `scheduled_date` becomes nullable (the day the client actually did it).
- Background-fill on read: when a client loads the week, ensure rows exist for the current week's slots (lazy materialization — no cron needed).

**Trainer UI** (`trainer.clients.$clientId.tsx`): "Assign program" dialog — pick workout plans (N per week), pick start + end date. Replaces the single-date assign dialog.

**Client UI** (`client.index.tsx`): show "This week" — all N workouts for the current week, each as Start/Resume/Done. Show progress like `2 / 3 done this week`. Below: next week preview.

## 2. Progression auto-suggest

When adding/editing an exercise in a workout plan, pre-fill targets from the last logged performance for this (client-agnostic for now — based on the plan's own history) +1 rep or +2.5 kg.

- New view/helper `last_exercise_log(exercise_id)` — returns most recent `actual_reps` / `actual_weight` across all logs.
- In `trainer.plans.$planId.tsx`, when an exercise is picked in the add form, fetch its last log and pre-fill sets/reps/weight as `last + suggested bump`. Trainer can override before saving.
- Small "Last time: 3×10 @ 40kg → suggested 3×10 @ 42.5kg" hint under the inputs.

## 3. Trainer progress view (on client detail page)

Replace the flat history list with two sections:

**a) Weekly completion grid** — last 8 weeks as columns, one row per program workout slot. Each cell shows done / missed / pending. Quick visual of consistency.

**b) Per-exercise progression** — for each exercise the client has done, a sparkline of weight (or reps if bodyweight) over time. Flag regressions in red, stagnation (no improvement in 30 days) in amber.

Both built from `exercise_logs` joined to `assigned_workouts` filtered by `client_id`. Recharts for the sparklines (already a common shadcn add).

## Out of scope

- Notifications / reminders.
- Rest-day scheduling, deload weeks.
- Per-client exercise progression suggestions (uses last-logged across the plan for now).
- Editing a program after it starts (trainer can end + create new).

## Technical notes

- Migration: create `client_programs`, `program_workouts`; alter `assigned_workouts` to add `program_id uuid`, `week_start_date date`, make `scheduled_date` nullable. RLS mirrors existing trainer/client policies.
- Lazy week-materialization runs in a server function called by the client's "This week" loader so RLS stays simple.
- Old single-date assignments stay readable (program_id null) so existing data isn't lost.
