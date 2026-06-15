import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/trainer/plans/$planId_/trainings/$trainingId")({
  ssr: false,
  component: TrainingDetail,
});

function TrainingDetail() {
  const { planId, trainingId } = useParams({ from: "/trainer/plans/$planId_/trainings/$trainingId" });
  const [training, setTraining] = useState<any>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const loaded = useRef(false);
  const lastSaved = useRef("");

  // add-exercise form
  const [exId, setExId] = useState("");
  const [altExId, setAltExId] = useState("");
  const [sets, setSets] = useState(3);
  const [repsMin, setRepsMin] = useState(8);
  const [repsMax, setRepsMax] = useState(10);
  const [weight, setWeight] = useState("");
  const [rest, setRest] = useState("");
  const [coachNotes, setCoachNotes] = useState("");
  // optional separate targets for the alternative
  const [altSets, setAltSets] = useState<string>("");
  const [altRepsMin, setAltRepsMin] = useState<string>("");
  const [altRepsMax, setAltRepsMax] = useState<string>("");
  const [altWeight, setAltWeight] = useState<string>("");
  const [altRest, setAltRest] = useState<string>("");
  const [altCoachNotes, setAltCoachNotes] = useState<string>("");

  const load = async () => {
    const [{ data: t }, { data: it }, { data: ex }, { data: c }] = await Promise.all([
      supabase.from("trainings").select("*").eq("id", trainingId).maybeSingle(),
      supabase.from("training_exercises").select("*, alternative_exercise_id, exercises(name, category_id, muscle_groups)").eq("training_id", trainingId).order("order_index"),
      supabase.from("exercises").select("id, name, category_id").order("name"),
      supabase.from("exercise_categories" as any).select("id, name").order("name"),
    ]);
    setTraining(t);
    if (t) {
      setName(t.name ?? "");
      setDesc(t.description ?? "");
      lastSaved.current = JSON.stringify({ name: t.name ?? "", description: t.description ?? "" });
      loaded.current = true;
    }
    setItems(it ?? []);
    setExercises(ex ?? []);
    setCats(((c as any) ?? []) as { id: string; name: string }[]);
  };
  useEffect(() => { load(); }, [trainingId]);

  useEffect(() => {
    if (!loaded.current) return;
    const cur = JSON.stringify({ name, description: desc });
    if (cur === lastSaved.current) return;
    if (!name.trim()) { setStatus("error"); return; }
    setStatus("saving");
    const t = setTimeout(async () => {
      const { error } = await supabase.from("trainings").update({ name, description: desc || null }).eq("id", trainingId);
      if (error) setStatus("error");
      else { lastSaved.current = cur; setStatus("saved"); setTimeout(() => setStatus((s) => s === "saved" ? "idle" : s), 1500); }
    }, 700);
    return () => clearTimeout(t);
  }, [name, desc, trainingId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exId) return toast.error("Pick an exercise first");
    if (altExId && altExId === exId) return toast.error("Alternative must differ from the primary exercise");
    if (repsMax < repsMin) return toast.error("Max reps must be ≥ min reps");
    const hasAlt = !!altExId;
    const altSetsNum = altSets ? Number(altSets) : null;
    const altMinNum = altRepsMin ? Number(altRepsMin) : null;
    const altMaxNum = altRepsMax ? Number(altRepsMax) : null;
    if (hasAlt && altMinNum != null && altMaxNum != null && altMaxNum < altMinNum) {
      return toast.error("Alt max reps must be ≥ min reps");
    }
    const { error } = await supabase.from("training_exercises").insert({
      training_id: trainingId,
      exercise_id: exId,
      alternative_exercise_id: altExId || null,
      target_sets: sets,
      target_reps_min: repsMin,
      target_reps_max: repsMax,
      target_weight: weight ? Number(weight) : null,
      rest_seconds: rest ? Number(rest) : null,
      coach_notes: coachNotes || null,
      alt_target_sets: hasAlt ? altSetsNum : null,
      alt_target_reps_min: hasAlt ? altMinNum : null,
      alt_target_reps_max: hasAlt ? altMaxNum : null,
      alt_target_weight: hasAlt && altWeight ? Number(altWeight) : null,
      alt_rest_seconds: hasAlt && altRest ? Number(altRest) : null,
      alt_coach_notes: hasAlt ? (altCoachNotes || null) : null,
      order_index: items.length,
    } as any);
    if (error) toast.error(error.message);
    else {
      setExId(""); setAltExId(""); setWeight(""); setRest(""); setCoachNotes("");
      setAltSets(""); setAltRepsMin(""); setAltRepsMax(""); setAltWeight(""); setAltRest(""); setAltCoachNotes("");
      toast.success("Added");
      load();
    }
  };

  const remove = async (id: string) => {
    await supabase.from("training_exercises").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Training name (e.g. Lower Body A)"
            className="!text-3xl font-bold tracking-tight h-auto border-none shadow-none px-0 focus-visible:ring-0 md:!text-3xl" />
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Add a description (optional)" rows={2}
            className="resize-none border-none shadow-none px-0 text-muted-foreground focus-visible:ring-0" />
          <div className="text-xs text-muted-foreground min-h-[1.25rem]">
            {status === "saving" && <span className="inline-flex items-center gap-1"><Loader2 className="size-3 animate-spin" />Saving…</span>}
            {status === "saved" && <span className="inline-flex items-center gap-1 text-green-600"><Check className="size-3" />Saved</span>}
            {status === "error" && <span className="text-destructive">{!name.trim() ? "Name is required" : "Couldn't save"}</span>}
          </div>
        </div>
        <Button asChild variant="outline"><Link to="/trainer/plans/$planId" params={{ planId }}>Back to plan</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Add exercise</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid sm:grid-cols-6 gap-3 items-end">
            {(() => {
              const byCat = new Map<string, any[]>();
              for (const e of exercises) {
                const key = (e as any).category_id ?? "__none__";
                if (!byCat.has(key)) byCat.set(key, []);
                byCat.get(key)!.push(e);
              }
              const groups = Array.from(byCat.entries()).map(([id, items]) => ({
                id,
                name: id === "__none__" ? "Uncategorized" : (cats.find((c) => c.id === id)?.name ?? "Uncategorized"),
                items,
              })).sort((a, b) => (a.name === "Uncategorized" ? 1 : b.name === "Uncategorized" ? -1 : a.name.localeCompare(b.name)));
              const renderGroups = (excludeId?: string) => groups.map((g) => {
                const filtered = excludeId ? g.items.filter((e) => e.id !== excludeId) : g.items;
                if (filtered.length === 0) return null;
                return (
                  <SelectGroup key={g.id}>
                    <SelectLabel>{g.name}</SelectLabel>
                    {filtered.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectGroup>
                );
              });
              return (
                <>
                  <div className="space-y-2 sm:col-span-3">
                    <Label>Exercise</Label>
                    <Select value={exId} onValueChange={setExId} required>
                      <SelectTrigger><SelectValue placeholder="Choose..." /></SelectTrigger>
                      <SelectContent>{renderGroups()}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-3">
                    <Label className="text-muted-foreground font-normal">Or alternative <span className="text-xs">(optional)</span></Label>
                    <Select value={altExId || "__none__"} onValueChange={(v) => setAltExId(v === "__none__" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {renderGroups(exId)}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              );
            })()}
            <div className="space-y-2"><Label>Sets</Label><Input type="number" min="1" value={sets} onChange={(e) => setSets(+e.target.value)} /></div>
            <div className="space-y-2"><Label>Reps min</Label><Input type="number" min="1" value={repsMin} onChange={(e) => setRepsMin(+e.target.value)} /></div>
            <div className="space-y-2"><Label>Reps max</Label><Input type="number" min="1" value={repsMax} onChange={(e) => setRepsMax(+e.target.value)} /></div>
            <div className="space-y-2"><Label>Weight (kg)</Label><Input type="number" step="0.5" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="optional" /></div>
            <div className="space-y-2"><Label>Rest (sec)</Label><Input type="number" min="0" value={rest} onChange={(e) => setRest(e.target.value)} placeholder="optional" /></div>
            <div className="space-y-2 sm:col-span-4"><Label>Coach notes</Label><Input value={coachNotes} onChange={(e) => setCoachNotes(e.target.value)} placeholder="Cues, tempo, etc." /></div>
            {altExId && (
              <div className="sm:col-span-6 rounded-md border bg-muted/30 p-3 space-y-3">
                <div className="text-sm font-medium">
                  Targets for the alternative
                  <span className="text-xs text-muted-foreground font-normal ml-2">
                    (leave blank to reuse the primary targets above)
                  </span>
                </div>
                <div className="grid sm:grid-cols-6 gap-3">
                  <div className="space-y-2"><Label>Sets</Label><Input type="number" min="1" value={altSets} onChange={(e) => setAltSets(e.target.value)} placeholder={String(sets)} /></div>
                  <div className="space-y-2"><Label>Reps min</Label><Input type="number" min="1" value={altRepsMin} onChange={(e) => setAltRepsMin(e.target.value)} placeholder={String(repsMin)} /></div>
                  <div className="space-y-2"><Label>Reps max</Label><Input type="number" min="1" value={altRepsMax} onChange={(e) => setAltRepsMax(e.target.value)} placeholder={String(repsMax)} /></div>
                  <div className="space-y-2"><Label>Weight (kg)</Label><Input type="number" step="0.5" value={altWeight} onChange={(e) => setAltWeight(e.target.value)} placeholder={weight || "optional"} /></div>
                  <div className="space-y-2"><Label>Rest (sec)</Label><Input type="number" min="0" value={altRest} onChange={(e) => setAltRest(e.target.value)} placeholder={rest || "optional"} /></div>
                  <div className="space-y-2 sm:col-span-6"><Label>Alt coach notes</Label><Input value={altCoachNotes} onChange={(e) => setAltCoachNotes(e.target.value)} placeholder="Cues for the alternative" /></div>
                </div>
              </div>
            )}
            <Button type="submit" className="sm:col-span-6"><Plus className="size-4 mr-1" /> {exId ? "Add exercise to training" : "Select an exercise above to add"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Exercises in this training</CardTitle></CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-muted-foreground text-sm">No exercises yet.</p>
          ) : (
            <ul className="divide-y">
              {items.map((it, i) => {
                const altName = it.alternative_exercise_id ? exercises.find((e) => e.id === it.alternative_exercise_id)?.name : null;
                return (
                <li key={it.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-semibold shrink-0">{i + 1}</div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {it.exercises?.name}
                        {altName && <span className="text-muted-foreground font-normal"> <span className="italic">or</span> {altName}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {it.target_sets} × {it.target_reps_min === it.target_reps_max ? it.target_reps_min : `${it.target_reps_min}–${it.target_reps_max}`}
                        {it.target_weight ? ` @ ${it.target_weight}kg` : ""}
                        {it.rest_seconds ? ` · rest ${it.rest_seconds}s` : ""}
                        {it.coach_notes ? ` · ${it.coach_notes}` : ""}
                      </div>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remove(it.id)}><Trash2 className="size-4 text-muted-foreground" /></Button>
                </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
