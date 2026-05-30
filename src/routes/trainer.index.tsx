import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Dumbbell,
  ClipboardList,
  Calendar as CalIcon,
  ArrowRight,
  Plus,
  UserPlus,
  CalendarPlus,
  Activity,
  Inbox,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/trainer/")({
  ssr: false,
  component: () => (
    <RoleGuard role="trainer">
      <AppShell>
        <Dashboard />
      </AppShell>
    </RoleGuard>
  ),
});

type TodaySession = {
  id: string;
  status: string;
  client_id: string;
  workout_plans: { name: string } | null;
  profiles: { full_name: string | null } | null;
};

type ActivityItem = {
  id: string;
  status: string;
  created_at: string;
  scheduled_date: string | null;
  workout_plans: { name: string } | null;
  profiles: { full_name: string | null } | null;
};

const statusStyles: Record<string, string> = {
  pending: "bg-secondary text-secondary-foreground",
  in_progress: "bg-primary/15 text-primary",
  completed: "bg-accent text-accent-foreground",
  skipped: "bg-muted text-muted-foreground",
};

function initials(name?: string | null) {
  const src = (name || "?").trim();
  const parts = src.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function Dashboard() {
  const { fullName } = useAuth();
  const [stats, setStats] = useState({ clients: 0, exercises: 0, plans: 0, today: 0 });
  const [todays, setTodays] = useState<TodaySession[]>([]);
  const [weekTotal, setWeekTotal] = useState(0);
  const [weekCompleted, setWeekCompleted] = useState(0);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    (async () => {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const weekAgo = new Date(today.getTime() - 6 * 86400000).toISOString().slice(0, 10);

      const [c, e, p, t, w, a] = await Promise.all([
        supabase.from("trainer_clients").select("id", { count: "exact", head: true }),
        supabase.from("exercises").select("id", { count: "exact", head: true }),
        supabase.from("workout_plans").select("id", { count: "exact", head: true }),
        supabase
          .from("assigned_workouts")
          .select(
            "id, status, client_id, workout_plans(name), profiles!assigned_workouts_client_profile_fk(full_name)"
          )
          .eq("scheduled_date", todayStr),
        supabase
          .from("assigned_workouts")
          .select("id, status")
          .gte("scheduled_date", weekAgo)
          .lte("scheduled_date", todayStr),
        supabase
          .from("assigned_workouts")
          .select(
            "id, status, created_at, scheduled_date, workout_plans(name), profiles!assigned_workouts_client_profile_fk(full_name)"
          )
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      setStats({
        clients: c.count ?? 0,
        exercises: e.count ?? 0,
        plans: p.count ?? 0,
        today: t.data?.length ?? 0,
      });
      setTodays((t.data as TodaySession[]) ?? []);
      const wk = w.data ?? [];
      setWeekTotal(wk.length);
      setWeekCompleted(wk.filter((x: any) => x.status === "completed").length);
      setActivity((a.data as ActivityItem[]) ?? []);
    })();
  }, []);

  const completionRate = weekTotal === 0 ? 0 : Math.round((weekCompleted / weekTotal) * 100);

  const cards = [
    { label: "Clients", value: stats.clients, icon: Users, to: "/trainer/clients" },
    { label: "Exercises", value: stats.exercises, icon: Dumbbell, to: "/trainer/exercises" },
    { label: "Workout plans", value: stats.plans, icon: ClipboardList, to: "/trainer/plans" },
    { label: "Today's sessions", value: stats.today, icon: CalIcon, to: "/trainer/schedule" },
  ];

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back{fullName ? `, ${fullName.split(" ")[0]}` : ""} 💪
          </h1>
          <p className="text-muted-foreground mt-1">{dateLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/trainer/clients">
              <UserPlus className="size-4 mr-1.5" /> Invite client
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/trainer/exercises">
              <Plus className="size-4 mr-1.5" /> New exercise
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/trainer/plans">
              <CalendarPlus className="size-4 mr-1.5" /> New plan
            </Link>
          </Button>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="group">
            <Card className="h-full border-border/60 shadow-sm transition-all group-hover:shadow-md group-hover:border-primary/40">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <c.icon className="size-5 text-primary" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-bold tracking-tight">{c.value}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">{c.label}</div>
                </div>
                <div className="mt-4 pt-3 border-t border-border/60 text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors flex items-center">
                  View all <ArrowRight className="size-3 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Today's sessions */}
        <Card className="lg:col-span-2 border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Today's sessions</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {todays.length} scheduled for {dateLabel.split(",")[0]}
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/trainer/schedule">
                View schedule <ArrowRight className="size-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {todays.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-10">
                <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <CalIcon className="size-5 text-muted-foreground" />
                </div>
                <div className="font-medium">No sessions today</div>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  When you assign workouts for today, they'll show up here.
                </p>
                <Button asChild variant="link" size="sm" className="mt-2">
                  <Link to="/trainer/schedule">
                    Schedule a session <ArrowRight className="size-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {todays.map((t) => (
                  <li key={t.id} className="py-3 flex items-center gap-3">
                    <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                      {initials(t.profiles?.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {t.profiles?.full_name ?? "Client"}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {t.workout_plans?.name ?? "—"}
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-medium px-2 py-1 rounded-full capitalize ${
                        statusStyles[t.status] ?? "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {t.status.replace("_", " ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* This week */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>This week</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Last 7 days</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-3xl font-bold tracking-tight">{completionRate}%</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {weekCompleted} of {weekTotal} completed
                  </div>
                </div>
                <Activity className="size-5 text-primary" />
              </div>
              <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Recent activity
              </div>
              {activity.length === 0 ? (
                <div className="flex flex-col items-center text-center py-6">
                  <div className="size-10 rounded-xl bg-muted flex items-center justify-center mb-2">
                    <Inbox className="size-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No activity yet</p>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {activity.map((a) => (
                    <li key={a.id} className="flex items-start gap-2.5 text-sm">
                      <span
                        className={`mt-1.5 size-1.5 rounded-full shrink-0 ${
                          a.status === "completed"
                            ? "bg-primary"
                            : a.status === "in_progress"
                            ? "bg-chart-3"
                            : "bg-muted-foreground/40"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">
                          <span className="font-medium">{a.profiles?.full_name ?? "Client"}</span>
                          <span className="text-muted-foreground">
                            {" "}
                            · {a.status.replace("_", " ")}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {a.workout_plans?.name ?? "—"}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
