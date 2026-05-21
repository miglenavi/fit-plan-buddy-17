import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Plus, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/trainer/plans/$planId")({
  ssr: false,
  component: PlanDetail,
});

function PlanDetail() {
  const { planId } = useParams({ from: "/trainer/plans/$planId" });
  const [plan, setPlan] = useState<any>(null);
  const [planName, setPlanName] = useState("");
  const [planDesc, setPlanDesc] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const hasLoaded = useRef(false);
  const lastSaved = useRef<string>("");
  const [items, setItems] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [exId, setExId] = useState("");
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState<string>("");

  // New-exercise dialog
  const [newExOpen, setNewExOpen] = useState(false);
  const [nxName, setNxName] = useState("");
  
  const [nxDesc, setNxDesc] = useState("");
  const [nxCategoryId, setNxCategoryId] = useState<string>("none");
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);

  const load = async () => {
    const [{ data: p }, { data: it }, { data: ex }, { data: c }] = await Promise.all([
      supabase.from("workout_plans").select("*").eq("id", planId).maybeSingle(),
      supabase.from("workout_plan_exercises").select("*, exercises(name, category_id)").eq("workout_plan_id", planId).order("order_index"),
      supabase.from("exercises").select("*").order("name"),
      supabase.from("exercise_categories" as any).select("id, name").order("name"),
    ]);
    setPlan(p);
    if (p) {
      setPlanName(p.name ?? "");
      setPlanDesc(p.description ?? "");
      lastSaved.current = JSON.stringify({ name: p.name ?? "", description: p.description ?? "" });
      hasLoaded.current = true;
    }
    setItems(it ?? []); setExercises(ex ?? []);
    setCats(((c as any) ?? []) as { id: string; name: string }[]);
  };
  useEffect(() => { load(); }, [planId]);

  const doSave = async () => {
    const { error } = await supabase
      .from("workout_plans")
      .update({ name: planName, description: planDesc || null })
      .eq("id", planId);
    if (error) { setStatus("error"); return; }
    lastSaved.current = JSON.stringify({ name: planName, description: planDesc });
    setStatus("saved");
    setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 2000);
  };

  useEffect(() => {
    if (!hasLoaded.current) return;
    const current = JSON.stringify({ name: planName, description: planDesc });
    if (current === lastSaved.current) return;
    if (!planName.trim()) { setStatus("error"); return; }
    setStatus("saving");
    const t = setTimeout(() => { doSave(); }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planName, planDesc]);



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
    else { setExId(""); setWeight(""); toast.success("Added"); load(); }
  };

  const remove = async (id: string) => {
    await supabase.from("workout_plan_exercises").delete().eq("id", id);
    load();
  };

  const createExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("exercises").insert({
      trainer_id: u.user!.id,
      name: nxName,
      description: nxDesc || null,
      category_id: nxCategoryId === "none" ? null : nxCategoryId,
    } as any).select("id").single();
    if (error) return toast.error(error.message);
    toast.success("Exercise created");
    setNxName(""); setNxDesc(""); setNxCategoryId("none"); setNewExOpen(false);
    await load();
    if (data?.id) setExId(data.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Input
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            placeholder="Plan name"
            className="!text-3xl font-bold tracking-tight h-auto border-none shadow-none px-0 focus-visible:ring-0 md:!text-3xl"
          />
          <Textarea
            value={planDesc}
            onChange={(e) => setPlanDesc(e.target.value)}
            placeholder="Add a description (optional)"
            rows={2}
            className="resize-none border-none shadow-none px-0 text-muted-foreground focus-visible:ring-0"
          />
          <div className="text-xs text-muted-foreground min-h-[1.25rem]">
            {status === "saving" && <span className="inline-flex items-center gap-1"><Loader2 className="size-3 animate-spin" />Saving…</span>}
            {status === "saved" && <span className="inline-flex items-center gap-1 text-green-600"><Check className="size-3" />Saved</span>}
            {status === "error" && (!planName.trim()
              ? <span className="text-destructive">Name is required</span>
              : <button onClick={doSave} className="text-destructive hover:underline">Couldn't save — retry</button>)}
            {status === "idle" && <span>Changes save automatically · Assign via client page</span>}
          </div>
        </div>
        <Button asChild variant="outline"><Link to="/trainer/plans">Back to plans</Link></Button>
      </div>


      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle>Add exercise to plan</CardTitle>
            <Dialog open={newExOpen} onOpenChange={setNewExOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Plus className="size-4 mr-1" /> New exercise</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create exercise</DialogTitle></DialogHeader>
                <form onSubmit={createExercise} className="space-y-4">
                  <div className="space-y-2"><Label>Name</Label><Input required value={nxName} onChange={(e) => setNxName(e.target.value)} /></div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={nxCategoryId} onValueChange={setNxCategoryId}>
                      <SelectTrigger><SelectValue placeholder="Uncategorized" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Uncategorized</SelectItem>
                        {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2"><Label>Description</Label><Textarea value={nxDesc} onChange={(e) => setNxDesc(e.target.value)} /></div>
                  <Button type="submit" className="w-full">Save</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid sm:grid-cols-5 gap-3 items-end">
            <div className="space-y-2 sm:col-span-2">
              <Label>Exercise</Label>
              <Select value={exId} onValueChange={setExId} required>
                <SelectTrigger><SelectValue placeholder="Choose..." /></SelectTrigger>
                <SelectContent>
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
                    return groups.map((g) => (
                      <SelectGroup key={g.id}>
                        <SelectLabel>{g.name}</SelectLabel>
                        {g.items.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Sets</Label><Input type="number" min="1" value={sets} onChange={(e) => setSets(+e.target.value)} /></div>
            <div className="space-y-2"><Label>Reps</Label><Input type="number" min="1" value={reps} onChange={(e) => setReps(+e.target.value)} /></div>
            <div className="space-y-2"><Label>Weight (kg)</Label><Input type="number" step="0.5" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="optional" /></div>
            <Button type="submit" className="sm:col-span-5" disabled={!exId}><Plus className="size-4 mr-1" /> Add to plan</Button>
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
