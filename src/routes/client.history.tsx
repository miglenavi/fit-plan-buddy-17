import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/client/history")({
  component: () => <RoleGuard role="client"><AppShell><History /></AppShell></RoleGuard>,
});

function History() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("assigned_workouts")
        .select("id, scheduled_date, status, workout_plans(name)")
        .order("scheduled_date", { ascending: false });
      setItems(data ?? []);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">History</h1>
        <p className="text-muted-foreground mt-1">All your past and upcoming workouts</p>
      </div>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-muted-foreground text-sm">No workouts yet.</p>}
        {items.map((a) => (
          <Link key={a.id} to="/client/workouts/$assignedId" params={{ assignedId: a.id }}>
            <Card className="hover:border-primary transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {a.status === "completed"
                    ? <CheckCircle2 className="size-5 text-primary" />
                    : <Clock className="size-5 text-muted-foreground" />}
                  <div>
                    <div className="font-medium">{a.workout_plans?.name}</div>
                    <div className="text-xs text-muted-foreground">{new Date(a.scheduled_date).toLocaleDateString()}</div>
                  </div>
                </div>
                <ChevronRight className="size-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
