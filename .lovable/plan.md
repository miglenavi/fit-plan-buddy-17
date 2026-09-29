# Exercise categorization: Lats, equipment, merges, cleanup

All trainings and logged sessions stay intact. Every step adds to what's there, and I'll show you the full database change before applying it.

## What you'll see
- A new **Lats** muscle group, available in the primary picker, secondary chips and filters.
- Every exercise gets an **equipment** tag (Barbell, Dumbbell, Kettlebell, Cable, Machine, Bodyweight, Resistance Band), shown as a small label next to its name in the library, pickers and workout editors.
- Library and exercise picker: muscle group and equipment filters that work together (e.g. "Lats + Dumbbell").
- Creating or editing a custom exercise requires a primary muscle group and equipment. Secondary groups stay optional (up to 3). New names are auto-formatted to Title Case, e.g. "incline db press" becomes "Incline Db Press". Hyphens and brackets are kept.
- Your data updates A–E are applied exactly as you listed them.

## Answers to your questions

**Which tables reference exercises** (checked against the live database):
- `training_exercises.exercise_id`: **deleting the exercise also deletes these rows**
- `training_exercises.alternative_exercise_id`: gets cleared on delete
- `session_exercises.exercise_id`: **deleting the exercise also deletes these rows**, and their set logs go with them
- `session_exercises.alternative_exercise_id`: gets cleared on delete
- `set_logs` does not point to exercises directly. It hangs off `session_exercises`, so logged sets move automatically when their session row is re-pointed.

This is why the order matters: deleting a duplicate before re-pointing would wipe 12 sessions of Pull up history.

**How the merge runs safely**
1. First I'll count the current references and show them to you. Right now: custom "Pull up" = 4 trainings / 12 sessions, built-in "Pull-Up" = 1 / 5, "Reverse fly" #1 (52b0…) = 1 session, "Reverse fly" #2 (05e9…) = 0.
2. In one all-or-nothing step: re-point all four references to the kept exercise.
3. Confirm zero references remain on the duplicates, and stop if not.
4. Only then delete the duplicates. The kept Reverse Fly is the one with history (52b0…), renamed "Reverse Fly" with secondary = shoulders.
5. Re-count afterwards. Kept totals must equal the old totals added together (Pull-Up: 5 trainings / 17 sessions).
6. Progress history uses the exercise id, so after the merge "Last time" and progress pull from the combined history.

**Exercises that end up without equipment**
The new field starts optional. After your list E is applied, I'll send you any exercises still missing equipment (e.g. Landmine-style or band exercises not in the list) so you can assign them. I won't guess. The app then requires equipment for new and edited exercises. Old exercises without a tag show no label and don't appear under any equipment filter until they're tagged. The database only enforces "required" in a later step, once every exercise has a value.

**Risks**
- Deleting before re-pointing would erase history. The ordered steps and the zero-reference check above prevent this.
- If one workout day has both "Pull up" and "Pull-Up", the merge shows it twice. That's harmless, and I'll flag it if it happens.
- Changing the built-in "Pull-Up" to Lats also changes it for any future trainers. That fits your intent.
- Knee Raise is the only exercise with no primary group today. Your list D fixes that, so "primary required" can be enforced with no gaps.
- Names in list E that don't match exactly (spelling or hyphens) get reported, not skipped silently.
- Unconfirmed until I run the check: whether any exercise already carries a spelling from your list. I'll match without regard to letter case and report any mismatches.

## Technical details
- Migration (additive): `ALTER TYPE muscle_group ADD VALUE 'lats'`; new enum `equipment_type`; nullable `exercises.equipment`. Nothing gets renamed or dropped.
- Data changes (A–E, merges) run as separate queries in a transaction, not in the migration. Each merge updates 4 columns, checks the count, then deletes.
- UI: add `lats` to the `MUSCLE_GROUPS` list in `trainer.exercises.index.tsx` and `trainer.exercises.$exerciseId.tsx`; add equipment select, validation and a `toTitleCase` helper on create; add equipment chip and filters in the library and in the exercise pickers (training editor, SessionLogger add-exercise); add an equipment field to the MCP `search_exercises` output.
- Later step (after you confirm no exercises lack equipment): `SET NOT NULL` on `exercises.equipment`.
- Tests: add a merge test on disposable data (history preserved, set logs follow). The full suite must stay green. Nothing gets published.
