## Goal
When a training exercise has an alternative, the trainer should be able to prescribe **different targets (sets, reps min/max, weight, rest)** for the alternative exercise. The client's chosen exercise determines which target block is shown and which target sets get prefilled into `set_logs`.

## Schema changes (migration)

Add nullable "alt_*" columns to `training_exercises`:
- `alt_target_sets int`
- `alt_target_reps_min int`
- `alt_target_reps_max int`
- `alt_target_weight numeric`
- `alt_rest_seconds int`
- `alt_coach_notes text`

Add the same set (nullable) to `session_exercises` so the snapshot preserves both prescriptions at assignment time:
- `alt_target_sets`, `alt_target_reps_min`, `alt_target_reps_max`, `alt_target_weight`

All nullable, no backfill needed (existing rows keep a single target block; alt block stays NULL meaning "same as primary").

## Backend behavior
- Session creation snapshot copies both primary and alt target columns from `training_exercises` into `session_exercises`.
- When the client picks the alternative in `SessionLogger` (existing swap of `exercise_id` ↔ `alternative_exercise_id`), also swap the target columns with their `alt_*` counterparts on that `session_exercises` row, so downstream code keeps reading `target_*` for the performed exercise. Fallback: if `alt_*` is NULL, copy primary values.

## UI changes

### Trainer — training detail (`trainer.plans.$planId.trainings.$trainingId`)
For exercise rows that have an `alternative_exercise_id`:
- Show a tabbed/two-column "Primary" / "Alternative" target editor.
- Each side edits its own sets / reps / weight / rest / notes.
- If trainer leaves the alt block empty, show hint "Uses same targets as primary".

### Client — SessionLogger
- Header chooser unchanged.
- When unpicked, show both target lines ("Primary: 4×8–10 @ 60kg" / "Alternative: 3×12 @ 40kg").
- After pick, only the chosen exercise's targets are shown and used to seed set rows.

## Out of scope
- No changes to `set_logs` schema.
- No reordering / duplication / charts.
- No change to one-active-plan trigger or RLS.

## Files touched
- New migration: add alt target columns to `training_exercises` and `session_exercises`.
- `src/components/AssignPlanDialog.tsx` (or wherever sessions are materialized) — include alt cols in the snapshot insert.
- `src/components/SessionLogger.tsx` — swap target cols when choosing alternative; render the right target block.
- Trainer training-detail page — add alt target inputs.
- `src/integrations/supabase/types.ts` is auto-regenerated after migration.

## Doc update
Update `/mnt/documents/ValhallaFit_Plans_and_Sessions.md` to describe the dual-target model and the swap-on-pick behavior.
