# Multi-trainer with super-admin approval

Move from "single trainer" to a model where trainers self-register but stay inactive until a super admin approves them.

## Roles

- `super_admin` — approver. Can ALSO hold the `trainer` role and manage clients/plans/workouts like any trainer. Seeded manually.
- `trainer` — approved coach. Manages their own clients/plans/workouts.
- `client` — added by an approved trainer.

A pending trainer signup does NOT receive the `trainer` role yet. The application lives in `trainer_applications` with status `pending`. Approval grants the role.

## Auth flow

```text
Apply as trainer  ──►  trainer_applications (pending)
                       no role yet
                       login lands on /pending

Super admin opens /admin/applications
   ├─ Approve  ──►  insert user_roles(role='trainer'), status='approved'
   └─ Reject   ──►  status='rejected', reason saved
                    user sees rejection screen with "Re-apply" button
                    → resets row to pending (same user, new note)

Client signup is disabled. Trainers add clients from /trainer/clients.
```

## Database changes

- Add `'super_admin'` to the `app_role` enum.
- New table `trainer_applications`:
  - `user_id` (unique, FK to auth.users)
  - `full_name`, `email`, `note`
  - `status` text: `pending | approved | rejected`
  - `rejection_reason`, `reviewed_by`, `reviewed_at`
- Drop the "only one trainer" guard in `handle_new_user`. New behavior:
  - role `trainer` from signup metadata → insert into `trainer_applications` (status `pending`); do NOT touch `user_roles`
  - role `client` from signup metadata → insert role as before
  - role `super_admin` from signup metadata is ignored (seeded only)
- New SECURITY DEFINER RPCs:
  - `approve_trainer(_user_id uuid)` — super_admin only
  - `reject_trainer(_user_id uuid, _reason text)` — super_admin only
  - `reapply_trainer(_note text)` — authenticated user with a rejected application resets it to pending
- RLS:
  - `trainer_applications`: applicant reads/updates own row (for reapply note); super_admin reads/updates all
  - Existing trainer policies remain — they key off `user_roles.role='trainer'`, which only exists post-approval
- `trainer_exists()` RPC removed.

## Frontend changes

- `/auth`: Login + "Apply as trainer" tabs always visible. Client signup stays disabled.
- New `/pending` route: shown when logged-in user has no trainer/super_admin role.
  - Status `pending` → "Application under review."
  - Status `rejected` → shows reason + "Re-apply" button (optionally edit note) → calls `reapply_trainer`.
- New super-admin area:
  - `/admin/applications` — pending list with Approve / Reject (+ reason input).
  - `/admin/trainers` — approved trainers (optional revoke later).
- `RoleGuard` extended to accept `super_admin`. Super admin sees BOTH admin nav and trainer nav (since they can also coach).
- AppShell nav adapts by role set.

## Email notifications

In-app notifications are skipped (only email).

- On **approval**: send email to applicant ("You're approved — log in").
- On **rejection**: send email to applicant with reason and a link back to `/pending` to re-apply.
- Uses Lovable's built-in app emails (no third-party). Triggered from the approve/reject RPC handlers via the `send-transactional-email` route.
- Two React Email templates: `trainer-approved`, `trainer-rejected`.

If the project does not yet have an email domain set up, that's a one-time setup step the user does in the email setup dialog before the emails can send (the app will still work; sends just queue/fail silently until DNS verifies).

## Seeding the first super admin

After this ships, sign up normally with the email you want as super admin. I then run a one-off insert that grants `super_admin` to that user. Since super admins can also be trainers, I'll also grant `trainer` on the same user if you want to coach from that account — tell me yes/no.

You currently have one trainer account from the previous setup. After the migration that account keeps its `trainer` role (we only remove the one-trainer guard, not existing data), so nothing breaks.
