import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { ClientShell } from "@/components/ClientShell";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, ChevronRight } from "lucide-react";
import { fmtWeekRange } from "@/lib/week";

export const Route = createFileRoute("/client/history")({
  ssr: false,
  component: () => <RoleGuard role="client"><ClientShell title="History"><History /></ClientShell></RoleGuard>,
});

function monthLabel(d: string) {
  return new Date(d).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function History() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("assigned_workouts")
        .select("id, scheduled_date, week_start_date, completed_at, status, workout_plans(name)")
        .order("completed_at", { ascending: false, nullsFirst: false });
      setItems(data ?? []);
    })();
  }, []);

  const sortKey = (a: any) => a.completed_at || a.scheduled_date || a.week_start_date || "";
  const sorted = [...items].sort((a, b) => sortKey(b).localeCompare(sortKey(a)));

  const groups = sorted.reduce<Record<string, any[]>>((acc, it) => {
    const ref = sortKey(it);
    if (!ref) return acc;
    const k = monthLabel(ref);
    (acc[k] ??= []).push(it);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">History</h1>
        <p className="text-sm text-muted-foreground mt-0.5">All your past and upcoming workouts</p>
      </div>
      {sorted.length === 0 && <p className="text-muted-foreground text-sm">No workouts yet.</p>}
      {Object.entries(groups).map(([month, list]) => (
        <section key={month}>
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 px-1">{month}</h2>
          <Card><CardContent className="p-0">
            <ul className="divide-y">
              {list.map((a) => {
                const dateLabel = a.completed_at
                  ? new Date(a.completed_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
                  : a.week_start_date
                  ? `Week of ${fmtWeekRange(a.week_start_date)}`
                  : a.scheduled_date
                  ? new Date(a.scheduled_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
                  : "—";
                return (
                  <li key={a.id}>
                    <Link
                      to="/client/workouts/$assignedId"
                      params={{ assignedId: a.id }}
                      className="flex items-center justify-between px-4 py-3 hover:bg-accent/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {a.status === "completed"
                          ? <CheckCircle2 className="size-5 text-primary shrink-0" />
                          : <Clock className="size-5 text-muted-foreground shrink-0" />}
                        <div>
                          <div className="font-medium text-sm">{a.workout_plans?.name}</div>
                          <div className="text-xs text-muted-foreground">{dateLabel}</div>
                        </div>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent></Card>
        </section>
      ))}
    </div>
  );
}
