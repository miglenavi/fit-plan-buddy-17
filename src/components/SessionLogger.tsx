import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, ChevronDown, ChevronUp, TrendingUp, AlertCircle, Plus, Trash2 } from "lucide-react";

type SetLog = { id?: string; set_index: number; reps: string | number | null; weight: string | number | null; rpe: string | number | null; completed: boolean };

const isSetDone = (s: { completed: boolean; reps: string | number | null }) =>
  s.completed || (s.reps != null && s.reps !== "" && Number(s.reps) > 0);

export function SessionLogger({ sessionId, onFinished, forceReadOnly }: { sessionId: string; onFinished?: () => void; forceReadOnly?: boolean }) {
  const nav = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [sessionExercises, setSessionExercises] = useState<any[]>([]);
  const [exerciseMeta, setExerciseMeta] = useState<Record<string, any>>({});
  const [setLogsByEx, setSetLogsByEx] = useState<Record<string, SetLog[]>>({});
  const [lastTimeByEx, setLastTimeByEx] = useState<Record<string, { sets: SetLog[]; date: string } | null>>({});
  const [pickedByEx, setPickedByEx] = useState<Record<string, boolean>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [exerciseResults, setExerciseResults] = useState<any[]>([]);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

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
      const picked: Record<string, boolean> = {};
      for (const row of se ?? []) {
        meta[row.id] = row.exercise;
        const existing: SetLog[] = (row.set_logs ?? []).map((l: any) => ({
          id: l.id, set_index: l.set_index, reps: l.reps, weight: l.weight, rpe: l.rpe, completed: l.completed,
        })).sort((a: SetLog, b: SetLog) => a.set_index - b.set_index);
        const target = row.target_sets ?? 3;
        while (existing.length < target) existing.push({ set_index: existing.length, reps: null, weight: row.target_weight ?? null, rpe: null, completed: false });
        logs[row.id] = existing;
        // If no alternative, the question doesn't apply. If any log has data, treat as picked.
        const hasAnyLogged = (row.set_logs ?? []).some((l: any) => l.completed || l.reps != null || l.weight != null || l.rpe != null);
        picked[row.id] = !row.alternative_exercise_id || hasAnyLogged;
      }
      setSetLogsByEx(logs);
      setExerciseMeta(meta);
      setPickedByEx(picked);


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

    let weightVal: number | null = null;
    if (s.weight !== "" && s.weight != null) {
      const raw = String(s.weight).trim().replace(",", ".");
      if (!/^\d+(\.\d+)?$/.test(raw)) {
        toast.error("Weight must be a number (e.g. 20 or 0.5)");
        return;
      }
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > 10000) {
        toast.error("Enter a weight between 0 and 10000");
        return;
      }
      weightVal = n;
    }

    const payload: any = {
      session_exercise_id: seId,
      set_index: s.set_index,
      reps: s.reps === "" || s.reps == null ? null : Number(s.reps),
      weight: weightVal,
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

  const addSet = (seId: string) => {
    setSetLogsByEx((p) => {
      const arr = [...(p[seId] ?? [])];
      const nextIdx = arr.reduce((m, s) => Math.max(m, s.set_index), -1) + 1;
      arr.push({ set_index: nextIdx, reps: null, weight: null, rpe: null, completed: false });
      return { ...p, [seId]: arr };
    });
  };

  const removeSet = async (seId: string, idx: number) => {
    const s = setLogsByEx[seId]?.[idx];
    if (!s) return;
    if (s.id) {
      const { error } = await supabase.from("set_logs").delete().eq("id", s.id);
      if (error) return toast.error(error.message);
    }
    setSetLogsByEx((p) => {
      const arr = [...(p[seId] ?? [])];
      arr.splice(idx, 1);
      return { ...p, [seId]: arr };
    });
  };

  useEffect(() => {
    if (!pickerOpen) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      let q = supabase.from("exercises").select("id, name, description").order("name").limit(30);
      if (exerciseSearch.trim()) q = q.ilike("name", `%${exerciseSearch.trim()}%`);
      const { data } = await q;
      if (!cancelled) setExerciseResults(data ?? []);
    }, 150);
    return () => { cancelled = true; clearTimeout(t); };
  }, [pickerOpen, exerciseSearch]);

  const addExercise = async (exerciseId: string) => {
    if (adding) return;
    setAdding(true);
    const nextOrder = sessionExercises.reduce((m, r) => Math.max(m, r.order_index ?? 0), -1) + 1;
    const { error } = await supabase.from("session_exercises").insert({
      session_id: sessionId,
      exercise_id: exerciseId,
      order_index: nextOrder,
      target_sets: 3,
      target_reps_min: 8,
      target_reps_max: 12,
    });
    setAdding(false);
    if (error) return toast.error(error.message);
    setPickerOpen(false);
    setExerciseSearch("");
    toast.success("Exercise added");
    await load();
  };

  const removeExercise = async (seId: string) => {
    if (!confirm("Remove this exercise from today's session?")) return;
    setRemovingId(seId);
    const { error } = await supabase.from("session_exercises").delete().eq("id", seId);
    setRemovingId(null);
    if (error) return toast.error(error.message);
    toast.success("Exercise removed");
    await load();
  };

  // Pick which of the two options ("X or Y") the client is actually doing.
  // Choosing "alternative" swaps the two IDs so exercise_id always = the performed exercise.
  // Logged sets stay attached to this session_exercise, so reps/weight are specific to the chosen one.
  const chooseExercise = async (seId: string, useAlternative: boolean) => {
    const se = sessionExercises.find((r) => r.id === seId);
    if (!se) return;
    const hasAnyLog = (setLogsByEx[seId] ?? []).some((s) => s.completed || s.reps != null || s.weight != null || s.rpe != null);
    if (hasAnyLog) {
      toast.error("You've already logged sets — clear them before switching exercise.");
      return;
    }
    if (useAlternative && se.alternative_exercise_id) {
      // Swap exercise IDs AND target prescriptions so target_* always reflects the performed exercise.
      // Fall back to primary targets when alt_* is not set.
      const { error } = await supabase
        .from("session_exercises")
        .update({
          exercise_id: se.alternative_exercise_id,
          alternative_exercise_id: se.exercise_id,
          target_sets: se.alt_target_sets ?? se.target_sets,
          target_reps_min: se.alt_target_reps_min ?? se.target_reps_min,
          target_reps_max: se.alt_target_reps_max ?? se.target_reps_max,
          target_weight: se.alt_target_weight ?? se.target_weight,
          alt_target_sets: se.target_sets,
          alt_target_reps_min: se.target_reps_min,
          alt_target_reps_max: se.target_reps_max,
          alt_target_weight: se.target_weight,
        })
        .eq("id", seId);
      if (error) return toast.error(error.message);
    }
    setPickedByEx((p) => ({ ...p, [seId]: true }));
    if (useAlternative) await load();
  };



  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false);

  const doFinish = async () => {
    if (finishing) return;
    setFinishing(true);
    const { error } = await supabase
      .from("training_sessions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", sessionId);
    if (error) { setFinishing(false); return toast.error(error.message); }
    toast.success("Session completed 🎉");
    if (onFinished) onFinished();
    else nav({ to: "/client" });
  };

  const finish = () => {
    const totalSets = Object.values(setLogsByEx).reduce((n, arr) => n + arr.length, 0);
    const doneSets = Object.values(setLogsByEx).reduce((n, arr) => n + arr.filter(isSetDone).length, 0);
    if (totalSets > 0 && doneSets < totalSets) {
      setConfirmFinishOpen(true);
      return;
    }
    doFinish();
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
  const done = sessionExercises.filter((se) => (setLogsByEx[se.id] ?? []).length > 0 && (setLogsByEx[se.id] ?? []).every(isSetDone)).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const canEdit = forceReadOnly ? false : session.status !== "completed";

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h2 className="text-xl font-bold tracking-tight">{session.trainings?.name}</h2>
        {session.logged_by === "trainer" && <p className="text-xs text-muted-foreground mt-1">Logged by trainer</p>}
        {session.status === "completed" && (
          <p className="text-xs text-primary mt-1 font-medium">
            Completed{session.completed_at ? ` on ${new Date(session.completed_at).toLocaleDateString()}` : ""} · read-only
          </p>
        )}
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
          const ex = exerciseMeta[se.id] ?? se.exercise ?? {};
          const sets = setLogsByEx[se.id] ?? [];
          const allDone = sets.length > 0 && sets.every(isSetDone);
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
          const hasAlt = !!se.alternative_exercise_id && !!se.alternative?.name;
          const picked = pickedByEx[se.id] ?? !hasAlt;
          const needsChoice = hasAlt && !picked;
          const altSetsV = se.alt_target_sets ?? se.target_sets;
          const altMinV = se.alt_target_reps_min ?? se.target_reps_min;
          const altMaxV = se.alt_target_reps_max ?? se.target_reps_max;
          const altWV = se.alt_target_weight ?? se.target_weight;
          const altTargetReps = altMinV === altMaxV ? `${altMinV}` : `${altMinV}–${altMaxV}`;
          const primaryLine = `${se.target_sets} × ${targetReps}${se.target_weight ? ` @ ${se.target_weight}kg` : ""}`;
          const altLine = `${altSetsV} × ${altTargetReps}${altWV ? ` @ ${altWV}kg` : ""}`;

          return (
            <Card key={se.id} className={allDone ? "border-primary/60 bg-primary/5" : needsChoice ? "border-amber-500/60" : ""}>
              <CardContent className="p-0">
                <button type="button" onClick={() => setExpandedId(isOpen ? null : se.id)}
                  className="w-full flex items-center gap-3 p-4 text-left">
                  <span className={`size-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${allDone ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>
                    {allDone ? <CheckCircle2 className="size-4" /> : i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">
                      {ex.name}
                      {hasAlt && !picked && <span className="text-muted-foreground font-normal"> <span className="italic">or</span> {se.alternative.name}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {needsChoice ? (
                        <span className="text-amber-600 font-medium">Choose one to start</span>
                      ) : (
                        <>{primaryLine}</>
                      )}
                    </div>
                  </div>
                  {isOpen ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                </button>


                {isOpen && (
                  <div className="px-4 pb-4 space-y-4 border-t pt-4">
                    {hasAlt && canEdit && (
                      <div className="rounded-md border bg-card p-3 space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground">
                          {picked ? "Doing today" : "Which exercise are you doing today?"}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => chooseExercise(se.id, false)}
                            className={`rounded-md border p-3 text-left text-sm transition ${picked ? "border-primary bg-primary/5" : "hover:bg-accent"}`}
                          >
                            <div className="font-medium">{ex.name}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">{primaryLine}</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => chooseExercise(se.id, true)}
                            className="rounded-md border p-3 text-left text-sm hover:bg-accent transition"
                          >
                            <div className="font-medium">{se.alternative.name}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">{altLine}</div>
                          </button>
                        </div>
                        {picked && (
                          <p className="text-[11px] text-muted-foreground">
                            Reps and weight below are tracked for <span className="font-medium">{ex.name}</span>. Tap the other option to switch (only available before you log any sets).
                          </p>
                        )}
                      </div>
                    )}

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

                    {picked && (
                    <div className="space-y-2">

                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Today's sets</Label>
                      <div className="grid grid-cols-[2rem_1fr_1fr_1fr_2.5rem] gap-2 items-end text-xs font-semibold text-muted-foreground px-1">
                        <span></span><span>Reps</span><span>Weight</span><span>RPE</span><span></span>
                      </div>
                      {sets.map((s, idx) => (
                        <div key={idx} className="grid grid-cols-[2rem_1fr_1fr_1fr_2.5rem_2rem] gap-2 items-center">
                          <span className="text-xs text-muted-foreground tabular-nums">#{idx + 1}</span>
                          <Input type="number" inputMode="numeric" readOnly={!canEdit} disabled={!canEdit} value={s.reps ?? ""} onChange={(e) => updateSet(se.id, idx, "reps", e.target.value)} onBlur={() => saveSet(se.id, idx)} />
                          <Input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" readOnly={!canEdit} disabled={!canEdit} value={s.weight ?? ""} onChange={(e) => updateSet(se.id, idx, "weight", e.target.value.replace(/[^0-9.,]/g, ""))} onBlur={() => saveSet(se.id, idx)} />
                          <Input type="number" inputMode="decimal" step="0.5" readOnly={!canEdit} disabled={!canEdit} value={s.rpe ?? ""} onChange={(e) => updateSet(se.id, idx, "rpe", e.target.value)} onBlur={() => saveSet(se.id, idx)} />
                          <Checkbox checked={s.completed} disabled={!canEdit} onCheckedChange={(v) => { if (!canEdit) return; updateSet(se.id, idx, "completed", !!v); setTimeout(() => saveSet(se.id, idx), 0); }} />
                          {canEdit ? (
                            <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => removeSet(se.id, idx)} aria-label="Remove set">
                              <Trash2 className="size-3.5" />
                            </Button>
                          ) : <span />}
                        </div>
                      ))}
                      {canEdit && (
                        <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => addSet(se.id)}>
                          <Plus className="size-4 mr-1.5" /> Add set
                        </Button>
                      )}
                    </div>
                    )}



                    {canEdit && (
                      <div className="pt-2 border-t">
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => removeExercise(se.id)} disabled={removingId === se.id}>
                          <Trash2 className="size-4 mr-1.5" /> {removingId === se.id ? "Removing…" : "Remove from session"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {canEdit && (
        <Button variant="outline" className="w-full" onClick={() => setPickerOpen(true)}>
          <Plus className="size-4 mr-1.5" /> Add exercise
        </Button>
      )}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add exercise to session</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Search exercises…"
            value={exerciseSearch}
            onChange={(e) => setExerciseSearch(e.target.value)}
          />
          <div className="max-h-80 overflow-y-auto space-y-1">
            {exerciseResults.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No exercises found.</p>
            )}
            {exerciseResults.map((ex) => (
              <button
                key={ex.id}
                type="button"
                disabled={adding}
                onClick={() => addExercise(ex.id)}
                className="w-full text-left p-3 rounded-md hover:bg-accent disabled:opacity-50"
              >
                <div className="font-medium text-sm">{ex.name}</div>
                {ex.description && <div className="text-xs text-muted-foreground line-clamp-1">{ex.description}</div>}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {canEdit && (
        <div className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur border-t p-3 z-30">
          <div className="max-w-md mx-auto">
            <Button onClick={finish} disabled={finishing} className="w-full" size="lg">
              <CheckCircle2 className="size-5 mr-2" /> {finishing ? "Finishing…" : "Finish session"}
            </Button>
          </div>
        </div>
      )}

      <Dialog open={confirmFinishOpen} onOpenChange={setConfirmFinishOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Finish with incomplete sets?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Some sets aren't marked complete. You can still finish — but completed sessions become read-only.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setConfirmFinishOpen(false)}>Keep logging</Button>
            <Button onClick={() => { setConfirmFinishOpen(false); doFinish(); }} disabled={finishing}>
              Finish anyway
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
