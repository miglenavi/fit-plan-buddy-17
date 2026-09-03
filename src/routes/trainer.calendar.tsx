import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { addDays, fmtWeekRange, weekStart } from "@/lib/week";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Plus, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/trainer/calendar")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Calendar & availability — ValhallaFit" },
      {
        name: "description",
        content: "See every client booking for the week and set the hours you are open for sessions.",
      },
      { property: "og:title", content: "Calendar & availability — ValhallaFit" },
      {
        property: "og:description",
        content: "See every client booking for the week and set the hours you are open for sessions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGuard role="trainer">
      <AppShell>
        <TrainerCalendar />
      </AppShell>
    </RoleGuard>
  ),
});

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Booking = {
  id: string;
  client_id: string;
  start_at: string;
  end_at: string;
  status: string;
  client_note: string | null;
  profiles?: { full_name: string | null } | null;
};

type Availability = {
  id: string;
  is_recurring: boolean;
  day_of_week: number | null;
  specific_date: string | null;
  start_time: string;
  end_time: string;
};

const fmtTime = (t: string) => t.slice(0, 5);
const fmtClock = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

function TrainerCalendar() {
  const [monday, setMonday] = useState(() => weekStart(new Date()));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [avail, setAvail] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);

  const [dow, setDow] = useState("1");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("12:00");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const from = new Date(`${monday}T00:00:00`);
    const to = addDays(from, 7);
    const [{ data: b, error: be }, { data: a }] = await Promise.all([
      supabase
        .from("bookings")
        .select("id, client_id, start_at, end_at, status, client_note, profiles!bookings_client_id_fkey(full_name)")
        .gte("start_at", from.toISOString())
        .lt("start_at", to.toISOString())
        .order("start_at"),
      supabase
        .from("trainer_availability")
        .select("id, is_recurring, day_of_week, specific_date, start_time, end_time")
        .order("start_time"),
    ]);
    if (be) toast.error(be.message);
    setBookings((b as unknown as Booking[]) ?? []);
    setAvail((a as Availability[]) ?? []);
    setLoading(false);
  }, [monday]);

  useEffect(() => {
    load();
  }, [load]);

  const addBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (end <= start) return toast.error("End time must be after the start time");
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("trainer_availability").insert({
      trainer_id: u.user!.id,
      is_recurring: true,
      day_of_week: Number(dow),
      start_time: `${start}:00`,
      end_time: `${end}:00`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Availability added");
    load();
  };

  const removeBlock = async (id: string) => {
    const { error } = await supabase.from("trainer_availability").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setAvail((prev) => prev.filter((x) => x.id !== id));
  };

  const cancelBooking = async (id: string) => {
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Booking cancelled");
    load();
  };

  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(`${monday}T00:00:00`), i));
  const active = bookings.filter((b) => b.status !== "cancelled");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
        <p className="text-muted-foreground mt-1">Booked sessions across all your clients, and the hours you're open.</p>
      </div>

      <Tabs defaultValue="week">
        <TabsList>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
        </TabsList>

        <TabsContent value="week" className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Previous week" onClick={() => setMonday(weekStart(addDays(monday, -7)))}>
              <ChevronLeft className="size-4" />
            </Button>
            <div className="flex-1 text-center font-medium">{fmtWeekRange(monday)}</div>
            <Button variant="outline" size="icon" aria-label="Next week" onClick={() => setMonday(weekStart(addDays(monday, 7)))}>
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMonday(weekStart(new Date()))}>Today</Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-7">
              {days.map((d) => {
                const key = d.toISOString().slice(0, 10);
                const dayBookings = active.filter((b) => new Date(b.start_at).toDateString() === d.toDateString());
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <Card key={key} className={isToday ? "border-primary/60" : "border-border/60"}>
                    <CardContent className="p-3 space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {d.toLocaleDateString(undefined, { weekday: "short" })}{" "}
                        <span className={isToday ? "text-primary" : ""}>{d.getDate()}</span>
                      </div>
                      {dayBookings.length === 0 ? (
                        <p className="text-xs text-muted-foreground/70">—</p>
                      ) : (
                        dayBookings.map((b) => (
                          <div key={b.id} className="rounded-lg bg-primary/10 p-2 text-xs space-y-1">
                            <div className="font-semibold">{fmtClock(b.start_at)}–{fmtClock(b.end_at)}</div>
                            <div className="truncate">{b.profiles?.full_name ?? "Client"}</div>
                            {b.client_note && <div className="text-muted-foreground truncate">{b.client_note}</div>}
                            <button
                              onClick={() => cancelBooking(b.id)}
                              className="inline-flex items-center gap-1 text-muted-foreground hover:text-destructive"
                            >
                              <X className="size-3" /> Cancel
                            </button>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="availability" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Plus className="size-4" /> Add a weekly time block
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addBlock} className="grid gap-3 sm:grid-cols-4 sm:items-end">
                <div className="space-y-2">
                  <Label>Day</Label>
                  <Select value={dow} onValueChange={setDow}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 0].map((i) => (
                        <SelectItem key={i} value={String(i)}>{DAYS[i]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from">From</Label>
                  <Input id="from" type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="to">To</Label>
                  <Input id="to" type="time" value={end} onChange={(e) => setEnd(e.target.value)} required />
                </div>
                <Button type="submit" disabled={busy}>{busy ? "Adding…" : "Add block"}</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="size-4" /> Your weekly hours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {avail.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No availability yet. Add blocks above and your clients can book those slots.
                </p>
              )}
              {[1, 2, 3, 4, 5, 6, 0].map((i) => {
                const rows = avail.filter((a) => a.is_recurring && a.day_of_week === i);
                if (rows.length === 0) return null;
                return (
                  <div key={i} className="space-y-2">
                    <div className="text-sm font-medium">{DAYS[i]}</div>
                    <ul className="space-y-1">
                      {rows.map((a) => (
                        <li key={a.id} className="flex items-center gap-2 text-sm rounded-md border px-3 py-2">
                          <Clock className="size-4 text-muted-foreground" />
                          <span className="flex-1">{fmtTime(a.start_time)} – {fmtTime(a.end_time)}</span>
                          <Button variant="ghost" size="icon" aria-label="Remove block" onClick={() => removeBlock(a.id)}>
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
