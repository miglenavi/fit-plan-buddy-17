## Goal

Produce a single, comprehensive documentation file that explains how plans, trainings, exercises, assignments, and sessions currently work in ValhallaFit — purely analysis, no code or schema changes.

## Deliverable

A new Markdown document, downloadable as an artifact:

- Path: `/mnt/documents/ValhallaFit_Plans_and_Sessions.md`
- Also surfaced via `<presentation-artifact>` so you can open/download it from chat.

The existing high-level doc (`/mnt/documents/ValhallaFit_User_Flows.md`) stays untouched — this new file is a deep-dive on the plan/training/session subsystem only.

## Document structure

1. **Conceptual model** — plain-language definition of: Plan, Training / training day, Exercise (library vs in-plan), Training exercise (with sets/reps/weight/rest/notes/alternative), Client program, Training session, Session exercise, Set logs.
2. **Database relationships** — for each of the 8 tables (`plans`, `trainings`, `exercises`, `training_exercises`, `client_programs`, `training_sessions`, `session_exercises`, `set_logs`): what it stores, key columns, parent/child links, who can create/update/delete (derived from current RLS policies — e.g. `Trainer manages own plans`, `Client views assigned plans`, `is_trainer_of`, `prevent_session_client_tampering`, etc.), cascade behavior on delete.
3. **Current trainer flow** — step-by-step: create plan → add trainings → add exercises with targets/alternatives → assign to client → start/log session. For each step: route, component, tables touched, success state, edge cases (e.g. auto-save on plan/training name, multiple active programs allowed at DB level but auto-archived by `deactivate_other_active_programs` trigger).
4. **Current client flow** — step-by-step: see active program → list trainings → start/resume → snapshot into `session_exercises` → log `set_logs` → finish → appears in history. Per step: route, component, tables, success, edges (resume-or-create idempotency, read-only after completion, "Next up" suggestion logic).
5. **Important product rules** — answers to each of the 11 rule questions, citing the current behavior in code/DB (multiple trainings per plan: yes; multiple active plans: DB allows but trigger archives others; plan edits after assignment: affect templates but completed sessions are immutable snapshots; mid-session add/remove: yes; trainer + client both log: yes; completed = read-only via `forceReadOnly`/status check; no weeks/scheduling; no reorder UI; exercise deletion impact on snapshots).
6. **Current gaps and risks** — concrete confusion/blocker list for a real trainer.
7. **Recommended MVP rules** — opinionated answers to each of the 9 MVP questions.
8. **Suggested improved UX** — concrete suggestions per screen (plan list, plan detail, training detail, add-exercise flow, assignment, client Today, session logger, completed summary).
9. **Mermaid diagrams** — five diagrams: data model, assignment model, session model, trainer flow, client flow.
10. **Open product decisions** — prioritized list of decisions to make before any refactor.
11. Recommended changes to improve the current flow

After documenting how the system currently works, please add a final section called “Recommended Changes”.

In this section, identify what should be improved to make the plan/training/exercise/session flow easier and safer for a real trainer to use.

Please group recommendations into:

A. Must fix before trainer can use this confidently  
Focus on blockers or risks that could confuse the trainer or damage workout history.

Examples to evaluate:

- completed sessions being editable vs read-only
- unclear active plan assignment
- multiple active plans / archived plans behavior
- client seeing the wrong or unexpected workout
- lack of clear session summary
- unclear plan/training/exercise hierarchy

B. Should improve soon for usability  
Focus on improvements that make plan creation faster and clearer.

Examples to evaluate:

- reordering training days inside a plan
- reordering exercises inside a training
- duplicating a training day
- duplicating an exercise row
- clearer exercise cards with sets, reps, weight, rest, notes, and alternative exercise
- better empty states
- clearer plan assignment confirmation

C. Can wait until after MVP  
Focus on things that are valuable but not needed immediately.

Examples to evaluate:

- advanced analytics
- progression charts
- PR detection
- weeks / mesocycles / calendar scheduling
- notifications
- exercise videos or media uploads
- full plan templates marketplace

For every recommended change, include:

- current problem
- why it matters for a real trainer
- suggested MVP behavior
- affected routes/components/tables
- risk level: high / medium / low
- implementation complexity estimate: small / medium / large
- whether it requires schema changes or can be done with existing structure

Please keep recommendations practical and focused on stabilizing the existing MVP, not adding a large new feature set.

## Sources used

- Routes: `trainer.plans.$planId.tsx`, `trainer.plans.$planId_.trainings.$trainingId.tsx`, `trainer.clients.$clientId.tsx`, `client.index.tsx`, both session routes.
- Components: `SessionLogger`, `AssignPlanDialog`.
- Server functions: `sessions.functions.ts` (`startSession`).
- DB: live schema + RLS policies for the 8 tables, plus triggers/functions (`deactivate_other_active_programs`, `prevent_session_client_tampering`, `is_trainer_of`, `is_plan_owned_by_trainer`, `is_plan_assigned_to_client`, `is_training_assigned_to_client`).

## Out of scope

- No code changes.
- No schema or RLS changes.
- No edits to the existing `ValhallaFit_User_Flows.md`.
- No new features, refactors, or migrations.