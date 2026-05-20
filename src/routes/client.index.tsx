import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Calendar } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/client/")({
  component: () => <RoleGuard role="client"><AppShell><ClientToday /></AppShell></RoleGuard>,
});

function ClientToday() {
  const { fullName } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const [todays, setTodays] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: up }] = await Promise.all([
        supabase.from("assigned_workouts").select("id, status, workout_plans(name, description)").eq("scheduled_date", today),
        supabase.from("assigned_workouts").select("id, scheduled_date, workout_plans(name)").gt("scheduled_date", today).order("scheduled_date").limit(5),
      ]);
      setTodays(t ?? []); setUpcoming(up ?? []);
    })();
  }, [today]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hey{fullName ? `, ${fullName.split(" ")[0]}` : ""} 👋</h1>
        <p className="text-muted-foreground mt-1">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Today's workout</CardTitle></CardHeader>
        <CardContent>
          {todays.length === 0 ? (
            <p className="text-muted-foreground text-sm">No workout scheduled today. Take a rest day 🌿</p>
          ) : (
            <div className="space-y-3">
              {todays.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-4 rounded-xl bg-accent/40 border">
                  <div>
                    <div className="font-semibold text-lg">{t.workout_plans?.name}</div>
                    {t.workout_plans?.description && <p className="text-sm text-muted-foreground">{t.workout_plans.description}</p>}
                  </div>
                  {t.status === "completed" ? (
                    <span className="flex items-center gap-1 text-primary text-sm font-medium"><CheckCircle2 className="size-4" /> Done</span>
                  ) : (
                    <Link to="/client/workouts/$assignedId" params={{ assignedId: t.id }}>
                      <Button>Start <ArrowRight className="size-4 ml-1" /></Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="size-5" /> Upcoming</CardTitle></CardHeader>
        <CardContent>
          {upcoming.length === 0 ? <p className="text-muted-foreground text-sm">Nothing scheduled yet.</p> : (
            <ul className="divide-y">
              {upcoming.map((u) => (
                <li key={u.id} className="py-3 flex justify-between">
                  <span className="font-medium">{u.workout_plans?.name}</span>
                  <span className="text-sm text-muted-foreground">{new Date(u.scheduled_date).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
