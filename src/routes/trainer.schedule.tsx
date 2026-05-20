import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/trainer/schedule")({
  component: () => <RoleGuard role="trainer"><AppShell><Schedule /></AppShell></RoleGuard>,
});

function Schedule() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("assigned_workouts")
        .select("id, scheduled_date, status, workout_plans(name), profiles!assigned_workouts_client_profile_fk(full_name)")
        .gte("scheduled_date", new Date(Date.now() - 30 * 86400e3).toISOString().slice(0, 10))
        .order("scheduled_date", { ascending: false });
      setItems(data ?? []);
    })();
  }, []);

  const groups = items.reduce((acc: Record<string, any[]>, it) => {
    (acc[it.scheduled_date] ||= []).push(it); return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
        <p className="text-muted-foreground mt-1">All upcoming and past sessions</p>
      </div>
      {Object.keys(groups).length === 0 && <p className="text-muted-foreground text-sm">No sessions scheduled.</p>}
      {Object.entries(groups).map(([date, arr]) => (
        <Card key={date}>
          <CardHeader><CardTitle className="text-base">{new Date(date).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y">
              {arr.map((a) => (
                <li key={a.id} className="py-2 flex justify-between">
                  <div>
                    <div className="font-medium">{a.profiles?.full_name}</div>
                    <div className="text-xs text-muted-foreground">{a.workout_plans?.name}</div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-secondary capitalize self-center">{a.status}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
