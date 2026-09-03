import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { ClientShell } from "@/components/ClientShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { addDays } from "@/lib/week";
import { CalendarClock, CalendarX2, Check } from "lucide-react";

export const Route = createFileRoute("/client/book")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Book a session — ValhallaFit" },
      { name: "description", content: "Pick an open slot in your coach's schedule and book your next training session." },
      { property: "og:title", content: "Book a session — ValhallaFit" },
      {
        property: "og:description",
        content: "Pick an open slot in your coach's schedule and book your next training session.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGuard role="client">
      <ClientShell title="Book a session">
        <BookSession />
      </ClientShell>
    </RoleGuard>
  ),
});

const SLOT_MINUTES = 60;
const DAYS_AHEAD = 14;

type Availability = {
  id: string;
  is_recurring: boolean;
  day_of_week: number | null;
  specific_date: string | null;
  start_time: string;
  end_time: string;
};

type Booking = { id: string; start_at: string; end_at: string; status: string; series_id: string | null };
type Slot = { start: Date; end: Date; taken: boolean };

const dateKey = (d: Date) => d.toISOString().slice(0, 10);
const clock = (d: Date) => d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

function buildSlots(avail: Availability[], busy: { start_at: string; end_at: string }[]): Slot[] {
  const now = Date.now();
  const out: Slot[] = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const day = addDays(new Date(), i);
    const key = dateKey(day);
    const blocks = avail.filter((a) =>
      a.is_recurring ? a.day_of_week === day.getDay() : a.specific_date === key,
    );
    for (const b of blocks) {
      let cursor = new Date(`${key}T${b.start_time}`);
      const blockEnd = new Date(`${key}T${b.end_time}`);
      while (cursor.getTime() + SLOT_MINUTES * 60000 <= blockEnd.getTime()) {
        const slotEnd = new Date(cursor.getTime() + SLOT_MINUTES * 60000);
        if (cursor.getTime() > now) {
          const taken = busy.some(
            (x) => new Date(x.start_at).getTime() < slotEnd.getTime() && new Date(x.end_at).getTime() > cursor.getTime(),
          );
          out.push({ start: cursor, end: slotEnd, taken });
        }
        cursor = slotEnd;
      }
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

function BookSession() {
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [trainerName, setTrainerName] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [mine, setMine] = useState<Booking[]>([]);
  const [picked, setPicked] = useState<Slot | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: link } = await supabase
      .from("trainer_clients")
      .select("trainer_id, profiles:trainer_id(full_name)")
      .is("archived_at", null)
      .limit(1);

    const tid = (link?.[0] as any)?.trainer_id ?? null;
    setTrainerId(tid);

    const { data: myBookings } = await supabase
      .from("bookings")
      .select("id, start_at, end_at, status, series_id")
      .gte("start_at", new Date().toISOString())
      .order("start_at");
    setMine(((myBookings as Booking[]) ?? []).filter((b) => b.status !== "cancelled"));

    if (tid) {
      const from = new Date();
      const to = addDays(from, DAYS_AHEAD);
      const [{ data: avail }, { data: trainer }, { data: busySlots }] = await Promise.all([
        supabase
          .from("trainer_availability")
          .select("id, is_recurring, day_of_week, specific_date, start_time, end_time")
          .eq("trainer_id", tid),
        supabase.from("profiles").select("full_name").eq("id", tid).maybeSingle(),
        supabase.rpc("trainer_busy_slots", {
          _trainer_id: tid,
          _from: from.toISOString(),
          _to: to.toISOString(),
        }),
      ]);
      setTrainerName(trainer?.full_name ?? null);
      setSlots(buildSlots((avail as Availability[]) ?? [], (busySlots as any[]) ?? []));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const book = async () => {
    if (!picked || !trainerId) return;
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("bookings").insert({
      trainer_id: trainerId,
      client_id: u.user!.id,
      start_at: picked.start.toISOString(),
      end_at: picked.end.toISOString(),
      client_note: note.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Session booked");
    setPicked(null);
    setNote("");
    load();
  };

  const cancel = async (id: string) => {
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Booking cancelled");
    load();
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (!trainerId) {
    return (
      <Card>
        <CardContent className="p-5 space-y-3">
          <p className="text-sm text-muted-foreground">
            You need a connected coach before you can book sessions.
          </p>
          <Button asChild size="sm"><Link to="/client/trainer">Find a trainer</Link></Button>
        </CardContent>
      </Card>
    );
  }

  const byDay = slots.reduce<Record<string, Slot[]>>((acc, s) => {
    const k = dateKey(s.start);
    (acc[k] ||= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {mine.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4" /> Your upcoming sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {mine.map((b) => (
              <div key={b.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                <div className="flex-1">
                  <div className="font-medium">
                    {new Date(b.start_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {clock(new Date(b.start_at))} – {clock(new Date(b.end_at))}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => cancel(b.id)}>
                  <CalendarX2 className="size-4 mr-1" /> Cancel
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Open slots{trainerName ? ` with ${trainerName}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.keys(byDay).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Your coach hasn't published any availability yet. Check back soon.
            </p>
          ) : (
            Object.entries(byDay).map(([day, list]) => (
              <div key={day} className="space-y-2">
                <div className="text-sm font-medium">
                  {new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <div className="flex flex-wrap gap-2">
                  {list.map((s) => {
                    const isPicked = picked?.start.getTime() === s.start.getTime();
                    return (
                      <button
                        key={s.start.toISOString()}
                        type="button"
                        disabled={s.taken}
                        onClick={() => setPicked(s)}
                        className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                          s.taken
                            ? "opacity-40 line-through cursor-not-allowed"
                            : isPicked
                              ? "border-primary bg-primary/10 font-medium"
                              : "hover:border-primary/60"
                        }`}
                      >
                        {clock(s.start)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          {picked && (
            <div className="space-y-3 rounded-lg border border-primary/50 bg-primary/5 p-4">
              <div className="text-sm font-medium">
                {picked.start.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })} ·{" "}
                {clock(picked.start)} – {clock(picked.end)}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bnote">Note for your coach (optional)</Label>
                <Textarea id="bnote" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <Button className="w-full" disabled={busy} onClick={book}>
                <Check className="size-4 mr-1" /> {busy ? "Booking…" : "Confirm booking"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
