# Booking reminder emails (evening before, 6:00 PM)

## Blocker to resolve first: Resend is not connected

I checked the workspace connectors: there is **no Resend connection available to this project**, and I can't create one from here — it has to be created once in the workspace connector settings (Settings → Connectors → Resend), after which I can link it to this project and finish the wiring.

Also note: Resend only delivers to arbitrary recipients from a **domain you've verified in Resend**. You already own valhallafit.app, so verifying that domain and sending from e.g. `ValhallaFit <no-reply@valhallafit.app>` is the path. Until then, test sends only reach the Resend account owner's own address.

I can build everything else now and plug the key in once the connection exists.

## Assumptions (tell me if any are wrong)

- **Timezone:** the app has no server-side timezone today — every booking time is rendered in the viewer's browser local time. For a fixed server-side 6:00 PM cutoff I need one concrete zone, and I'll use **Europe/Vilnius** (the live trainer's zone). "Tomorrow" and "6:00 PM" are both evaluated in that zone.
- **Booking time source:** `bookings.start_at` / `end_at` (timestamptz), and only rows with `status <> 'cancelled'` are eligible.
- **Recipient:** the client's login email (from the auth records, read server-side with admin access — clients' emails aren't in `profiles`).
- **Names:** client and trainer names come from `profiles.full_name`.

## What gets built

### 1. Migration (additive, shown for review before applying)

```sql
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS bookings_reminder_pending_idx
  ON public.bookings (start_at)
  WHERE reminder_sent_at IS NULL;
```

One nullable column plus a partial index. No policy, table, function, or column is modified or dropped. Existing rows get `NULL`, which simply means "not reminded yet" — see the backfill note below.

### 2. Scheduled endpoint

New file `src/routes/api/public/hooks/booking-reminders.ts` (POST). It:

1. Rejects the call unless the `Authorization: Bearer <secret>` header matches a new project secret `CRON_SECRET`.
2. Computes "tomorrow" in Europe/Vilnius and checks that the current Vilnius time is at or past 18:00 the evening before — outside that window it returns `{ sent: 0, skipped: "before cutoff" }` and does nothing.
3. Selects bookings starting tomorrow with `status <> 'cancelled'` and `reminder_sent_at IS NULL`.
4. For each: claims it with a conditional update (`SET reminder_sent_at = now() WHERE id = ... AND reminder_sent_at IS NULL`) **before** sending. Only a row it actually claimed gets an email, so overlapping runs can never double-send.
5. Sends via the Resend connector gateway; on send failure it clears the claim so the next run retries.

Email body, plain text/simple HTML:

> Hi {client first name} — reminder: your session with {trainer name} is tomorrow, {weekday, date} at {HH:MM}.

### 3. Schedule

A `pg_cron` job every 30 minutes calling that endpoint on the stable production URL with the shared secret. 48 runs/day; each is a single indexed query that usually returns nothing. I'll set this up after the code is in and you've reviewed it.

## Backfill question (needs your call)

Existing future bookings all have `reminder_sent_at = NULL`, so any of them starting tomorrow would get a reminder on the first run. That's correct behaviour, just worth knowing. I'll check how many bookings exist in that window and report before scheduling anything.

## Not in scope

No settings screen, no opt-out, no digests, no trainer copy, no SMS/push, no cancellation notices, no UI changes anywhere.

## What I need from you

1. Create the Resend connection in workspace connector settings (and ideally verify valhallafit.app in Resend).
2. Confirm Europe/Vilnius as the fixed timezone.
3. Approve the migration diff above.
