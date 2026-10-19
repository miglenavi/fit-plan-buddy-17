# Audit: historical session feedback vs. current code

I checked this against the code and the live database access rules only. I didn't change any code or data, and I didn't open the app on a phone in this pass. Every item marked "Uncertain" needs a phone-sized browser check before anyone calls it fixed.

Both the client and the trainer log workouts on the same screen (`src/components/SessionLogger.tsx`). The client opens it at `client.sessions.$sessionId.tsx` and the trainer at `trainer.clients.$clientId_.sessions.$sessionId.tsx`.

## Results

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 1 | Add exercise during a workout | Implemented (client + trainer) | `addExercise`. Database rules allow the client on their own client-logged session and the trainer on their own clients' sessions. |
| 2 | Remove exercise | Implemented | `removeExercise` uses a confirm, then deletes the row. Database rules allow both roles. |
| 3 | Replace exercise | Partial | `chooseExercise` / `choose_session_exercise` can only switch to the alternative already planned. There is no free "replace with any exercise". The workaround is remove + add, which loses the original slot's targets. |
| 4 | Add / delete sets | Implemented | `addSet` / `removeSet` delete the set log and save the set count through `set_session_exercise_sets`. Set numbering avoids reusing a deleted slot (load comment, lines ~102-106). |
| 5 | Ticked sets and typed numbers survive refresh/reopen | Mostly implemented, one gap | The checkbox saves straight away. Reps, weight and RPE save only when the field loses focus (`onBlur` -> `saveSet`). A number typed and then followed by a refresh, app switch or phone lock, without tapping elsewhere, can be lost. Side effect: typing reps above 0 marks the set as done automatically (`saveSet`, the `completed` line). |
| 6 | Finish button visible on mobile | Implemented in code, phone check pending | Sticky bar hidden while dialogs are open. Page has bottom padding `pb-[calc(13rem+safe-area)]`. Checked at 360/390px on 2026-10. |
| 7 | Exercise picker: picks the right item, scrolling doesn't close it, searchable | Implemented in code, touch behavior uncertain | Full-height sheet, list scrolls inside, search with 150ms debounce + equipment filter. Risk: rows are plain `onClick` buttons, so a tap at the end of a scroll fling could add the wrong exercise. There's no muscle-group filter in this picker, and results stop at 30, so a broad search can hide items. |
| 8 | Reorder exercises during a workout on mobile | Implemented (arrow buttons) | `moveExercise` saves `order_index`. No drag-and-drop here. Arrows were chosen on purpose. |
| 9 | Previous performance shown for exercises added outside the planned day | Implemented | The load step looks up past workouts by client + exercise, across both plan and improvised workouts. Limit: it only searches the last 50 completed sessions. |
| 10 | Muscle groups upper back / lats / lower back | Implemented | `MUSCLE_GROUPS` in `trainer.exercises.index.tsx` and `$exerciseId.tsx`. The database list of muscle groups includes `lats`. |
| 11 | Equipment: dumbbell, barbell, bodyweight, cable, machine, band (+ kettlebell) | Implemented | `EQUIPMENT_OPTIONS`, database `equipment_type` |
| 11b | Plate, suspension, other | Missing | Not in the database list or the screens |
| 12 | Full exercise names, not cut off | Still broken | `truncate` on the workout card name (SessionLogger ~590), the workout editor (`trainer.plans...trainings.$trainingId.tsx:367`) and the library (`trainer.exercises.index.tsx:349`). The picker shows full names. |
| 13 | Remove RPE | Not done | There's still an RPE column in the grid (~678, ~725), and it's still saved in `saveSet`. |
| 14 | Hide weight for bodyweight exercises | Not done | The weight box shows for every exercise except bands (~715-724). |
| 15 | Delete sessions | Implemented | `deleteSession`, plus a delete button in the trainer's client page list (`trainer.clients.$clientId.tsx:38/298`). Clients can delete only the workouts they started themselves (`canDelete`, matches the database rule). Trainers can delete any session of their own clients. |
| 16 | Close without saving | Implemented | Shown on unfinished workouts. Same delete path with a confirm. |
| 17 | Dropsets (D badge, numbering #1 #2 D #3) | Implemented | `workingSetNumber` in `src/lib/progress.ts`, badge menu, "Last time" label. Tests: `dropset.test.ts`, `progress.test.ts`. |

## Recommended minimal fixes (verified gaps only, awaiting your go-ahead)

1. **RPE (#13):** hide the RPE column from the logging grid and the "Last time" lines. Keep the saved RPE data, so nothing in the database changes.
2. **Bodyweight weight (#14):** when equipment is `bodyweight` and the exercise isn't assisted, hide the weight box. Keep any weight already saved on those sets. Open question: Standing Calf Raise is bodyweight with "weight optional". Should it keep the box?
3. **Full names (#12):** in the three places listed, let the name wrap onto more lines instead of being cut off.
4. **Typed numbers lost on refresh (#5):** also save each typed number about 600ms after the last keystroke, and save any unsaved fields when the page is hidden. Behavior otherwise stays the same.
5. **Picker taps (#7):** count a tap only if the finger moved less than about 8px, so ending a scroll doesn't add an exercise.
6. **Not proposed unless you confirm:** free "replace exercise" (#3) and the extra equipment types (#11b). The equipment types would be a database change: adding `plate`, `suspension` and `other` to the equipment list. It's purely additive, and I'd show you the database change before applying it.

## Verification and tests

- Phone-sized browser runs (360/390px) on test accounts only, separately for the client and the trainer path: picker scroll and tap, Finish button, typed number then refresh, reorder.
- New isolated tests: a pure test that bodyweight exercises hide the weight box (via a small helper in `progress.ts`); a test on test accounts that a typed number survives a reload without a field ever losing focus.
- The full suite must stay green (38 tests). No production data is touched and nothing is published.
