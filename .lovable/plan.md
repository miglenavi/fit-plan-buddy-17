
# ValhallaFit — User Flow Documentation

Read-only analysis of the current codebase. No code changes proposed.

---

## 1. User Roles

Roles are stored in `public.user_roles` (enum `app_role`: `trainer`, `client`, `super_admin`). Primary role precedence in `src/lib/auth.tsx`: `super_admin` > `trainer` > `client`. `super_admin` implicitly has trainer access (`RoleGuard`).

### Trainer / Coach
- Manage their own client roster (invite by email, view list, open client profile).
- Build a personal exercise library (CRUD on `exercises` they own; categorized via `exercise_categories`).
- Create workout plans (`plans`), add training days (`trainings`) to a plan, add exercises (`training_exercises`) to each training with target sets/reps/weight/rest/coach notes and optional alternative exercise.
- Assign a plan to one of their clients (`client_programs`) with start/end dates and status.
- Start and log a `training_sessions` on behalf of a client; edit set logs, add/remove sets, add/remove exercises mid-session.
- See recent sessions across all their clients (trainer dashboard).

### Client
- See their currently active assigned plan and its trainings on "Today".
- Start a session for any training in the active plan; resume an in-progress session.
- Log sets (`set_logs`): reps, weight, RPE, completed; add/remove sets; add/remove exercises mid-session; add `client_notes`; finish the session.
- View history of their own sessions and drill into a past session.
- Edit profile (full name) on `/client/profile`.

### Super Admin
- Review trainer applications (`trainer_applications`): approve (grants `trainer` role) or reject with reason.
- Invite trainers directly by email (skips application flow).
- Manage `exercise_categories`.
- Has trainer privileges too.

### "Pending" (no role yet)
- Signed-up trainer applicants whose application is `pending` or `rejected` land on `/pending`; can re-apply via `reapply_trainer` RPC.

---

## 2. Navigation Map

Sidebar in `AppShell` (trainer/admin) and top header in `ClientShell`. Groups shown depend on roles.

| Route | Purpose | Access |
| --- | --- | --- |
| `/` | Marketing landing; auto-redirects signed-in users by role | Public |
| `/auth` | Login / trainer apply / set-password (invite + forced change) | Public |
| `/pending` | "Application pending/rejected" screen with re-apply | Authenticated, no role |
| `/admin/applications` | Trainer application queue; invite trainer dialog | super_admin |
| `/admin/trainers` | Trainer directory | super_admin |
| `/admin/categories` | Exercise category CRUD | super_admin |
| `/trainer` | Dashboard (counts: clients/exercises/plans/sessions-7d, recent sessions) | trainer |
| `/trainer/clients` | Client list + invite client | trainer |
| `/trainer/clients/$clientId` | Client profile: assigned programs, sessions, resume/start session | trainer |
| `/trainer/clients/$clientId_/sessions/$sessionId` | Trainer-side session logger for that client | trainer |
| `/trainer/exercises` | Exercise library list + create | trainer |
| `/trainer/exercises/$exerciseId` | Exercise detail/edit | trainer |
| `/trainer/plans` | Plan list + create | trainer |
| `/trainer/plans/$planId` | Plan detail: name/desc, trainings list, assignments | trainer |
| `/trainer/plans/$planId_/trainings/$trainingId` | Training day detail: add/edit exercises with targets | trainer |
| `/client` | Today: active program, trainings, resume/start | client |
| `/client/history` | All sessions grouped by month | client |
| `/client/sessions/$sessionId` | Client-side session logger | client |
| `/client/profile` | Edit own profile | client |
| `/clients`, `/trainers` | Legacy/auxiliary list routes (still in tree) | varies |

The `RoleGuard` component also enforces a forced "set new password" detour when `user_metadata.must_change_password` is true (typical for trainer-invited clients).

---

## 3. Main User Flows

For each: starting point → goal → screens → actions → tables touched → success → edge cases.

### 3.1 Trainer signs up / logs in
- **Start**: `/` → "Sign in / Apply" → `/auth`.
- **Goal**: Get into the trainer area.
- **Screens**: `/auth` (Login tab or Apply tab).
- **Actions**:
  - Apply: `supabase.auth.signUp` with `user_metadata.role="trainer"`, optional note → `handle_new_user` trigger inserts a row in `trainer_applications` (status `pending`). No role granted yet.
  - Login: `signInWithPassword`. After auth, `AuthPage` redirects by role.
- **DB**: `auth.users`, `profiles` (via trigger), `trainer_applications`, later `user_roles` (after super-admin approval via `approve_trainer` RPC).
- **Success**: Trainer redirected to `/trainer` once `trainer` role exists.
- **Edges**: Application rejected → `/pending` with re-apply (`reapply_trainer` RPC). Email confirmation behavior depends on Supabase project settings.

### 3.2 Trainer invites / adds a client
- **Start**: `/trainer/clients` → "Invite client" dialog.
- **Goal**: Create a client account linked to this trainer.
- **Screens**: `/trainer/clients` (list + dialog).
- **Actions**: Calls `inviteClient` server fn → `supabaseAdmin.auth.admin.inviteUserByEmail` with `invited_as=client`, `invited_by=trainer.id`, `must_change_password=true`. `handle_new_user` creates `profiles`, assigns `client` role, and inserts into `trainer_clients`. Resend uses `resendClientInvite`.
- **DB**: `auth.users`, `profiles`, `user_roles`, `trainer_clients`.
- **Success**: Client appears in the trainer's client list; client gets invite email; on first login they're forced through `/auth` set-password.
- **Edges**: There is also a legacy `link_client_by_email` RPC that links an *existing* client account by email (not used in current UI). Invite email delivery failures aren't surfaced in UI beyond toast.

### 3.3 Trainer creates a workout plan
- **Start**: `/trainer/plans` → "New plan".
- **Goal**: Create an empty plan to populate.
- **Screens**: `/trainer/plans` → redirects to `/trainer/plans/$planId`.
- **Actions**: Insert into `plans` (trainer_id = auth.uid, status `draft|active`). Inline auto-save of name/description on the detail page.
- **DB**: `plans`.
- **Success**: Plan appears in the list and on the detail page.

### 3.4 Trainer adds training days to the plan
- **Start**: `/trainer/plans/$planId` → "Add training".
- **Goal**: Define a workout day within the plan (e.g. "Push", "Pull").
- **Screens**: Plan detail.
- **Actions**: Insert into `trainings` (`plan_id`, `order_index`, name).
- **DB**: `trainings`.
- **Success**: Training row appears with link into its detail page.

### 3.5 Trainer adds exercises to a training day
- **Start**: `/trainer/plans/$planId_/trainings/$trainingId`.
- **Goal**: Populate the day's exercises with target prescription.
- **Screens**: Training detail.
- **Actions**: Pick exercise + optional alternative from `exercises` (grouped by `exercise_categories`), set sets / reps_min / reps_max / weight / rest / coach notes → insert into `training_exercises`. Inline edit + delete on the list. Name/description auto-save on the training itself.
- **DB**: `training_exercises`, `exercises` (read), `exercise_categories` (read).
- **Success**: Exercise row appended in `order_index` order.
- **Edges**: No reordering UI; target weight is optional.

### 3.6 Trainer assigns a plan to a client
- **Start**: `/trainer/plans/$planId` or `/trainer/clients/$clientId` → `AssignPlanDialog`.
- **Goal**: Activate the plan for a specific client.
- **Actions**: Insert into `client_programs` (`trainer_id`, `client_id`, `plan_id`, `start_date`, optional `end_date`, `status` typically `active`). Trainer-of relationship enforced via `is_trainer_of` RLS + `trainer_clients`.
- **DB**: `client_programs`.
- **Success**: Program shows under the client and the client's "Today" view picks it up.
- **Edges**: Multiple active programs possible — `/client` picks the most recent `active` program (`order by start_date desc limit 1`); others are effectively hidden.

### 3.7 Client logs in
- **Start**: Invite email link → `/auth` with recovery/invite hash, or `/auth` direct login.
- **Goal**: Set password (first time) then reach `/client`.
- **Screens**: `/auth` (set-password form if invite or `must_change_password`).
- **Actions**: `updateUser({ password })`, then `clearMustChangePassword` server fn flips the flag → `refreshSession` → redirect by role to `/client`.
- **DB**: `auth.users.user_metadata`.
- **Success**: Lands on `/client`.

### 3.8 Client sees assigned workout plan
- **Start**: `/client`.
- **Goal**: See today's plan and choose a training to do.
- **Screens**: `/client` (Today).
- **Actions**: Read active `client_programs` (limit 1) → list its `trainings`. Also detect any in-progress `training_sessions` to surface a "Resume" CTA. Shows date of last completed session.
- **DB**: `client_programs`, `trainings`, `training_sessions` (read).
- **Edges**: No active program → empty state.

### 3.9 Client starts a workout session
- **Start**: `/client` → "Start" on a training.
- **Goal**: Begin logging a session for that training.
- **Actions**: `startSession` server fn — if an `in_progress` session for (client, training) already exists, return its id; else insert into `training_sessions` with `status=in_progress`, `logged_by=client`, then snapshot `training_exercises` rows into `session_exercises` (copying targets and notes). Navigates to `/client/sessions/$sessionId`.
- **DB**: `training_sessions` (insert), `session_exercises` (insert).
- **Edges**: Idempotent on repeat clicks (resume-or-create).

### 3.10 Client logs exercise results
- **Start**: `/client/sessions/$sessionId` (or trainer route counterpart).
- **Goal**: Record sets, manage exercise list, complete session.
- **Screens**: `SessionLogger` component.
- **Actions**:
  - For each `session_exercises` row, an array of sets pre-filled to `target_sets`; trainee enters reps/weight/RPE, toggles `completed`, blur or change triggers upsert on `set_logs` (`onConflict: session_exercise_id,set_index`).
  - "Add set" appends a row locally; saves on first edit.
  - "Remove set" deletes the `set_logs` row (if persisted) and trims the local array.
  - "Add exercise" dialog searches `exercises` and inserts a new `session_exercises` row (default 3×8–12).
  - "Remove exercise" deletes the `session_exercises` row (cascades to its `set_logs`).
  - "Last time" reference: looks up previous completed sessions for same (client, training, exercise) and shows reps/weight.
  - "Finish" sets `status=completed` and `completed_at=now()` on the session.
- **DB**: `session_exercises` (insert/delete), `set_logs` (upsert/delete), `training_sessions` (update on finish), `exercises` (read for picker).
- **Edges**: `prevent_session_client_tampering` trigger restricts what a client can change on `training_sessions`; client can't edit `trainer_notes` or reassign session.

### 3.11 Trainer logs / completes a session on behalf of the client
- **Start**: `/trainer/clients/$clientId` → "Start session" on a training, or "Resume".
- **Goal**: Same as client flow, but `logged_by=trainer`, `trainer_id=auth.uid`.
- **Screens**: `/trainer/clients/$clientId_/sessions/$sessionId` (renders the same `SessionLogger`).
- **Actions / DB**: Identical to 3.9 + 3.10. RLS via `is_trainer_of` allows the trainer to write to that client's session/exercises/sets.
- **Success**: Session appears in client history and on trainer dashboard's recent sessions.

### 3.12 Trainer reviews client progress
- **Start**: `/trainer` (recent sessions) or `/trainer/clients/$clientId` (per-client list, up to 20).
- **Goal**: See activity and outcomes.
- **Screens**: Trainer dashboard, client detail page.
- **Actions**: Read-only listing of `training_sessions` with joined `trainings.name` and client name.
- **DB**: `training_sessions`, `trainings`, `profiles`.
- **Gaps**: No per-exercise progression chart, no PRs view, no aggregate metrics — just a list.

### 3.13 Client reviews workout history / progress
- **Start**: `/client/history`.
- **Screens**: History list grouped by month → tap a row to open `/client/sessions/$sessionId`.
- **DB**: `training_sessions` (and via the session page, `session_exercises` + `set_logs`).
- **Gaps**: No charts, PRs, volume trends; the session page itself is the logger so reviewing past sessions opens the same editable UI.

---

## 4. Current Issues

### Broken / inconsistent
- **`/clients` and `/trainers` orphan routes**: Top-level routes exist (`src/routes/clients.tsx`, `trainers.tsx`) that don't appear in the sidebar; likely legacy. Either remove or wire up.
- **Past sessions are editable**: Tapping a completed session in History opens the same `SessionLogger`. A client can modify historical set logs and even mark a session as in-progress again indirectly. No read-only "session summary" view.
- **No reordering** of trainings within a plan or exercises within a training; `order_index` is set on insert only.
- **Multiple active programs** per client are allowed at the DB level but the client UI only surfaces the most recent. Trainer can silently shadow a plan.
- **No "remove client"** UI from `trainer_clients`. Once linked, the relationship is permanent through the UI.
- **Forced password change** depends on `user_metadata.must_change_password`. If an admin edits user metadata, or the resend flow's metadata write fails, the user can bypass the set-password screen.

### Confusing
- **Pending vs rejected** both land on `/pending` — the reject reason is visible but the path naming suggests only "awaiting review".
- **Dashboard "Sessions / 7d"** counts sessions started by the trainer's account globally (no scoping to their own clients via RLS in the UI query — relies on RLS to scope; if a super_admin views, the number is platform-wide).
- **Session "Finish" is one-way in UI** but DB allows status changes; no warning if there are uncompleted sets.

### Duplicated
- `SessionLogger` is shared correctly between trainer and client routes (good), but the two route files (`client.sessions.$sessionId.tsx`, `trainer.clients.$clientId_.sessions.$sessionId.tsx`) duplicate the framing.
- "Start session" logic is implemented as a server function (`startSession`) and called from both client and trainer pages — good. No drift.

### Incomplete
- **Progress / analytics**: schema supports rich tracking (RPE, weight per set, history) but no progression charts, PR detection, volume summary, or comparison-to-last-session beyond an inline "Last time" snippet.
- **Programming structure**: no concept of weeks, mesocycles, or scheduled dates per training. `client_programs.start_date`/`end_date` exist but aren't used for scheduling.
- **Plan status**: `plans.status` and `client_programs.status` are free-form text and not enforced consistently in queries.
- **Notifications**: none — no in-app activity feed, no email on session completion.
- **Client-side ability to leave session notes** is present in the schema (`client_notes`) but I didn't see a dedicated UI surface for it in the logger flow visible from my pass.
- **Exercise media**: `exercise-media` storage bucket exists and is public; image_url/video_url fields exist on `exercises`; uploader UI may be partial.

### Inconsistent with DB
- `session_exercises` snapshots from `training_exercises` at session creation, which is correct for immutability — but mid-session "Add exercise" creates a `session_exercises` row with hardcoded defaults (3 × 8–12), ignoring any "trainer default" preferences and never linking back to `training_exercises`. This is intentional per `.lovable/plan.md` but worth surfacing.
- `set_logs` are pre-seeded in memory to `target_sets` but not persisted until edited; "remove set" on an unsaved set silently disappears without confirmation.

---

## 5. MVP Recommendation

The minimum set that must work flawlessly for an honest MVP:

1. **Auth & role assignment**
   - Trainer apply → super admin approve → trainer role granted.
   - Trainer invites client → client sets password → lands on `/client`.
2. **Plan authoring**
   - Trainer creates a plan, adds 1+ trainings, adds 1+ exercises with targets.
3. **Plan assignment**
   - Trainer assigns plan to a client; client sees it on `/client`.
4. **Session logging (client path)**
   - Client starts a session, logs sets, finishes; data persists; history shows it.
5. **Session logging (trainer path)**
   - Trainer starts/resumes a session for a client and finishes it; appears in both views.
6. **Read-only review**
   - Client can open a past session and see what was done (consider a non-editing variant).
   - Trainer can see a client's recent sessions list.

Defer for post-MVP: progression charts, plan scheduling/weeks, reordering, exercise media uploads, in-app messaging/notifications, multiple-active-plan handling, public marketing analytics.

Hardening must-fix before MVP launch:
- Lock down editability of completed sessions, or fork a read-only view.
- Decide and enforce single-active-program semantics.
- Add a "remove client" / archive flow.
- Confirmation when finishing a session with incomplete sets.

---

## 6. Mermaid Diagrams

### 6.1 Trainer creates and assigns a workout plan

```text
flowchart TD
  A[Trainer at /trainer/plans] -->|New plan| B[Insert into plans]
  B --> C[Open /trainer/plans/:planId]
  C -->|Add training| D[Insert into trainings]
  D --> E[Open /trainer/plans/:planId/trainings/:trainingId]
  E -->|Add exercise with targets| F[Insert into training_exercises]
  F --> G{More exercises?}
  G -- Yes --> E
  G -- No --> H[Back to plan detail]
  H -->|Assign plan| I[AssignPlanDialog picks client]
  I --> J[Insert into client_programs status=active]
  J --> K[Client sees plan on /client]
```

### 6.2 Client completes a workout

```text
flowchart TD
  A[Client at /client Today] --> B{Active program?}
  B -- No --> Z[Empty state]
  B -- Yes --> C[Pick training and tap Start]
  C --> D[startSession server fn]
  D --> E{In-progress exists?}
  E -- Yes --> F[Return existing session id]
  E -- No --> G[Insert training_sessions logged_by=client]
  G --> H[Snapshot training_exercises into session_exercises]
  F --> I[Navigate to /client/sessions/:id]
  H --> I
  I --> J[Log sets: upsert set_logs per set]
  J --> K[Optional: add/remove sets or exercises]
  K --> L[Tap Finish]
  L --> M[Update training_sessions status=completed completed_at=now]
  M --> N[Visible in /client/history]
```

### 6.3 Trainer completes a session for the client

```text
flowchart TD
  A[Trainer at /trainer/clients/:clientId] --> B{Resume available?}
  B -- Yes --> C[Tap Resume]
  B -- No --> D[Tap Start on a training]
  C --> E[Navigate to trainer session route]
  D --> F[startSession server fn logged_by=trainer trainer_id=auth.uid]
  F --> G[Insert training_sessions + snapshot session_exercises]
  G --> E
  E --> H[SessionLogger writes set_logs upserts]
  H --> I[Add/remove exercises or sets as needed]
  I --> J[Tap Finish -> training_sessions completed]
  J --> K[Appears in trainer dashboard and client history]
```

