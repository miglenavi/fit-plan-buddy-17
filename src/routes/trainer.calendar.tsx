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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { addDays, fmtWeekRange, weekStart } from "@/lib/week";
import { useAuth } from "@/lib/auth";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Plus, Repeat, Trash2, X } from "lucide-react";

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
const WEEKS_AHEAD = 12;

type Booking = {
  id: string;
  client_id: string;
  start_at: string;
  end_at: string;
  status: string;
  client_note: string | null;
  series_id: string | null;
};

type Availability = {
  id: string;
  is_recurring: boolean;
  day_of_week: number | null;
  specific_date: string | null;
  start_time: string;
  end_time: string;
};

type Series = {
  id: string;
  client_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  start_date: string;
  end_date: string | null;
  status: string;
};

type ClientRow = { client_id: string; full_name: string | null };

const fmtTime = (t: string) => t.slice(0, 5);
const fmtClock = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
const dateKey = (d: Date) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

function TrainerCalendar() {
  const [monday, setMonday] = useState(() => weekStart(new Date()));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [avail, setAvail] = useState<Availability[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [dow, setDow] = useState("1");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("12:00");
  const [busy, setBusy] = useState(false);

  // recurring booking form
  const [openSeries, setOpenSeries] = useState(false);
  const [sClient, setSClient] = useState("");
  const [sDow, setSDow] = useState("2");
  const [sStart, setSStart] = useState("18:00");
  const [sEnd, setSEnd] = useState("19:00");
  const [sFrom, setSFrom] = useState(() => dateKey(new Date()));
  const [sUntil, setSUntil] = useState("");
  const [savingSeries, setSavingSeries] = useState(false);
  const { isImpersonating } = useAuth();

  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);

  const load = useCallback(async () => {
    const from = new Date(`${monday}T00:00:00`);
    const to = addDays(from, 7);
    const [{ data: b, error: be }, { data: a }, { data: s }, { data: c }] = await Promise.all([
      supabase
        .from("bookings")
        .select(
          "id, client_id, start_at, end_at, status, client_note, series_id, profiles!bookings_client_id_fkey(full_name)",
        )
        .gte("start_at", from.toISOString())
        .lt("start_at", to.toISOString())
        .order("start_at"),
      supabase
        .from("trainer_availability")
        .select("id, is_recurring, day_of_week, specific_date, start_time, end_time")
        .order("start_time"),
      supabase
        .from("booking_series")
        .select("id, client_id, day_of_week, start_time, end_time, start_date, end_date, status")
        .order("day_of_week"),
      supabase
        .from("trainer_clients")
        .select("client_id, profiles!trainer_clients_client_profile_fk(full_name)")
        .is("archived_at", null),
    ]);
    if (be) toast.error(be.message);
    setBookings((b as unknown as Booking[]) ?? []);
    setAvail((a as Availability[]) ?? []);
    setSeries((s as Series[]) ?? []);
    setClients(
      ((c as any[]) ?? []).map((r) => ({ client_id: r.client_id, full_name: r.profiles?.full_name ?? null })),
    );
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

  const createSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sClient) return toast.error("Pick a client");
    if (sEnd <= sStart) return toast.error("End time must be after the start time");
    if (sUntil && sUntil < sFrom) return toast.error("End date must be after the start date");
    if (isImpersonating) {
      return toast.error("You're viewing as another user. Exit view-as mode to make changes.");
    }
    setSavingSeries(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setSavingSeries(false);
      return toast.error("Your session expired — please sign in again.");
    }
    const trainerId = u.user.id;

    const { data: created, error } = await supabase
      .from("booking_series")
      .insert({
        trainer_id: trainerId,
        client_id: sClient,
        day_of_week: Number(sDow),
        start_time: `${sStart}:00`,
        end_time: `${sEnd}:00`,
        start_date: sFrom,
        end_date: sUntil || null,
      })
      .select("id")
      .maybeSingle();

    if (error || !created) {
      setSavingSeries(false);
      return toast.error(error?.message ?? "Could not create the series");
    }

    // Materialize occurrences for the next ~12 weeks
    let cursor = new Date(`${sFrom}T00:00:00`);
    const want = Number(sDow);
    while (cursor.getDay() !== want) cursor = addDays(cursor, 1);
    const limit = addDays(new Date(`${sFrom}T00:00:00`), WEEKS_AHEAD * 7);
    const hardEnd = sUntil ? new Date(`${sUntil}T23:59:59`) : limit;
    const stopAt = hardEnd < limit ? hardEnd : limit;

    let made = 0;
    let skipped = 0;
    for (let d = cursor; d <= stopAt; d = addDays(d, 7)) {
      const key = dateKey(d);
      const startAt = new Date(`${key}T${sStart}:00`);
      const endAt = new Date(`${key}T${sEnd}:00`);
      if (startAt.getTime() < Date.now()) continue;
      const { error: bErr } = await supabase.from("bookings").insert({
        trainer_id: trainerId,
        client_id: sClient,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        series_id: created.id,
      });
      if (bErr) {
        if (/row-level security|permission/i.test(bErr.message)) {
          setSavingSeries(false);
          return toast.error(`Could not schedule sessions: ${bErr.message}`);
        }
        skipped++;
      } else made++;
    }

    setSavingSeries(false);
    setOpenSeries(false);
    toast.success(
      `Recurring booking created — ${made} session${made === 1 ? "" : "s"} scheduled${
        skipped ? `, ${skipped} skipped (slot already taken)` : ""
      }`,
    );
    load();
  };

  const cancelOccurrence = async (id: string) => {
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
    if (error) return toast.error(error.message);
    setCancelTarget(null);
    toast.success("Booking cancelled");
    load();
  };

  const cancelWholeSeries = async (seriesId: string) => {
    const { error: se } = await supabase
      .from("booking_series")
      .update({ status: "cancelled" })
      .eq("id", seriesId);
    if (se) return toast.error(se.message);
    const { error: be } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("series_id", seriesId)
      .eq("status", "booked")
      .gte("start_at", new Date().toISOString());
    if (be) return toast.error(be.message);
    setCancelTarget(null);
    toast.success("Recurring booking cancelled");
    load();
  };

  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(`${monday}T00:00:00`), i));
  const active = bookings.filter((b) => b.status !== "cancelled");
  const activeSeries = series.filter((s) => s.status === "active");
  const clientName = (id: string) => clients.find((c) => c.client_id === id)?.full_name ?? "Client";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground mt-1">
            Booked sessions across all your clients, and the hours you're open.
          </p>
        </div>
        <Dialog open={openSeries} onOpenChange={setOpenSeries}>
          <DialogTrigger asChild>
            <Button>
              <Repeat className="size-4 mr-1" /> New recurring booking
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New recurring booking</DialogTitle>
              <DialogDescription>
                A standing weekly slot for one client. Sessions are scheduled for the next {WEEKS_AHEAD} weeks;
                weeks that are already booked are skipped.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={createSeries} className="space-y-4">
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={sClient} onValueChange={setSClient}>
                  <SelectTrigger><SelectValue placeholder="Pick a client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.client_id} value={c.client_id}>
                        {c.full_name ?? "Client"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {clients.length === 0 && (
                  <p className="text-xs text-muted-foreground">You don't have any active clients yet.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Day</Label>
                <Select value={sDow} onValueChange={setSDow}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 0].map((i) => (
                      <SelectItem key={i} value={String(i)}>{DAYS[i]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sfrom">From</Label>
                  <Input id="sfrom" type="time" value={sStart} onChange={(e) => setSStart(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sto">To</Label>
                  <Input id="sto" type="time" value={sEnd} onChange={(e) => setSEnd(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sstartdate">Starts</Label>
                  <Input id="sstartdate" type="date" value={sFrom} onChange={(e) => setSFrom(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senddate">Ends (optional)</Label>
                  <Input id="senddate" type="date" value={sUntil} onChange={(e) => setSUntil(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={savingSeries || clients.length === 0}>
                  {savingSeries ? "Creating…" : "Create recurring booking"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="week">
        <TabsList>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="recurring">Recurring</TabsTrigger>
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
                const key = dateKey(d);
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
                            <div className="flex items-center gap-1 font-semibold">
                              {b.series_id && <Repeat className="size-3 shrink-0" aria-label="Recurring" />}
                              <span>{fmtClock(b.start_at)}–{fmtClock(b.end_at)}</span>
                            </div>
                            <div className="truncate">{b.profiles?.full_name ?? "Client"}</div>
                            {b.client_note && <div className="text-muted-foreground truncate">{b.client_note}</div>}
                            <button
                              onClick={() => (b.series_id ? setCancelTarget(b) : cancelOccurrence(b.id))}
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

        <TabsContent value="recurring" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Repeat className="size-4" /> Standing appointments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {activeSeries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No recurring bookings yet. Use “New recurring booking” to set a standing weekly slot for a client.
                </p>
              ) : (
                activeSeries.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                    <div className="flex-1">
                      <div className="font-medium">{clientName(s.client_id)}</div>
                      <div className="text-xs text-muted-foreground">
                        {DAYS[s.day_of_week]}s · {fmtTime(s.start_time)} – {fmtTime(s.end_time)} · from{" "}
                        {new Date(`${s.start_date}T00:00:00`).toLocaleDateString()}
                        {s.end_date ? ` until ${new Date(`${s.end_date}T00:00:00`).toLocaleDateString()}` : ""}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => cancelWholeSeries(s.id)}>
                      <X className="size-4 mr-1" /> Cancel series
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel recurring session</DialogTitle>
            <DialogDescription>
              This session is part of a standing weekly appointment. Cancel only this one, or the whole series
              (future sessions only — past ones stay untouched).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => cancelTarget && cancelOccurrence(cancelTarget.id)}>
              Just this occurrence
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelTarget?.series_id && cancelWholeSeries(cancelTarget.series_id)}
            >
              Cancel whole series
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
