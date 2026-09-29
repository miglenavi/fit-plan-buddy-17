# Plan: assisted exercises, band levels, 7 new built-ins

Follows on from the approved rename/merge plans. Additive only: new nullable columns, no renames or drops, existing sets and history untouched. Migration diff shown before applying.

## 1) New built-in exercises (7)

| Name | Primary | Secondary | Equipment | Assisted |
|---|---|---|---|---|
| Incline Dumbbell Y Raise | Upper Back | shoulders | Dumbbell | no |
| Incline Dumbbell T Raise | Upper Back | shoulders | Dumbbell | no |
| Machine Assisted Chin-Up | Lats | biceps | Machine | yes |
| Band Assisted Pull-Up | Lats | biceps | Resistance Band | yes |
| Band Assisted Chin-Up | Lats | biceps | Resistance Band | yes |
| Band Assisted Chest Dip | Chest | triceps, shoulders | Resistance Band | yes |
| Band Assisted Triceps Dip | Triceps | chest, shoulders | Resistance Band | yes |

Before inserting, check none of these names exist already. If one does, stop and report it instead of adding a duplicate.

## 2) Assisted exercises: less weight counts as progress

- New exercise setting **"Assisted"** (off by default). Trainers can switch it on when creating or editing their own exercises.
- Switched on for: Machine Assisted Pull-Up, Machine Assisted Chest Dip (both already exist, same records), Machine Assisted Chin-Up, and the four Band Assisted exercises.
- For assisted exercises, the weight field reads **"Assistance (kg)"** everywhere, and "better" means less assistance:
  - Up/down arrows and colours next to each set: less assistance than planned shows as the improvement.
  - "Last time" line reads e.g. "Set 1: 8 reps @ 20kg assistance".
  - "Try more weight" hint becomes "You hit the top of the rep range. Try **less** assistance today (e.g. 17.5kg)." It never suggests going below 0.
  - Trainer's end-of-session summary ("Weight vs plan") treats less assistance as ahead of plan.
  - Workout editor: target field reads "Assistance (kg)" and the list reads "@ 20kg assistance".

## 3) Band exercises: log a band, not kg

Keep it simple: a fixed list of band levels, picked per set from a dropdown in place of the weight box.

```text
1 Extra light (yellow)  2 Light (red)  3 Medium (green)  4 Heavy (black)  5 Extra heavy (purple)
```

- Band exercises are the ones with equipment **Resistance Band**. They show a "Band" dropdown instead of a kg box. Workout targets use the same dropdown.
- For assisted band exercises, a **lighter band counts as progress**: arrows, "last time", and the hint ("try the Light (red) band today") all follow that.
- Band sets have no kg, so they are left out of the trainer summary's kg totals and counted on a separate "Band vs plan" line.
- Colours differ between brands, so the level name leads and the colour is shown in brackets. Trainers can't customise the list yet; that can come later if needed.

## 4) Every screen that shows weight or progress

These are all the places found in the app today. There are no progress charts or personal-best screens yet, so nothing else needs flipping. If they're built later, they will follow the Assisted setting.

1. **Session logging screen**, shared by client and trainer (client session page and trainer's client session page): set inputs, arrows next to each set, "Last time", the "try X kg" hint, target lines, and the trainer summary. This is the main change.
2. **Workout editor** (trainer, plan → training day): target weight fields when adding or editing an exercise and its alternative, plus the exercise list lines.
3. **Exercise library and exercise detail** (trainer): new Assisted switch plus an "Assisted" tag beside the equipment tag.
4. **Client history** and **trainer client page**: checked. They list sessions only and show no weights or trends, so nothing changes.
5. **Agent tools** (exercise search, recent sessions): add `assisted` to the results so agents don't read less assistance as a decline.

Please confirm there's no other screen where you look at progress, such as something you expect to exist but haven't seen.

## Technical details

- Migration (additive):
  - `exercises.is_assisted boolean NOT NULL DEFAULT false`
  - `set_logs.band_level smallint NULL CHECK (band_level BETWEEN 1 AND 5)`
  - `training_exercises.target_band_level`, `alt_target_band_level`
  - `session_exercises.target_band_level`, `alt_target_band_level`, all nullable smallint with the same check
  - `sessions.functions.ts` copies target band levels when it starts a session. `choose_session_exercise` gets an additive `CREATE OR REPLACE` that also swaps band targets. Existing RLS is unchanged because the new columns inherit current row policies.
- Data changes (guarded, all-or-nothing): set `is_assisted = true` by id for the two existing machine exercises, then insert the 7 built-ins with `trainer_id = NULL` and matching `muscle_groups`.
- Shared helper `src/lib/progress.ts`: `betterDirection(ex)`, `weightLabel(ex)`, `BAND_LEVELS`, `formatLoad(set, ex)`. The session logging screen and workout editor both use it, so the flipped logic lives in one place.
- `DeltaChip` gets an `invert` prop, so the arrow still shows the actual direction but the colour and meaning flip.
- Files: `src/components/SessionLogger.tsx`, `src/routes/trainer.plans.$planId_.trainings.$trainingId.tsx`, `src/routes/trainer.exercises.index.tsx`, `src/routes/trainer.exercises.$exerciseId.tsx`, `src/lib/sessions.functions.ts`, `src/lib/mcp/tools/search-exercises.ts` (plus the recent-sessions tool), new `src/lib/progress.ts`.
- Tests: unit test for the inverted direction and band ordering. Integration test on disposable QA accounts: log a band set on an assisted band exercise, confirm `band_level` persists, and confirm an alternative swap keeps band targets. The full suite must stay green. No publishing.
