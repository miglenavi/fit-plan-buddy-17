# Temporary password flow for new clients

## Goal

When a trainer adds a client, the app creates the account directly with a generated temporary password. The trainer sees the password in the app and shares it with the client out‑of‑band (WhatsApp, in person, etc.). The client logs in with email + temp password and is prompted to set a new one.

## Trainer experience

1. Trainer clicks **Add client** and enters the client's email + name.
2. App creates the account immediately (no invite email) and shows a one‑time dialog:
   - Client email
   - Temporary password (with copy button)
   - Note: "Share this with your client. They'll set their own password on first login."
3. The temporary password is also visible later on the client's row in the trainer's client list, with a **Reset password** action that generates a new temp password (in case the client lost it).
   - Shown only until the client logs in and sets their own password — after that it disappears.

## Client experience

1. Client goes to `/auth`, enters email + temp password, logs in.
2. After login, if their account is still flagged as "must change password", they are redirected to a **Set your password** screen before they can use the app.
3. Once they set a new password, the flag is cleared and the trainer no longer sees the temp password.

## Technical details

- New table `client_temp_passwords` (trainer_id, client_id, temp_password, must_change boolean, created_at). RLS: only the owning trainer can read/insert/update; client cannot read it.
- Server function `createClientWithTempPassword({ email, fullName })`:
  - Auth: trainer only.
  - Uses `supabaseAdmin.auth.admin.createUser` with `email_confirm: true`, a generated 12‑char password, and `user_metadata: { invited_as: 'client', invited_by: trainer_id, must_change_password: true }`.
  - The existing `handle_new_user` trigger already assigns the `client` role and links to the trainer when `invited_as = 'client'`.
  - Inserts a row into `client_temp_passwords`.
  - Returns the temp password to the trainer.
- Server function `resetClientTempPassword({ clientId })`:
  - Auth: trainer only, must own the client.
  - Generates a new password, calls `supabaseAdmin.auth.admin.updateUserById`, upserts `client_temp_passwords`, sets `must_change = true`.
- Server function `clearMustChangePassword()`:
  - Auth: authenticated user. Deletes the caller's row from `client_temp_passwords`.
  - Called by the client after they successfully set a new password on the Profile page.
- UI changes:
  - Update the existing "Add client" form on the trainer's client list to call the new server function and show the result in a dialog with a copy button.
  - Show the temp password on each client row when present, with a **Reset password** button.
  - On client login, gate the app behind a "Set your password" screen while `must_change_password` is true (read from `client_temp_passwords` existence via a small server function), then call `clearMustChangePassword` after the password update succeeds.

## Out of scope

- Email sending (the current invite/recovery email problem is sidestepped entirely).
- Branded email templates (can be revisited later).
