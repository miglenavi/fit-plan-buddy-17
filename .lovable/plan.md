
# Add & remove exercises during a session

Let both the client (logging their own session) and the trainer (logging for a client) tweak the exercise list mid-session — swap in something else, drop one that's not happening today, etc. The original training template is untouched; changes only affect this one session.

## UX (in `SessionLogger`)

- **Remove**: each exercise card gets a small "Remove" action in its expanded view, with a confirm prompt ("Remove this exercise from today's session?"). Deletes the `session_exercises` row (and its `set_logs` via FK cascade). No undo.
- **Add**: a "+ Add exercise" button at the bottom of the exercise list (above the Finish bar) opens a dialog with:
  - search input over `exercises` (name contains)
  - list of matches; tap one to add
  - the new row is appended with `order_index = max+1`, `target_sets = 3`, `target_reps_min/max = 8/12`, no target weight, `training_exercise_id = null`
- Reloads the session list after add/remove. Nothing else in the flow changes.

## Backend

One migration to relax the client INSERT/UPDATE check on `session_exercises`. Today's `WITH CHECK` requires the new row's `exercise_id` to come from a `training_exercises` row in the client's assigned plan, which blocks ad-hoc additions. Replacement check: the session belongs to the caller (`s.client_id = auth.uid()`) — same as the USING clause. The exercise itself is still constrained by the existing SELECT policy on `exercises`.

Trainer policy already permits add/remove for their clients' sessions; no change.

No new tables, no new server functions — direct supabase calls from `SessionLogger` (consistent with how set logs are already saved).

## Technical notes

- File touched: `src/components/SessionLogger.tsx` (both `/client/sessions/$sessionId` and `/trainer/clients/$clientId_/sessions/$sessionId` render it, so both roles get the feature for free).
- New shadcn `Dialog` for the picker; reuse existing `Input`/`Button`.
- Delete: `supabase.from('session_exercises').delete().eq('id', se.id)`.
- Insert: `supabase.from('session_exercises').insert({ session_id, exercise_id, order_index, target_sets: 3, target_reps_min: 8, target_reps_max: 12 })`.
- `set_logs.session_exercise_id` already has `ON DELETE CASCADE` (verified at the FK level — if not, the migration adds it).

## Out of scope

- Editing target sets/reps/weight on existing session exercises (separate request).
- Reordering exercises.
- Changing the underlying plan/training template.
