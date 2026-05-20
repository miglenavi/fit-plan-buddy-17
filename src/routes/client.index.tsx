import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { ClientShell } from "@/components/ClientShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Calendar } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/client/")({
  ssr: false,
  component: () => <RoleGuard role="client"><ClientShell title="Today"><ClientToday /></ClientShell></RoleGuard>,
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
        <h1 className="text-2xl font-bold tracking-tight">Hey{fullName ? `, ${fullName.split(" ")[0]}` : ""} 👋</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      <section>
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 px-1">Today</h2>
        {todays.length === 0 ? (
          <Card><CardContent className="p-5 text-sm text-muted-foreground text-center">
            No workout scheduled today. Take a rest day 🌿
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {todays.map((t) => (
              <Card key={t.id} className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="font-semibold text-lg">{t.workout_plans?.name}</div>
                  {t.workout_plans?.description && (
                    <p className="text-sm text-muted-foreground mt-1">{t.workout_plans.description}</p>
                  )}
                  <div className="mt-4">
                    {t.status === "completed" ? (
                      <div className="flex items-center gap-2 text-primary text-sm font-medium">
                        <CheckCircle2 className="size-4" /> Completed
                      </div>
                    ) : (
                      <Link to="/client/workouts/$assignedId" params={{ assignedId: t.id }} className="block">
                        <Button className="w-full" size="lg">
                          Start workout <ArrowRight className="size-4 ml-1" />
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

      <section>
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 px-1 flex items-center gap-1.5">
          <Calendar className="size-3.5" /> Upcoming
        </h2>
        <Card>
          <CardContent className="p-0">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground p-5 text-center">Nothing scheduled yet.</p>
            ) : (
              <ul className="divide-y">
                {upcoming.map((u) => (
                  <li key={u.id} className="px-4 py-3 flex justify-between items-center">
                    <span className="font-medium text-sm">{u.workout_plans?.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(u.scheduled_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
