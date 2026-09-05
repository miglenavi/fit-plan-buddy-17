import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduled job: send one reminder email per booking, to the client only,
 * from 18:00 (Europe/Vilnius) the evening before the session.
 *
 * Triggered by the `booking-reminders` pg_cron job (every 30 minutes), which
 * calls this endpoint with `Authorization: Bearer <CRON_SECRET>`.
 *
 * Idempotency: the row is "claimed" via a conditional update on
 * bookings.reminder_sent_at BEFORE the email is sent, so overlapping runs
 * can never double-send. On send failure the claim is released for retry.
 */

const TZ = "Europe/Vilnius";
const CUTOFF_HOUR = 18;
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM = "ValhallaFit <no-reply@valhallafit.app>";

type ZonedParts = { year: number; month: number; day: number; hour: number; minute: number };

function zonedParts(d: Date): ZonedParts {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(d)) if (part.type !== "literal") p[part.type] = part.value;
  return {
    year: Number(p["year"]),
    month: Number(p["month"]),
    day: Number(p["day"]),
    hour: Number(p["hour"] === "24" ? "0" : p["hour"]),
    minute: Number(p["minute"]),
  };
}

/** Offset (ms) of TZ at the given instant. */
function tzOffsetMs(d: Date): number {
  const p = zonedParts(d);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, d.getUTCSeconds());
  return asUtc - Math.floor(d.getTime() / 1000) * 1000;
}

/** Instant for a wall-clock time in TZ. */
function fromZoned(year: number, month: number, day: number, hour: number): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, 0, 0));
  const offset = tzOffsetMs(guess);
  return new Date(guess.getTime() - offset);
}

const fmtDateTime = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);

const firstName = (full: string | null | undefined) => (full ?? "").trim().split(/\s+/)[0] || "there";

async function sendEmail(to: string, subject: string, html: string, text: string) {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const resendKey = process.env["RESEND_API_KEY"];
  if (!lovableKey || !resendKey) {
    throw new Error("Email is not configured: missing LOVABLE_API_KEY or RESEND_API_KEY");
  }
  const res = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, text }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[booking-reminders] Resend failed [${res.status}]: ${body}`);
    throw new Error(`Resend request failed [${res.status}]: ${body}`);
  }
}

export const Route = createFileRoute("/api/public/hooks/booking-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["CRON_SECRET"];
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!secret || !token || token !== secret) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const now = new Date();
        const nowParts = zonedParts(now);
        if (nowParts.hour < CUTOFF_HOUR) {
          return Response.json({ sent: 0, skipped: "before cutoff" });
        }

        // "Tomorrow" in Europe/Vilnius, as an instant range.
        const todayStart = fromZoned(nowParts.year, nowParts.month, nowParts.day, 0);
        const from = new Date(todayStart.getTime() + 24 * 3600 * 1000);
        const toParts = zonedParts(from);
        const to = fromZoned(toParts.year, toParts.month, toParts.day + 1, 0);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: bookings, error } = await supabaseAdmin
          .from("bookings")
          .select("id, start_at, trainer_id, client_id, status")
          .is("reminder_sent_at", null)
          .neq("status", "cancelled")
          .gte("start_at", from.toISOString())
          .lt("start_at", to.toISOString())
          .order("start_at");

        if (error) {
          console.error("[booking-reminders] query failed", error);
          return Response.json({ error: error.message }, { status: 500 });
        }

        let sent = 0;
        const failures: string[] = [];

        for (const b of bookings ?? []) {
          // Claim first — only the run that flips NULL -> now() may send.
          const { data: claimed, error: claimErr } = await supabaseAdmin
            .from("bookings")
            .update({ reminder_sent_at: new Date().toISOString() })
            .eq("id", b.id)
            .is("reminder_sent_at", null)
            .select("id");
          if (claimErr || !claimed || claimed.length === 0) continue;

          try {
            const { data: user, error: uErr } = await supabaseAdmin.auth.admin.getUserById(b.client_id);
            const email = user?.user?.email;
            if (uErr || !email) throw new Error(`No email for client ${b.client_id}`);

            const { data: profiles } = await supabaseAdmin
              .from("profiles")
              .select("id, full_name")
              .in("id", [b.client_id, b.trainer_id]);
            const nameOf = (id: string) => profiles?.find((p) => p.id === id)?.full_name ?? null;

            const when = fmtDateTime(new Date(b.start_at));
            const trainer = nameOf(b.trainer_id) ?? "your coach";
            const text = `Hi ${firstName(nameOf(b.client_id))} — reminder: your session with ${trainer} is tomorrow, ${when}.`;

            await sendEmail(
              email,
              "Reminder: your training session is tomorrow",
              `<p>${text}</p>`,
              text,
            );
            sent++;
          } catch (e) {
            // Release the claim so the next run retries.
            await supabaseAdmin
              .from("bookings")
              .update({ reminder_sent_at: null })
              .eq("id", b.id);
            const msg = e instanceof Error ? e.message : String(e);
            console.error(`[booking-reminders] booking ${b.id}: ${msg}`);
            failures.push(b.id);
          }
        }

        return Response.json({ sent, failed: failures.length, candidates: bookings?.length ?? 0 });
      },
    },
  },
});
