# Exercise library: renames, cable-fly merge, calf & knee-raise cleanup

Follow-up to the completed categorization work. All changes are additive or in-place:
renames keep the same exercise record (so every training, session and set log stays
linked), new exercises are built-in (no trainer owner), and the one merge uses the same
safe re-point → verify → delete process as the Pull-Up merge.

## Checked against live data

- All 30 exercises named below exist with the expected muscle group and equipment.
- "Cable Crossover" and "Cable Fly" are both currently unused (0 workout references,
  0 logged-session references), so the merge carries no history risk. The kept record
  will be "Cable Crossover" (renamed to Cable Chest Fly); "Cable Fly" is deleted after
  a re-point + verify pass anyway, so the process stays identical and safe.

## Order of operations

1. Calf raises first, renaming "Standing Calf Raise" → "Standing Machine Calf Raise"
   before "Calf Raise" → "Standing Calf Raise", so the two names never clash.
2. All other renames (each an UPDATE on name, plus muscle group/equipment where listed).
3. Cable fly merge: re-point all four reference columns to the kept record, verify zero
   remaining references, then delete the duplicate.
4. Insert the two new built-in exercises.
5. Verify: total count, no duplicate names, no null equipment, reference counts unchanged.

## Final list

### Renamed (same record, history preserved)

| Current name | New name | Group / equipment |
| --- | --- | --- |
| Bench Press | Barbell Bench Press | Chest / Barbell |
| Decline Bench Press | Decline Barbell Bench Press | Chest / Barbell |
| Overhead Press | Standing Barbell Overhead Press | Shoulders / Barbell |
| Upright Row | Barbell Upright Row | Shoulders / Barbell |
| Romanian Deadlift | Barbell Romanian Deadlift | Hamstrings / Barbell |
| Single-Leg RDL | Dumbbell Single-Leg Romanian Deadlift | Hamstrings / Dumbbell |
| Bulgarian Split Squat | Dumbbell Bulgarian Split Squat | Quads / Dumbbell |
| Reverse Lunge | Dumbbell Reverse Lunge | Quads / Dumbbell |
| Walking Lunge | Dumbbell Walking Lunge | Quads / Dumbbell |
| Step-Up | Dumbbell Step-Up | Quads / Dumbbell |
| Curtsy Lunge | Dumbbell Curtsy Lunge | Glutes / Dumbbell |
| Triceps Kickback | Dumbbell Triceps Kickback | Triceps / Dumbbell |
| Cable Kickback | Cable Glute Kickback | Glutes / Cable |
| Skull Crusher | EZ-Bar Skull Crusher | Triceps / Barbell |
| Preacher Curl | EZ-Bar Preacher Curl | Biceps / Barbell |
| Crunches | Crunch | Core / Bodyweight |
| Chest-Supported Row | Chest-Supported Machine Row | Upper Back / Machine |
| Delt Machine | Lateral Raise Machine | Shoulders / Machine |
| Pull-Up (Assisted) | Machine Assisted Pull-Up | Lats, secondary biceps / Machine |
| Chest Dip (Assisted) | Machine Assisted Chest Dip | Chest, secondary triceps + shoulders / Machine |
| Standing Calf Raise | Standing Machine Calf Raise | Calves / Machine |
| Calf Raise | Standing Calf Raise | Calves / Bodyweight (weight optional when logging) |
| Seated Calf Raise | Seated Machine Calf Raise | Calves / Machine |
| Leg Curl | Lying Leg Curl | Hamstrings / Machine |
| Knee Raise | Knee Raise (Parallel Bars) | Core / Bodyweight |

The last three renames in the "Delt Machine / Pull-Up (Assisted) / Chest Dip (Assisted)"
rows supersede the earlier plan's names for those records.

### Merged

- Cable Crossover + Cable Fly → **Cable Chest Fly** (Chest, secondary shoulders, Cable).
  Kept record: Cable Crossover's id; Cable Fly deleted after re-point and verification.

### New (built-in)

- **Seated Leg Curl** — Hamstrings, Machine
- **Hanging Knee Raise** — Core, Bodyweight

### Unchanged, listed for completeness

- Donkey Calf Raise (Calves, Machine)
- Hanging Leg Raise (Core, Bodyweight)
- Leg Raise (Parallel Bars) (Core, Bodyweight)

Resulting sets: four calf raises (Standing, Standing Machine, Seated Machine, Donkey)
and four knee/leg raises (Hanging Knee Raise, Knee Raise (Parallel Bars), Hanging Leg
Raise, Leg Raise (Parallel Bars)).

## Technical notes

- Renames and re-tags run as UPDATEs through the data-change tool; the two inserts add
  rows with `trainer_id` NULL so they behave like the other built-ins. No schema change,
  no new migration, no RLS change.
- Merge: UPDATE `training_exercises.exercise_id`, `training_exercises.alternative_exercise_id`,
  `session_exercises.exercise_id`, `session_exercises.alternative_exercise_id` from the
  duplicate id to the kept id; confirm zero rows still reference the duplicate; then
  DELETE the duplicate row. `set_logs` hang off `session_exercises`, so logs follow
  automatically.
- No UI changes needed — equipment tags, filters and Title Case handling are already live.
- After applying: re-run `bunx tsgo --noEmit` and `bunx vitest run` (expect 32 passing),
  then report final counts. Nothing published.

## Risks

- Name-clash on the calf raises if the order is not respected — mitigated by the
  explicit ordering above.
- Renames are visible immediately to the live trainer mid-plan; names change but every
  plan, session and logged set keeps pointing at the same record.
