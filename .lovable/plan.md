# Reset Migle's account + add password reset on login

## What will happen

1. Delete the `mig.navickaite@gmail.com` account fully (trainer link, role, profile, auth user). She can be re-invited later from the trainer's Clients page if needed.
2. Add a **"Forgot password?"** link under the Log in form on `/auth`.
   - Clicking it opens a small inline form asking for the email.
   - On submit, sends a password reset email via Supabase.
   - The existing invite/recovery handling on `/auth` already detects `type=recovery` in the URL hash, so when the user clicks the email link they land on `/auth` and see the "Set your password" form — no extra route needed.

## Technical details

- Data change: delete from `trainer_clients`, `user_roles`, `profiles`, `auth.users` where the user matches Migle's id.
- UI change in `src/routes/auth.tsx`:
  - Add `mode` state on the Login tab: `"signin" | "forgot"`.
  - Forgot form calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/auth" })`.
  - Toast confirms the email was sent; link to return to sign-in.
- No DB schema changes, no new routes, no new server functions.
