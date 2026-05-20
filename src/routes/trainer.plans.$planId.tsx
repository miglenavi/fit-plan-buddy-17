import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/trainer/plans/$planId")({
  ssr: false,
  component: PlanDetail,
});

function PlanDetail() {
  const { planId } = useParams({ from: "/trainer/plans/$planId" });
  const [plan, setPlan] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [exId, setExId] = useState("");
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState<string>("");

  const load = async () => {
    const [{ data: p }, { data: it }, { data: ex }] = await Promise.all([
      supabase.from("workout_plans").select("*").eq("id", planId).maybeSingle(),
      supabase.from("workout_plan_exercises").select("*, exercises(name, muscle_group)").eq("workout_plan_id", planId).order("order_index"),
      supabase.from("exercises").select("*").order("name"),
    ]);
    setPlan(p); setItems(it ?? []); setExercises(ex ?? []);
  };
  useEffect(() => { load(); }, [planId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("workout_plan_exercises").insert({
      workout_plan_id: planId,
      exercise_id: exId,
      target_sets: sets,
      target_reps: reps,
      target_weight: weight ? Number(weight) : null,
      order_index: items.length,
    });
    if (error) toast.error(error.message);
    else { setExId(""); setWeight(""); load(); }
  };

  const remove = async (id: string) => {
    await supabase.from("workout_plan_exercises").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{plan?.name}</h1>
        {plan?.description && <p className="text-muted-foreground mt-1">{plan.description}</p>}
      </div>

      <Card>
        <CardHeader><CardTitle>Add exercise to plan</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid sm:grid-cols-5 gap-3 items-end">
            <div className="space-y-2 sm:col-span-2">
              <Label>Exercise</Label>
              <Select value={exId} onValueChange={setExId} required>
                <SelectTrigger><SelectValue placeholder="Choose..." /></SelectTrigger>
                <SelectContent>{exercises.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Sets</Label><Input type="number" min="1" value={sets} onChange={(e) => setSets(+e.target.value)} /></div>
            <div className="space-y-2"><Label>Reps</Label><Input type="number" min="1" value={reps} onChange={(e) => setReps(+e.target.value)} /></div>
            <div className="space-y-2"><Label>Weight (kg)</Label><Input type="number" step="0.5" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="optional" /></div>
            <Button type="submit" className="sm:col-span-5" disabled={!exId}><Plus className="size-4 mr-1" /> Add</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Exercises in this plan</CardTitle></CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-muted-foreground text-sm">No exercises yet. Add one above.</p>
          ) : (
            <ul className="divide-y">
              {items.map((it, i) => (
                <li key={it.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-semibold">{i + 1}</div>
                    <div>
                      <div className="font-medium">{it.exercises?.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {it.target_sets} × {it.target_reps}{it.target_weight ? ` @ ${it.target_weight}kg` : ""}
                      </div>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remove(it.id)}><Trash2 className="size-4 text-muted-foreground" /></Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
