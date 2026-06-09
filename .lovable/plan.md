## Plan: optional alternative ("or") exercise

Add a lightweight way for trainers to attach a second exercise to a slot, shown as "A or B". Keep the UI minimal — no new sections, no prominent controls.

### 1. Database
Add one nullable column to `training_exercises`:
- `alternative_exercise_id uuid` → references `exercises(id)` on delete set null

Mirror on `session_exercises` so the choice carries into a started session. No new tables, no RLS changes.

### 2. Trainer UI — `trainer.plans.$planId_.trainings.$trainingId.tsx`
- Add-exercise form: a single extra dropdown squeezed into the existing grid, labeled "Or (optional)". No new card, no separate section.
- Existing rows: just append `· or <Alt name>` to the small muted meta line under the exercise name. No edit affordance in this pass — to change the alternative the trainer removes and re-adds the row (keeps UI footprint zero).

### 3. Client session UI
- `client.sessions.$sessionId.tsx`: if a slot has an alternative, show the name as `Primary or Alternative` (plain text, same style). No picker UI — both names visible, client logs against the primary as today. Keeping this purely informational for now.

### 4. Server
- `startSession` (`src/lib/sessions.functions.ts`): include `alternative_exercise_id` in the snapshot insert.

### Out of scope
- No superset, no 3+ alternatives, no per-row edit popover, no client-side "which one did I do?" tracking.

### Technical details
- Migrations: `ALTER TABLE training_exercises ADD COLUMN alternative_exercise_id uuid REFERENCES exercises(id) ON DELETE SET NULL;` and same on `session_exercises`.
- Trainer load query: add `alternative:exercises!training_exercises_alternative_exercise_id_fkey(name)` to the existing select.
