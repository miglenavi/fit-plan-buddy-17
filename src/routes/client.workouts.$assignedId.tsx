import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/client/workouts/$assignedId")({
  component: () => <RoleGuard role="client"><AppShell><DoWorkout /></AppShell></RoleGuard>,
});

function DoWorkout() {
  const { assignedId } = useParams({ from: "/client/workouts/$assignedId" });
  const nav = useNavigate();
  const [assigned, setAssigned] = useState<any>(null);
  const [planItems, setPlanItems] = useState<any[]>([]);
  const [logs, setLogs] = useState<Record<string, any>>({});

  const load = async () => {
    const { data: a } = await supabase.from("assigned_workouts")
      .select("*, workout_plans(name, description)")
      .eq("id", assignedId).maybeSingle();
    if (!a) return;
    setAssigned(a);
    const { data: items } = await supabase.from("workout_plan_exercises")
      .select("*, exercises(name, muscle_group)")
      .eq("workout_plan_id", a.workout_plan_id).order("order_index");
    setPlanItems(items ?? []);
    const { data: existing } = await supabase.from("exercise_logs").select("*").eq("assigned_workout_id", assignedId);
    const map: Record<string, any> = {};
    (items ?? []).forEach((it: any) => {
      const log = existing?.find((l) => l.exercise_id === it.exercise_id);
      map[it.exercise_id] = log ?? {
        exercise_id: it.exercise_id,
        actual_sets: it.target_sets,
        actual_reps: it.target_reps,
        actual_weight: it.target_weight ?? "",
        notes: "",
        completed: false,
      };
    });
    setLogs(map);
  };
  useEffect(() => { load(); }, [assignedId]);

  const update = (exId: string, field: string, value: any) => {
    setLogs((p) => ({ ...p, [exId]: { ...p[exId], [field]: value } }));
  };

  const saveLog = async (exId: string) => {
    const l = logs[exId];
    const { error } = await supabase.from("exercise_logs").upsert({
      assigned_workout_id: assignedId,
      exercise_id: exId,
      actual_sets: l.actual_sets ? Number(l.actual_sets) : null,
      actual_reps: l.actual_reps ? Number(l.actual_reps) : null,
      actual_weight: l.actual_weight !== "" ? Number(l.actual_weight) : null,
      notes: l.notes || null,
      completed: !!l.completed,
    }, { onConflict: "assigned_workout_id,exercise_id" });
    if (error) toast.error(error.message);
  };

  const finish = async () => {
    for (const exId of Object.keys(logs)) await saveLog(exId);
    const { error } = await supabase.from("assigned_workouts").update({
      status: "completed", completed_at: new Date().toISOString(),
    }).eq("id", assignedId);
    if (error) toast.error(error.message);
    else { toast.success("Workout completed! 🎉"); nav({ to: "/client" }); }
  };

  if (!assigned) return <p className="text-muted-foreground">Loading…</p>;
  const done = Object.values(logs).filter((l: any) => l.completed).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{assigned.workout_plans?.name}</h1>
        <p className="text-muted-foreground mt-1">{done} of {planItems.length} exercises done</p>
      </div>

      <div className="space-y-4">
        {planItems.map((it, idx) => {
          const log = logs[it.exercise_id] ?? {};
          return (
            <Card key={it.id} className={log.completed ? "border-primary bg-accent/30" : ""}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="size-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-semibold">{idx + 1}</span>
                  {it.exercises?.name}
                </CardTitle>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox checked={!!log.completed} onCheckedChange={(v) => { update(it.exercise_id, "completed", !!v); setTimeout(() => saveLog(it.exercise_id), 0); }} />
                  Done
                </label>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">Target: {it.target_sets} × {it.target_reps}{it.target_weight ? ` @ ${it.target_weight}kg` : ""}</p>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-xs">Sets</Label><Input type="number" value={log.actual_sets ?? ""} onChange={(e) => update(it.exercise_id, "actual_sets", e.target.value)} onBlur={() => saveLog(it.exercise_id)} /></div>
                  <div><Label className="text-xs">Reps</Label><Input type="number" value={log.actual_reps ?? ""} onChange={(e) => update(it.exercise_id, "actual_reps", e.target.value)} onBlur={() => saveLog(it.exercise_id)} /></div>
                  <div><Label className="text-xs">Weight (kg)</Label><Input type="number" step="0.5" value={log.actual_weight ?? ""} onChange={(e) => update(it.exercise_id, "actual_weight", e.target.value)} onBlur={() => saveLog(it.exercise_id)} /></div>
                </div>
                <div><Label className="text-xs">Notes</Label><Textarea rows={2} value={log.notes ?? ""} onChange={(e) => update(it.exercise_id, "notes", e.target.value)} onBlur={() => saveLog(it.exercise_id)} /></div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button onClick={finish} className="w-full" size="lg">
        <CheckCircle2 className="size-5 mr-2" /> Finish workout
      </Button>
    </div>
  );
}
