## Bug

On the trainer's training-detail page, adding an exercise succeeds in the database and shows the "Added" toast, but the "Exercises in this training" list stays empty (and existing exercises also don't render).

## Root cause

`training_exercises` now has two foreign keys to `exercises` (`exercise_id` and the new `alternative_exercise_id`). PostgREST returns HTTP 300 "Could not embed because more than one relationship was found for 'training_exercises' and 'exercises'" for the ambiguous embed used in `load()`:

```
.select("*, alternative_exercise_id, exercises(name, category_id, muscle_groups)")
```

Confirmed live: the request returns 300 and `data` is null, so `items` is set to `[]`. Insert path is unaffected, which is why the toast shows success.

## Fix

In `src/routes/trainer.plans.$planId_.trainings.$trainingId.tsx`, disambiguate the embed by naming the FK column:

```
.select("*, exercises!exercise_id(name, category_id, muscle_groups)")
```

(The redundant `alternative_exercise_id` in the select list can be dropped — it's already covered by `*`.)

No other files or schema changes are needed. Existing rows will render again and newly added ones will appear immediately after `load()` reruns.

## Verification

Reload the training page — the previously "missing" exercises appear. Add a new exercise — it appears in the list without a manual refresh.
