# Per-client progression prompts

Switch progression from a trainer-side auto-fill (currently in plan editor) to a **client-side prompt** scoped to each client + exercise. Plans stay generic templates with base targets; the encouragement to push harder is shown to the client during their workout.

## What changes

### Trainer plan editor (`src/routes/trainer.plans.$planId.tsx`)
- Remove the "Last: 3×11 → suggested progression: 3×12" banner and auto-fill on exercise pick. Plans are templates and have no client context.
- Trainer just sets base sets/reps/(weight) like before.

### Client workout view (`src/routes/client.workouts.$assignedId.tsx`)
For each exercise on the workout screen, look up that **client's most recent log for that exercise** (across all their previous assigned workouts).

**Displayed target for today = max(plan target, client's last actual)** — per field (sets, reps, weight). So if the plan says 3×10 @ 10 kg but last time the client did 3×10 @ 12 kg, today's screen shows **3×10 @ 12 kg** as the target. The underlying plan record is not modified — this is a per-client display override computed on the fly.

Hint shown above inputs:
- Hit or exceeded target last time:
  > Last time: **3 × 10 @ 12 kg**. Try to add reps or weight today.
- Missed target last time:
  > Last time: **3 × 8 @ 12 kg** (target was 10). Aim to finish all reps today.
- No prior log: no hint.

Inputs are not pre-filled; the client types actual numbers as they do today.

### After client logs the exercise
When they save reps/weight, if they **matched but didn't beat their last performance**, show a gentle toast:
> Nice work. Next session, try one more rep or a bit more weight.

This nudge fires once at save time and is purely informational.

### Trainer progress view (`src/routes/trainer.clients.$clientId.tsx`)
Already shows per-exercise progression sparklines from `exercise_logs`. No changes needed — it naturally reflects whether the client is pushing harder over time.

## Data model

No schema changes. Everything reads from existing `exercise_logs` joined to `assigned_workouts` filtered by `client_id` + `exercise_id`, ordered by `assigned_workouts.week_start_date DESC, completed_at DESC`, limit 1.

## Technical notes

- New helper `getLastClientExerciseLog(clientId, exerciseId)` — server fn returning `{ actual_sets, actual_reps, actual_weight, target_reps, target_weight }` or null.
- Batch-fetch all hints for a workout in one query (one round-trip per workout view, not one per exercise).
- Remove the `last_exercise_log`-style global lookup added previously to the plan editor.

## Out of scope

- Auto-incrementing target values
- Trainer-defined progression rules per exercise
- Deload weeks / periodization
