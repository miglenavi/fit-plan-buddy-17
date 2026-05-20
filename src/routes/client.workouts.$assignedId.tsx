import { createFileRoute, useParams, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { ClientShell } from "@/components/ClientShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { CheckCircle2, ChevronDown, ChevronUp, ArrowLeft, Play, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/client/workouts/$assignedId")({
  ssr: false,
  component: () => <RoleGuard role="client"><ClientShell title="Workout"><DoWorkout /></ClientShell></RoleGuard>,
});

function ytId(url?: string | null) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? m[1] : null;
}

function DoWorkout() {
  const { assignedId } = useParams({ from: "/client/workouts/$assignedId" });
  const nav = useNavigate();
  const [assigned, setAssigned] = useState<any>(null);
  const [planItems, setPlanItems] = useState<any[]>([]);
  const [logs, setLogs] = useState<Record<string, any>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    const { data: a } = await supabase.from("assigned_workouts")
      .select("*, workout_plans(name, description)")
      .eq("id", assignedId).maybeSingle();
    if (!a) return;
    setAssigned(a);
    const { data: items } = await supabase.from("workout_plan_exercises")
      .select("*, exercises(name, muscle_group, description, image_url, video_url)")
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
    const firstUndone = (items ?? []).find((it: any) => !map[it.exercise_id]?.completed);
    setExpandedId(firstUndone?.exercise_id ?? null);
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
      status: "completed",
      completed_at: new Date().toISOString(),
    }).eq("id", assignedId);
    if (error) toast.error(error.message);
    else { toast.success("Workout completed! 🎉"); nav({ to: "/client" }); }
  };

  if (!assigned) return <p className="text-muted-foreground">Loading…</p>;
  const done = Object.values(logs).filter((l: any) => l.completed).length;
  const pct = planItems.length ? Math.round((done / planItems.length) * 100) : 0;

  return (
    <div className="space-y-5 pb-20">
      <div>
        <Link to="/client" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-2 -ml-1">
          <ArrowLeft className="size-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{assigned.workout_plans?.name}</h1>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">{done} / {planItems.length}</span>
        </div>
      </div>

      <div className="space-y-3">
        {planItems.map((it, idx) => {
          const log = logs[it.exercise_id] ?? {};
          const ex = it.exercises ?? {};
          const isOpen = expandedId === it.exercise_id;
          const yt = ytId(ex.video_url);
          return (
            <Card key={it.id} className={log.completed ? "border-primary/60 bg-primary/5" : ""}>
              <CardContent className="p-0">
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : it.exercise_id)}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  <span className={`size-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${log.completed ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>
                    {log.completed ? <CheckCircle2 className="size-4" /> : idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{ex.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {it.target_sets} × {it.target_reps}{it.target_weight ? ` @ ${it.target_weight}kg` : ""}
                      {ex.muscle_group ? ` · ${ex.muscle_group}` : ""}
                    </div>
                  </div>
                  {isOpen ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-4 border-t pt-4">
                    {(yt || ex.video_url || ex.image_url) && (
                      <div className="rounded-lg overflow-hidden bg-muted aspect-video">
                        {yt ? (
                          <iframe
                            src={`https://www.youtube.com/embed/${yt}`}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : ex.video_url ? (
                          <video src={ex.video_url} controls className="w-full h-full object-cover" />
                        ) : (
                          <img src={ex.image_url} alt={ex.name} className="w-full h-full object-cover" />
                        )}
                      </div>
                    )}
                    {!yt && !ex.video_url && !ex.image_url && ex.description && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Play className="size-3" /> No video — read the cues below
                      </div>
                    )}

                    {ex.description && (
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">How to do it</Label>
                        <p className="text-sm mt-1 whitespace-pre-wrap leading-relaxed">{ex.description}</p>
                      </div>
                    )}

                    {it.notes && (
                      <div className="rounded-md bg-accent/40 p-3 text-sm">
                        <div className="text-xs font-semibold text-muted-foreground mb-1">Coach note</div>
                        {it.notes}
                      </div>
                    )}

                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Your log</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div>
                          <Label className="text-xs">Sets</Label>
                          <Input type="number" inputMode="numeric" value={log.actual_sets ?? ""} onChange={(e) => update(it.exercise_id, "actual_sets", e.target.value)} onBlur={() => saveLog(it.exercise_id)} />
                        </div>
                        <div>
                          <Label className="text-xs">Reps</Label>
                          <Input type="number" inputMode="numeric" value={log.actual_reps ?? ""} onChange={(e) => update(it.exercise_id, "actual_reps", e.target.value)} onBlur={() => saveLog(it.exercise_id)} />
                        </div>
                        <div>
                          <Label className="text-xs">Weight</Label>
                          <Input type="number" inputMode="decimal" step="0.5" value={log.actual_weight ?? ""} onChange={(e) => update(it.exercise_id, "actual_weight", e.target.value)} onBlur={() => saveLog(it.exercise_id)} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Notes</Label>
                      <Textarea rows={2} value={log.notes ?? ""} onChange={(e) => update(it.exercise_id, "notes", e.target.value)} onBlur={() => saveLog(it.exercise_id)} />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium pt-1">
                      <Checkbox
                        checked={!!log.completed}
                        onCheckedChange={(v) => {
                          update(it.exercise_id, "completed", !!v);
                          setTimeout(() => saveLog(it.exercise_id), 0);
                          if (v) {
                            const next = planItems.find((p, i) => i > idx && !logs[p.exercise_id]?.completed);
                            setExpandedId(next?.exercise_id ?? null);
                          }
                        }}
                      />
                      Mark as done
                    </label>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur border-t p-3 z-30">
        <div className="max-w-md mx-auto">
          <Button onClick={finish} className="w-full" size="lg">
            <CheckCircle2 className="size-5 mr-2" /> Finish workout
          </Button>
        </div>
      </div>
    </div>
  );
}
