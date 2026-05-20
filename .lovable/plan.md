# Multi-trainer with super-admin approval

Move from "single trainer" to a model where trainers self-register but stay inactive until a super admin approves them.

## Roles

- `super_admin` — one (or few) accounts that approve trainers. Seeded manually.
- `trainer` — approved coach. Can manage their own clients/plans/workouts.
- `client` — added by an approved trainer.

A pending trainer signup does NOT receive the `trainer` role yet. Instead it lives in a `trainer_applications` table with status `pending`. Approval grants the role.

## Auth flow

```text
Signup as trainer  ──►  trainer_applications (pending)
                        user has NO role yet
                        login lands on /pending screen

Super admin opens /admin/applications
   ├─ Approve  ──►  insert user_roles(role='trainer'), status='approved'
   └─ Reject   ──►  status='rejected', user sees rejection screen

Client signup is disabled. Trainer adds clients from /trainer/clients
(existing link_client_by_email RPC).
```

## Database changes

- Add `'super_admin'` to the `app_role` enum.
- New table `trainer_applications`:
  - `user_id` (unique, FK to auth.users)
  - `full_name`, `email`, `note`
  - `status` text: `pending | approved | rejected`
  - `reviewed_by`, `reviewed_at`
- Drop the "only one trainer" guard in `handle_new_user`. New behavior:
  - role `client` → insert role as before (still only via trainer RPC in practice)
  - role `trainer` → DO NOT insert into `user_roles`; insert into `trainer_applications` with status `pending`
  - role `super_admin` from signup metadata is ignored (seeded only)
- New RPCs (SECURITY DEFINER):
  - `approve_trainer(_user_id uuid)` — super_admin only; inserts trainer role, marks approved
  - `reject_trainer(_user_id uuid, _reason text)` — super_admin only
- RLS:
  - `trainer_applications`: applicant can read own row; super_admin can read/update all
  - Existing trainer policies stay (they key off `user_roles.role='trainer'`, which only exists post-approval)
- `trainer_exists()` RPC is removed (no longer needed).

## Frontend changes

- `/auth`: always shows Login + "Apply as trainer" tabs. Client signup stays disabled.
- New `/pending` route: shown when logged-in user has no role and has a pending/rejected application. Polls or refreshes on auth change.
- New super-admin area `/admin`:
  - `/admin/applications` — list pending applications with Approve / Reject buttons
  - `/admin/trainers` — list approved trainers (optional revoke)
- `RoleGuard` extended to accept `super_admin`. AppShell nav switches based on role:
  - super_admin → Applications, Trainers
  - trainer → existing trainer nav
  - client → existing client nav
- Rename "Claim trainer" copy to "Apply as trainer". Update tagline.

## Seeding the first super admin

After this ships, sign up normally with your email, then I run a one-off insert that adds the `super_admin` role to your user. You'll need to tell me which email is the super admin (can be a brand-new account or reuse the trainer one you already created — in which case I'll also grant trainer to keep both capabilities, or strip the trainer role, your call).

## Open questions for you

1. Should the super admin also be allowed to act as a trainer (manage clients/plans), or strictly an approver?
2. Should rejected trainers be able to re-apply, or is reject final?
3. Do you want an email notification on approval, or is in-app status enough for now?
