import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { ClientShell } from "@/components/ClientShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Calendar, Play } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { weekStart, addDays, fmtWeekRange } from "@/lib/week";

export const Route = createFileRoute("/client/")({
  ssr: false,
  component: () => <RoleGuard role="client"><ClientShell title="This week"><ClientToday /></ClientShell></RoleGuard>,
});

function ClientToday() {
  const { fullName } = useAuth();
  const thisWeek = weekStart(new Date());
  const nextWeek = addDays(thisWeek, 7).toISOString().slice(0, 10);
  const [current, setCurrent] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [legacy, setLegacy] = useState<any[]>([]); // old date-based assignments

  useEffect(() => {
    (async () => {
      const [{ data: w }, { data: n }, { data: l }] = await Promise.all([
        supabase.from("assigned_workouts")
          .select("id, status, completed_at, scheduled_date, week_start_date, workout_plan_id, workout_plans(name, description)")
          .eq("week_start_date", thisWeek)
          .order("workout_plan_id"),
        supabase.from("assigned_workouts")
          .select("id, week_start_date, workout_plans(name)")
          .eq("week_start_date", nextWeek)
          .order("workout_plan_id"),
        supabase.from("assigned_workouts")
          .select("id, status, scheduled_date, workout_plans(name, description)")
          .is("week_start_date", null)
          .eq("scheduled_date", new Date().toISOString().slice(0, 10)),
      ]);
      setCurrent(w ?? []); setUpcoming(n ?? []); setLegacy(l ?? []);
    })();
  }, [thisWeek, nextWeek]);

  const all = [...current, ...legacy];
  const done = all.filter((x) => x.status === "completed").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hey{fullName ? `, ${fullName.split(" ")[0]}` : ""} 👋</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{fmtWeekRange(thisWeek)}</p>
      </div>

      {all.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">This week's progress</span>
              <span className="text-sm tabular-nums">{done} / {all.length}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${all.length ? (done / all.length) * 100 : 0}%` }} />
            </div>
          </CardContent>
        </Card>
      )}

      <section>
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 px-1">Workouts to do</h2>
        {all.length === 0 ? (
          <Card><CardContent className="p-5 text-sm text-muted-foreground text-center">
            No program assigned yet. Your trainer will set one up soon 🌿
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {all.map((t) => (
              <Card key={t.id} className={t.status === "completed" ? "border-primary/40 bg-primary/5" : ""}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-lg">{t.workout_plans?.name}</div>
                      {t.workout_plans?.description && (
                        <p className="text-sm text-muted-foreground mt-1">{t.workout_plans.description}</p>
                      )}
                      {t.status === "completed" && t.completed_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Done {new Date(t.completed_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                        </p>
                      )}
                    </div>
                    {t.status === "completed" && <CheckCircle2 className="size-5 text-primary shrink-0" />}
                  </div>
                  <div className="mt-4">
                    {t.status === "completed" ? (
                      <Link to="/client/workouts/$assignedId" params={{ assignedId: t.id }} className="text-sm text-primary underline">
                        Review
                      </Link>
                    ) : (
                      <Link to="/client/workouts/$assignedId" params={{ assignedId: t.id }} className="block">
                        <Button className="w-full" size="lg">
                          {t.status === "in_progress" ? <><Play className="size-4 mr-1" /> Resume</> : <>Start workout <ArrowRight className="size-4 ml-1" /></>}
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {upcoming.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 px-1 flex items-center gap-1.5">
            <Calendar className="size-3.5" /> Next week
          </h2>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y">
                {upcoming.map((u) => (
                  <li key={u.id} className="px-4 py-3 flex justify-between items-center">
                    <span className="font-medium text-sm">{u.workout_plans?.name}</span>
                    <span className="text-xs text-muted-foreground">{fmtWeekRange(u.week_start_date)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
