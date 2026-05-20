import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, CheckCircle2, Clock, X, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { weekStart, weeksBetween, fmtWeekRange, addDays } from "@/lib/week";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export const Route = createFileRoute("/trainer/clients/$clientId")({
  ssr: false,
  component: () => <RoleGuard role="trainer"><AppShell><ClientDetail /></AppShell></RoleGuard>,
});

function ClientDetail() {
  const { clientId } = useParams({ from: "/trainer/clients/$clientId" });
  const [profile, setProfile] = useState<any>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  // assign-program form
  const [startDate, setStartDate] = useState(weekStart(new Date()));
  const [weeks, setWeeks] = useState(8);
  const [picked, setPicked] = useState<string[]>([]); // workout_plan_ids in slot order
  const [pickSel, setPickSel] = useState("");

  const load = async () => {
    const [{ data: p }, { data: pr }, { data: pw }, { data: a }, { data: pl }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", clientId).maybeSingle(),
      supabase.from("client_programs").select("*").eq("client_id", clientId).order("start_date", { ascending: false }),
      supabase.from("program_workouts").select("*, workout_plans(name)"),
      supabase.from("assigned_workouts")
        .select("id, scheduled_date, status, week_start_date, completed_at, program_id, workout_plan_id, workout_plans(name)")
        .eq("client_id", clientId).order("week_start_date", { ascending: false, nullsFirst: false }),
      supabase.from("workout_plans").select("id, name"),
    ]);
    // attach program_workouts to programs
    const byProgram = new Map<string, any[]>();
    (pw ?? []).forEach((row: any) => {
      if (!byProgram.has(row.program_id)) byProgram.set(row.program_id, []);
      byProgram.get(row.program_id)!.push(row);
    });
    const enriched = (pr ?? []).map((prog) => ({ ...prog, workouts: (byProgram.get(prog.id) ?? []).sort((a, b) => a.slot - b.slot) }));
    setProfile(p); setPrograms(enriched); setAssignments(a ?? []); setPlans(pl ?? []);

    // logs for progression chart (only completed workouts with logs)
    const assignedIds = (a ?? []).map((x: any) => x.id);
    if (assignedIds.length) {
      const { data: lg } = await supabase.from("exercise_logs")
        .select("exercise_id, actual_reps, actual_weight, completed, assigned_workout_id, exercises(name), updated_at")
        .in("assigned_workout_id", assignedIds)
        .eq("completed", true);
      setLogs(lg ?? []);
    } else setLogs([]);
  };
  useEffect(() => { load(); }, [clientId]);

  const addPick = () => {
    if (!pickSel) return;
    setPicked((p) => [...p, pickSel]);
    setPickSel("");
  };
  const removePick = (i: number) => setPicked((p) => p.filter((_, idx) => idx !== i));

  const createProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (picked.length === 0) return toast.error("Add at least one workout");
    const { data: u } = await supabase.auth.getUser();
    const trainerId = u.user!.id;
    const start = weekStart(startDate);
    const end = addDays(start, weeks * 7 - 1).toISOString().slice(0, 10);

    const { data: program, error: pErr } = await supabase.from("client_programs").insert({
      trainer_id: trainerId, client_id: clientId, start_date: start, end_date: end, status: "active",
    }).select("id").single();
    if (pErr || !program) return toast.error(pErr?.message ?? "Failed to create program");

    const pwRows = picked.map((wp, idx) => ({ program_id: program.id, workout_plan_id: wp, slot: idx + 1 }));
    const { error: pwErr } = await supabase.from("program_workouts").insert(pwRows);
    if (pwErr) return toast.error(pwErr.message);

    // Materialize assigned_workouts for every (slot × week)
    const allWeeks = weeksBetween(start, end);
    const awRows: any[] = [];
    for (const wk of allWeeks) {
      for (const wp of picked) {
        awRows.push({
          trainer_id: trainerId, client_id: clientId, workout_plan_id: wp,
          program_id: program.id, week_start_date: wk, scheduled_date: null, status: "pending",
        });
      }
    }
    const { error: aErr } = await supabase.from("assigned_workouts").insert(awRows);
    if (aErr) return toast.error(aErr.message);

    toast.success(`Program created — ${picked.length} workouts × ${weeks} weeks`);
    setOpen(false); setPicked([]); setWeeks(8);
    load();
  };

  const endProgram = async (id: string) => {
    if (!confirm("End this program? Future weeks will be removed.")) return;
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from("client_programs").update({ status: "ended", end_date: today }).eq("id", id);
    // Remove future pending assignments
    await supabase.from("assigned_workouts").delete().eq("program_id", id).eq("status", "pending").gt("week_start_date", weekStart(new Date()));
    load();
  };

  // ---- Weekly completion grid (last 8 weeks) ----
  const grid = useMemo(() => {
    const weeks: string[] = [];
    let cur = new Date(weekStart(new Date()));
    for (let i = 0; i < 8; i++) { weeks.unshift(cur.toISOString().slice(0, 10)); cur = addDays(cur, -7); }
    const inWeeks = assignments.filter((a) => a.week_start_date && weeks.includes(a.week_start_date));
    return weeks.map((wk) => {
      const items = inWeeks.filter((a) => a.week_start_date === wk);
      const done = items.filter((a) => a.status === "completed").length;
      return { week: wk, total: items.length, done, items };
    });
  }, [assignments]);

  // ---- Per-exercise progression ----
  const exerciseSeries = useMemo(() => {
    const byEx = new Map<string, { name: string; points: { date: string; weight: number | null; reps: number | null; sortKey: number }[] }>();
    logs.forEach((l: any) => {
      const id = l.exercise_id;
      if (!byEx.has(id)) byEx.set(id, { name: l.exercises?.name ?? "Exercise", points: [] });
      // find scheduled / completed date from assignment
      const aw = assignments.find((a) => a.id === l.assigned_workout_id);
      const dateStr = aw?.completed_at?.slice(0, 10) || aw?.scheduled_date || aw?.week_start_date || l.updated_at?.slice(0, 10);
      byEx.get(id)!.points.push({
        date: dateStr,
        weight: l.actual_weight != null ? Number(l.actual_weight) : null,
        reps: l.actual_reps != null ? Number(l.actual_reps) : null,
        sortKey: new Date(dateStr).getTime(),
      });
    });
    return Array.from(byEx.entries()).map(([id, v]) => {
      const points = v.points.sort((a, b) => a.sortKey - b.sortKey);
      // diagnose status
      const last = points[points.length - 1];
      const prev = points[points.length - 2];
      let status: "up" | "down" | "flat" | "stale" = "flat";
      if (prev && last) {
        const lastVol = (last.weight ?? 0) * (last.reps ?? 0);
        const prevVol = (prev.weight ?? 0) * (prev.reps ?? 0);
        if (lastVol > prevVol) status = "up";
        else if (lastVol < prevVol) status = "down";
      }
      // stagnation: no improvement vs max in last 30d
      const cutoff = Date.now() - 30 * 86400e3;
      const recent = points.filter((p) => p.sortKey >= cutoff);
      if (recent.length >= 2) {
        const maxRecent = Math.max(...recent.map((p) => (p.weight ?? 0) * (p.reps ?? 0)));
        const first = recent[0];
        if (maxRecent <= (first.weight ?? 0) * (first.reps ?? 0)) status = status === "down" ? "down" : "stale";
      }
      return { id, name: v.name, points, status };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [logs, assignments]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{profile?.full_name ?? "Client"}</h1>
          <p className="text-muted-foreground mt-1">Programs & progress</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="size-4 mr-1" /> Assign program</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign a weekly program</DialogTitle></DialogHeader>
            <form onSubmit={createProgram} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start (Monday of week)</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Duration (weeks)</Label>
                  <Input type="number" min={1} max={52} value={weeks} onChange={(e) => setWeeks(+e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Workouts per week</Label>
                <div className="flex gap-2">
                  <Select value={pickSel} onValueChange={setPickSel}>
                    <SelectTrigger><SelectValue placeholder="Pick a workout plan…" /></SelectTrigger>
                    <SelectContent>
                      {plans.map((pl) => <SelectItem key={pl.id} value={pl.id}>{pl.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" onClick={addPick} disabled={!pickSel}>Add</Button>
                </div>
                {picked.length > 0 && (
                  <ul className="space-y-1 mt-2">
                    {picked.map((wp, i) => {
                      const pl = plans.find((p) => p.id === wp);
                      return (
                        <li key={i} className="flex items-center justify-between text-sm bg-accent/40 rounded px-3 py-1.5">
                          <span><span className="font-semibold mr-2">#{i + 1}</span>{pl?.name}</span>
                          <Button type="button" size="icon" variant="ghost" onClick={() => removePick(i)}><X className="size-4" /></Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p className="text-xs text-muted-foreground">Client does these {picked.length || "N"} workouts on any day each week, for {weeks} weeks.</p>
              </div>
              <Button type="submit" className="w-full" disabled={picked.length === 0}>Create program</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active programs */}
      <Card>
        <CardHeader><CardTitle>Programs</CardTitle></CardHeader>
        <CardContent>
          {programs.length === 0 ? (
            <p className="text-muted-foreground text-sm">No programs yet.</p>
          ) : (
            <ul className="divide-y">
              {programs.map((p) => (
                <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">
                      {p.workouts.length} workouts/week
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${p.status === "active" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {p.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(p.start_date).toLocaleDateString()} → {new Date(p.end_date).toLocaleDateString()} ·{" "}
                      {p.workouts.map((w: any) => w.workout_plans?.name).join(", ")}
                    </div>
                  </div>
                  {p.status === "active" && (
                    <Button size="sm" variant="outline" onClick={() => endProgram(p.id)}>End</Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Weekly completion grid */}
      <Card>
        <CardHeader><CardTitle>Last 8 weeks</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-8 gap-2">
            {grid.map((g) => {
              const pct = g.total === 0 ? 0 : g.done / g.total;
              const bg = g.total === 0
                ? "bg-muted/40"
                : pct === 1 ? "bg-primary text-primary-foreground"
                : pct >= 0.5 ? "bg-primary/50"
                : pct > 0 ? "bg-amber-500/40"
                : "bg-destructive/30";
              return (
                <div key={g.week} className={`rounded-md p-2 text-center text-xs ${bg}`} title={fmtWeekRange(g.week)}>
                  <div className="font-semibold">{g.done}/{g.total || "–"}</div>
                  <div className="opacity-70">{new Date(g.week).toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}</div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-3 flex-wrap">
            <span className="flex items-center gap-1"><span className="size-2.5 rounded bg-primary" /> All done</span>
            <span className="flex items-center gap-1"><span className="size-2.5 rounded bg-amber-500/60" /> Partial</span>
            <span className="flex items-center gap-1"><span className="size-2.5 rounded bg-destructive/40" /> Missed</span>
          </div>
        </CardContent>
      </Card>

      {/* Per-exercise progression */}
      <Card>
        <CardHeader><CardTitle>Exercise progression</CardTitle></CardHeader>
        <CardContent>
          {exerciseSeries.length === 0 ? (
            <p className="text-muted-foreground text-sm">No completed exercises logged yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {exerciseSeries.map((ex) => {
                const data = ex.points.map((p) => ({
                  date: new Date(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
                  weight: p.weight, reps: p.reps,
                }));
                const Icon = ex.status === "up" ? TrendingUp : ex.status === "down" ? TrendingDown : ex.status === "stale" ? AlertTriangle : Minus;
                const color = ex.status === "up" ? "text-primary" : ex.status === "down" ? "text-destructive" : ex.status === "stale" ? "text-amber-500" : "text-muted-foreground";
                return (
                  <div key={ex.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-sm">{ex.name}</div>
                      <div className={`flex items-center gap-1 text-xs ${color}`}>
                        <Icon className="size-3.5" />
                        {ex.status === "up" ? "Progressing"
                          : ex.status === "down" ? "Regressed"
                          : ex.status === "stale" ? "Stagnant 30d"
                          : "Steady"}
                      </div>
                    </div>
                    <div className="h-28">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                          <XAxis dataKey="date" hide />
                          <YAxis tick={{ fontSize: 10 }} width={30} />
                          <Tooltip contentStyle={{ fontSize: 12 }} />
                          <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} />
                          <Line type="monotone" dataKey="reps" stroke="hsl(var(--muted-foreground))" strokeWidth={1} dot={false} strokeDasharray="3 3" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Last: {ex.points[ex.points.length - 1]?.reps ?? "–"} reps
                      {ex.points[ex.points.length - 1]?.weight != null ? ` @ ${ex.points[ex.points.length - 1].weight}kg` : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent activity */}
      <Card>
        <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-muted-foreground text-sm">No workouts assigned yet.</p>
          ) : (
            <ul className="divide-y">
              {assignments.slice(0, 15).map((a) => (
                <li key={a.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.workout_plans?.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.week_start_date ? `Week of ${fmtWeekRange(a.week_start_date)}` : a.scheduled_date ? new Date(a.scheduled_date).toLocaleDateString() : "—"}
                      {a.completed_at ? ` · done ${new Date(a.completed_at).toLocaleDateString()}` : ""}
                    </div>
                  </div>
                  <span className="text-xs flex items-center gap-1 px-2 py-1 rounded-full bg-secondary capitalize">
                    {a.status === "completed" ? <CheckCircle2 className="size-3 text-primary" /> : <Clock className="size-3" />}
                    {a.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
