## Problem

When a trainer invites a client, the invite email link signs the user in via Supabase, but on first visit the "Set your password" form only appears when the URL hash still contains `type=invite`. If the hash gets consumed or the client navigates anywhere else (homepage, role redirect, refresh), they end up at `/auth` as a logged-out-looking screen with no password and can't sign in.

The codebase already has a `must_change_password` flag concept (`AuthPage` reads it, `clearMustChangePassword` clears it, `RoleGuard` redirects to `/auth` while it's true), but `inviteClient` never sets it.

## Fix

1. **`src/lib/clients.functions.ts` — `inviteClient`**: include `must_change_password: true` in the invited user's `user_metadata`. This way, even after the invite hash is consumed and the user lands elsewhere, `AuthPage` shows the "Set your password" form, and `RoleGuard` keeps redirecting back there until they set one.

2. **`src/lib/clients.functions.ts` — `resendClientInvite`**: before generating the new magic link, call `supabaseAdmin.auth.admin.updateUserById` to re-set `must_change_password: true`. Safe because the resend button is for clients who haven't activated; if they already chose a password they wouldn't need a resend, and even if they do, they'll set a fresh one through the same flow.

3. **`src/routes/index.tsx`**: if `user.user_metadata.must_change_password` is true, render `<Navigate to="/auth" />` instead of routing to `/client`/`/trainer`. The homepage currently auto-routes authenticated users by role, which bypasses the password-set screen for invited clients who happen to land on `/`.

## Out of scope

- No change to `AuthPage`, `RoleGuard`, or `clearMustChangePassword` — they already do the right thing once the flag is set.
- No change to the invite email template or Supabase redirect allow-list.
- No change to the trainer-invite UI.
