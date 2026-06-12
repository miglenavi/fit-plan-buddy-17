import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { CheckCircle2, ChevronDown, ChevronUp, TrendingUp, AlertCircle } from "lucide-react";

type SetLog = { id?: string; set_index: number; reps: string | number | null; weight: string | number | null; rpe: string | number | null; completed: boolean };

export function SessionLogger({ sessionId, onFinished }: { sessionId: string; onFinished?: () => void }) {
  const nav = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [sessionExercises, setSessionExercises] = useState<any[]>([]);
  const [exerciseMeta, setExerciseMeta] = useState<Record<string, any>>({});
  const [setLogsByEx, setSetLogsByEx] = useState<Record<string, SetLog[]>>({});
  const [lastTimeByEx, setLastTimeByEx] = useState<Record<string, { sets: SetLog[]; date: string } | null>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data: s, error: sErr } = await supabase
        .from("training_sessions")
        .select("*, trainings(name, description)")
        .eq("id", sessionId)
        .maybeSingle();
      if (sErr) throw sErr;
      if (!s) {
        setErrorMsg("Session not found or you don't have access to it.");
        setSession(null);
        return;
      }
      setSession(s);

      const { data: se, error: seErr } = await supabase
        .from("session_exercises")
        .select("*, exercise:exercises!exercise_id(name, description, image_url, video_url, default_rest_seconds), alternative:exercises!alternative_exercise_id(name), set_logs(*)")
        .eq("session_id", sessionId)
        .order("order_index");
      if (seErr) throw seErr;
      setSessionExercises(se ?? []);

      const meta: Record<string, any> = {};
      const logs: Record<string, SetLog[]> = {};
      for (const row of se ?? []) {
        meta[row.id] = row.exercise;
        const existing: SetLog[] = (row.set_logs ?? []).map((l: any) => ({
          id: l.id, set_index: l.set_index, reps: l.reps, weight: l.weight, rpe: l.rpe, completed: l.completed,
        })).sort((a: SetLog, b: SetLog) => a.set_index - b.set_index);
        const target = row.target_sets ?? 3;
        while (existing.length < target) existing.push({ set_index: existing.length, reps: null, weight: row.target_weight ?? null, rpe: null, completed: false });
        logs[row.id] = existing;
      }
      setSetLogsByEx(logs);
      setExerciseMeta(meta);

      // "Last time"
      const exIds = (se ?? []).map((r: any) => r.exercise_id);
      const last: Record<string, { sets: SetLog[]; date: string } | null> = {};
      if (exIds.length && s.training_id) {
        const { data: prevSessions } = await supabase
          .from("training_sessions")
          .select("id, completed_at")
          .eq("client_id", s.client_id)
          .eq("training_id", s.training_id)
          .eq("status", "completed")
          .neq("id", sessionId)
          .order("completed_at", { ascending: false })
          .limit(20);
        const sessIds = (prevSessions ?? []).map((x) => x.id);
        if (sessIds.length) {
          const { data: prevSEs } = await supabase
            .from("session_exercises")
            .select("id, session_id, exercise_id, set_logs(set_index, reps, weight, rpe, completed)")
            .in("session_id", sessIds)
            .in("exercise_id", exIds);
          for (const cur of se ?? []) {
            for (const ps of prevSessions ?? []) {
              const match = (prevSEs ?? []).find((x: any) => x.session_id === ps.id && x.exercise_id === cur.exercise_id);
              if (match && (match.set_logs?.length ?? 0) > 0) {
                last[cur.id] = {
                  date: ps.completed_at ?? "",
                  sets: match.set_logs.map((l: any) => ({ set_index: l.set_index, reps: l.reps, weight: l.weight, rpe: l.rpe, completed: l.completed })).sort((a: any, b: any) => a.set_index - b.set_index),
                };
                break;
              }
            }
            if (!last[cur.id]) last[cur.id] = null;
          }
        }
      }
      setLastTimeByEx(last);

      const firstUndone = (se ?? []).find((r: any) => !(logs[r.id] ?? []).every((sl) => sl.completed));
      setExpandedId(firstUndone?.id ?? null);
    } catch (e: any) {
      const msg = e?.message ?? "Failed to load session";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [sessionId]);

  const updateSet = (seId: string, idx: number, field: keyof SetLog, value: any) => {
    setSetLogsByEx((p) => {
      const arr = [...(p[seId] ?? [])];
      arr[idx] = { ...arr[idx], [field]: value };
      return { ...p, [seId]: arr };
    });
  };

  const saveSet = async (seId: string, idx: number) => {
    const s = setLogsByEx[seId]?.[idx];
    if (!s) return;
    const payload: any = {
      session_exercise_id: seId,
      set_index: s.set_index,
      reps: s.reps === "" || s.reps == null ? null : Number(s.reps),
      weight: s.weight === "" || s.weight == null ? null : Number(s.weight),
      rpe: s.rpe === "" || s.rpe == null ? null : Number(s.rpe),
      completed: !!s.completed,
    };
    const { data, error } = await supabase
      .from("set_logs")
      .upsert(payload, { onConflict: "session_exercise_id,set_index" })
      .select("id")
      .single();
    if (error) toast.error(error.message);
    else if (data?.id) updateSet(seId, idx, "id", data.id);
  };

  const finish = async () => {
    const { error } = await supabase
      .from("training_sessions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", sessionId);
    if (error) return toast.error(error.message);
    toast.success("Session completed 🎉");
    if (onFinished) onFinished();
    else nav({ to: "/client" });
  };

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  if (errorMsg || !session) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="flex items-start gap-2 text-destructive">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Couldn't load this session</p>
              <p className="text-sm text-muted-foreground mt-1">{errorMsg ?? "Session not found."}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const total = sessionExercises.length;
  const done = sessionExercises.filter((se) => (setLogsByEx[se.id] ?? []).every((s) => s.completed)).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h2 className="text-xl font-bold tracking-tight">{session.trainings?.name}</h2>
        {session.logged_by === "trainer" && <p className="text-xs text-muted-foreground mt-1">Logged by trainer</p>}
        <div className="mt-2 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">{done} / {total}</span>
        </div>
      </div>

      {sessionExercises.length === 0 && (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">This session has no exercises yet.</CardContent></Card>
      )}

      <div className="space-y-3">
        {sessionExercises.map((se, i) => {
          const ex = exerciseMeta[se.id] ?? se.exercises ?? {};
          const sets = setLogsByEx[se.id] ?? [];
          const allDone = sets.length > 0 && sets.every((s) => s.completed);
          const isOpen = expandedId === se.id;
          const last = lastTimeByEx[se.id];
          let suggestion: string | null = null;
          if (last && last.sets.length > 0 && se.target_reps_max) {
            const allHitTop = last.sets.every((s) => (s.reps ?? 0) >= (se.target_reps_max ?? 0));
            const weights = last.sets.map((s) => Number(s.weight ?? 0));
            const maxW = Math.max(...weights);
            if (allHitTop && maxW > 0) {
              const bump = maxW >= 60 ? 2.5 : maxW >= 20 ? 2 : 1;
              suggestion = `You hit the top of the rep range last time — try ${maxW + bump}kg today.`;
            } else if (!allHitTop) {
              suggestion = `Aim to add a rep on each set today.`;
            }
          }
          const targetReps = se.target_reps_min === se.target_reps_max ? `${se.target_reps_min}` : `${se.target_reps_min}–${se.target_reps_max}`;

          return (
            <Card key={se.id} className={allDone ? "border-primary/60 bg-primary/5" : ""}>
              <CardContent className="p-0">
                <button type="button" onClick={() => setExpandedId(isOpen ? null : se.id)}
                  className="w-full flex items-center gap-3 p-4 text-left">
                  <span className={`size-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${allDone ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>
                    {allDone ? <CheckCircle2 className="size-4" /> : i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">
                      {ex.name}
                      {se.alternative?.name && <span className="text-muted-foreground font-normal"> <span className="italic">or</span> {se.alternative.name}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {se.target_sets} × {targetReps}{se.target_weight ? ` @ ${se.target_weight}kg` : ""}
                    </div>
                  </div>
                  {isOpen ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-4 border-t pt-4">
                    {se.notes && (
                      <div className="rounded-md bg-accent/40 p-3 text-sm">
                        <div className="text-xs font-semibold text-muted-foreground mb-1">Coach note</div>
                        {se.notes}
                      </div>
                    )}

                    {last && (
                      <div className="rounded-md bg-muted/50 p-3 text-xs">
                        <div className="font-semibold text-muted-foreground mb-1.5">Last time ({new Date(last.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })})</div>
                        <div className="space-y-0.5">
                          {last.sets.map((s) => (
                            <div key={s.set_index} className="tabular-nums">
                              Set {s.set_index + 1}: {s.reps ?? "–"} reps{s.weight ? ` @ ${s.weight}kg` : ""}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {suggestion && (
                      <div className="flex items-start gap-2 text-xs rounded-md bg-primary/10 text-primary px-3 py-2">
                        <TrendingUp className="size-3.5 mt-0.5 shrink-0" /><div>{suggestion}</div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Today's sets</Label>
                      <div className="grid grid-cols-[2rem_1fr_1fr_1fr_2.5rem] gap-2 items-end text-xs font-semibold text-muted-foreground px-1">
                        <span></span><span>Reps</span><span>Weight</span><span>RPE</span><span></span>
                      </div>
                      {sets.map((s, idx) => (
                        <div key={idx} className="grid grid-cols-[2rem_1fr_1fr_1fr_2.5rem] gap-2 items-center">
                          <span className="text-xs text-muted-foreground tabular-nums">#{idx + 1}</span>
                          <Input type="number" inputMode="numeric" value={s.reps ?? ""} onChange={(e) => updateSet(se.id, idx, "reps", e.target.value)} onBlur={() => saveSet(se.id, idx)} />
                          <Input type="number" inputMode="decimal" step="0.5" value={s.weight ?? ""} onChange={(e) => updateSet(se.id, idx, "weight", e.target.value)} onBlur={() => saveSet(se.id, idx)} />
                          <Input type="number" inputMode="decimal" step="0.5" value={s.rpe ?? ""} onChange={(e) => updateSet(se.id, idx, "rpe", e.target.value)} onBlur={() => saveSet(se.id, idx)} />
                          <Checkbox checked={s.completed} onCheckedChange={(v) => { updateSet(se.id, idx, "completed", !!v); setTimeout(() => saveSet(se.id, idx), 0); }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {session.status !== "completed" && (
        <div className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur border-t p-3 z-30">
          <div className="max-w-md mx-auto">
            <Button onClick={finish} className="w-full" size="lg">
              <CheckCircle2 className="size-5 mr-2" /> Finish session
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
