# Fix client invite flow: branded email with visible button

## Problem

The default invite/recovery emails sometimes render with an invisible or hard‑to‑see button (especially in dark‑mode Gmail). When the invited client does click the link, they are auto‑logged in with no password — they have no idea how to log back in later.

## Recommended fix

Set up **custom branded auth email templates** on a verified email domain. This gives:

- An invite email with a clearly visible, branded "Set your password" button.
- A matching password reset email with the same clear button.
- Consistent rendering across Gmail (light + dark), Outlook, Apple Mail.

The existing flow already works correctly once the user lands on `/auth`:
- The invite/recovery hash is captured synchronously, so the user sees the **Set your password** screen instead of being silently logged in.
- The Profile page already lets a logged‑in client change their password.
- The login page already has a **Forgot password?** link.

So the only remaining gap is the email itself.

## Steps

1. Set up an email sender domain (one‑time setup dialog — user picks the domain, adds DNS records).
2. Scaffold branded auth email templates (invite, recovery, magic link, etc.) using the app's color palette so the CTA button is always clearly visible.
3. Templates activate automatically once DNS verifies; progress is visible in Cloud → Emails.

No app code changes needed beyond the template files themselves.

## Alternative (if you don't want to set up a domain)

Switch to a **temporary password** flow:

- When a trainer adds a client, generate a random temporary password and create the account directly (no invite email).
- Show the trainer the temp password + client email in a one‑time dialog to share manually (WhatsApp, in person, etc.).
- Client logs in with email + temp password, is forced to set a new password on first login (already supported by the Profile page).

Trade‑offs:
- No reliance on email rendering at all.
- Trainer has to share the password out‑of‑band.
- Slightly more code: a server function to create the user with a temp password and the "force change on first login" gate.

## Recommendation

Go with **option 1 (branded emails)** — it's the proper long‑term fix, requires no manual password sharing, and also fixes the password‑reset email at the same time.
