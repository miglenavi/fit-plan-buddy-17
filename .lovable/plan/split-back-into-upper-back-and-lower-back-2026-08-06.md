# Split "Back" into Upper Back and Lower Back

Today every pulling and hinge movement is tagged simply as "Back" (18 exercises as primary, more as secondary). That hides an important distinction for programming: lat/mid-trap pulling work vs. spinal erector / hinge work.

## What changes

1. Add two new muscle groups: **Upper back** and **Lower back**. The old "Back" option is removed from the picker so nothing stays ambiguous.
2. Re-tag every existing exercise that used "Back", as primary or secondary.
3. The exercise library filter chips, the new-exercise dialog, and the exercise detail editor all show the two new options instead of "Back".

## Proposed re-tagging

Upper back (lats, traps, rhomboids, rear delts):
Assisted Pull Up, Bent-Over Barbell Row, Chest Supported Incline Dumbbell Row, Chest-Supported Row, Chin-Up, Inverted Row, Lat Pulldown, Meadows Row, Pendlay Row, Pull-Up, Seated Cable Row, Single-Arm Dumbbell Row, Straight-Arm Pulldown, T-Bar Row, Barbell Shrug, Dumbbell Shrug, Upright Row, Face Pull, Reverse Pec Deck, Farmer's Carry.

Lower back (erectors, hinge):
Conventional Deadlift, Sumo Deadlift, Rack Pull, Romanian Deadlift, Stiff-Leg Deadlift, Good Morning, Hyperextension, Bird Dog, Kettlebell Swing.

Where an exercise trains both (e.g. deadlifts, rows), the other region is kept as a secondary group so nothing is lost.

## Technical notes

- Migration: add `upper_back` and `lower_back` to the `muscle_group` enum, run UPDATE statements mapping the existing `back` primary values and rewriting `back` inside `secondary_muscle_groups` arrays, then drop `back` from the enum by rebuilding the type (no rows may reference it at that point).
- Update the `MUSCLE_GROUPS` constant in `src/routes/trainer.exercises.index.tsx` and `src/routes/trainer.exercises.$exerciseId.tsx`.
- `prettyMuscle` already renders underscores correctly ("Upper Back").
- Regenerated `src/integrations/supabase/types.ts` picks up the new enum values.
- Workout plans and logged sessions reference exercises by id, so no historical data is affected.
