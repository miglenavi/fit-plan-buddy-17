import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Dumbbell, ClipboardList, Calendar as CalIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/trainer/")({
  ssr: false, component: () => <RoleGuard role="trainer"><AppShell><Dashboard /></AppShell></RoleGuard> });

function Dashboard() {
  const { fullName } = useAuth();
  const [stats, setStats] = useState({ clients: 0, exercises: 0, plans: 0, today: 0 });
  const [todays, setTodays] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [c, e, p, t] = await Promise.all([
        supabase.from("trainer_clients").select("id", { count: "exact", head: true }),
        supabase.from("exercises").select("id", { count: "exact", head: true }),
        supabase.from("workout_plans").select("id", { count: "exact", head: true }),
        supabase.from("assigned_workouts")
          .select("id, status, client_id, workout_plans(name), profiles!assigned_workouts_client_profile_fk(full_name)")
          .eq("scheduled_date", today),
      ]);
      setStats({ clients: c.count ?? 0, exercises: e.count ?? 0, plans: p.count ?? 0, today: t.data?.length ?? 0 });
      setTodays(t.data ?? []);
    })();
  }, []);

  const cards = [
    { label: "Clients", value: stats.clients, icon: Users, to: "/trainer/clients" },
    { label: "Exercises", value: stats.exercises, icon: Dumbbell, to: "/trainer/exercises" },
    { label: "Workout plans", value: stats.plans, icon: ClipboardList, to: "/trainer/plans" },
    { label: "Today's sessions", value: stats.today, icon: CalIcon, to: "/trainer/schedule" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back{fullName ? `, ${fullName.split(" ")[0]}` : ""} 💪</h1>
        <p className="text-muted-foreground mt-1">Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to}>
            <Card className="hover:border-primary transition-colors h-full">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold">{c.value}</div>
                    <div className="text-sm text-muted-foreground mt-1">{c.label}</div>
                  </div>
                  <c.icon className="size-8 text-primary opacity-70" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Today's sessions</CardTitle></CardHeader>
        <CardContent>
          {todays.length === 0 ? (
            <p className="text-muted-foreground text-sm">No sessions scheduled today.</p>
          ) : (
            <ul className="divide-y">
              {todays.map((t) => (
                <li key={t.id} className="py-3 flex justify-between items-center">
                  <div>
                    <div className="font-medium">{t.profiles?.full_name ?? "Client"}</div>
                    <div className="text-sm text-muted-foreground">{t.workout_plans?.name}</div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-secondary capitalize">{t.status}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
