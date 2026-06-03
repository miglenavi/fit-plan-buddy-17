import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Loader2, Check, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/trainer/plans/$planId")({
  ssr: false,
  component: PlanDetail,
});

function PlanDetail() {
  const { planId } = useParams({ from: "/trainer/plans/$planId" });
  const navigate = useNavigate();
  const [plan, setPlan] = useState<any>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [trainings, setTrainings] = useState<any[]>([]);
  const [adding, setAdding] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const loaded = useRef(false);
  const lastSaved = useRef("");

  const load = async () => {
    const [{ data: p }, { data: t }] = await Promise.all([
      supabase.from("plans").select("*").eq("id", planId).maybeSingle(),
      supabase.from("trainings").select("id, name, description, order_index, training_exercises(id)").eq("plan_id", planId).order("order_index"),
    ]);
    setPlan(p);
    if (p) {
      setName(p.name ?? "");
      setDesc(p.description ?? "");
      lastSaved.current = JSON.stringify({ name: p.name ?? "", description: p.description ?? "" });
      loaded.current = true;
    }
    setTrainings(t ?? []);
  };
  useEffect(() => { load(); }, [planId]);

  useEffect(() => {
    if (!loaded.current) return;
    const cur = JSON.stringify({ name, description: desc });
    if (cur === lastSaved.current) return;
    if (!name.trim()) { setStatus("error"); return; }
    setStatus("saving");
    const t = setTimeout(async () => {
      const { error } = await supabase.from("plans").update({ name, description: desc || null }).eq("id", planId);
      if (error) setStatus("error");
      else { lastSaved.current = cur; setStatus("saved"); setTimeout(() => setStatus((s) => s === "saved" ? "idle" : s), 1500); }
    }, 700);
    return () => clearTimeout(t);
  }, [name, desc, planId]);

  const addTraining = async () => {
    if (adding) return;
    setAdding(true);
    try {
      const { data, error } = await supabase.from("trainings").insert({
        plan_id: planId,
        name: "Untitled training",
        order_index: trainings.length,
      }).select("id, name, description, order_index, training_exercises(id)").single();
      if (error || !data) { toast.error(error?.message ?? "Could not add training"); return; }
      setTrainings((prev) => [...prev, data]);
      toast.success("Training added");
      navigate({ to: "/trainer/plans/$planId/trainings/$trainingId", params: { planId, trainingId: data.id } });
    } finally {
      setAdding(false);
    }
  };

  const removeTraining = async (id: string) => {
    if (!confirm("Delete this training?")) return;
    const { error } = await supabase.from("trainings").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Plan name"
            className="!text-3xl font-bold tracking-tight h-auto border-none shadow-none px-0 focus-visible:ring-0 md:!text-3xl" />
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Add a description (optional)" rows={2}
            className="resize-none border-none shadow-none px-0 text-muted-foreground focus-visible:ring-0" />
          <div className="text-xs text-muted-foreground min-h-[1.25rem]">
            {status === "saving" && <span className="inline-flex items-center gap-1"><Loader2 className="size-3 animate-spin" />Saving…</span>}
            {status === "saved" && <span className="inline-flex items-center gap-1 text-green-600"><Check className="size-3" />Saved</span>}
            {status === "error" && <span className="text-destructive">{!name.trim() ? "Name is required" : "Couldn't save"}</span>}
            {status === "idle" && <span>Changes save automatically · Assign via client page</span>}
          </div>
        </div>
        <Button asChild variant="outline"><Link to="/trainer/plans">Back to plans</Link></Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Trainings</CardTitle>
          <Button size="sm" onClick={addTraining} disabled={adding}>
            {adding ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Plus className="size-4 mr-1" />}
            {adding ? "Creating…" : "Add training"}
          </Button>
        </CardHeader>
        <CardContent>
          {trainings.length === 0 ? (
            <p className="text-muted-foreground text-sm">No trainings yet. Add one — e.g. "Lower Body A", "Push Day".</p>
          ) : (
            <ul className="divide-y">
              {trainings.map((t, i) => (
                <li key={t.id} className="py-3 flex items-center gap-3">
                  <span className="size-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-semibold">{i + 1}</span>
                  <Link to="/trainer/plans/$planId/trainings/$trainingId" params={{ planId, trainingId: t.id }} className="flex-1 min-w-0">
                    <div className="font-medium truncate">{t.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {(t.training_exercises?.length ?? 0)} exercise{(t.training_exercises?.length ?? 0) === 1 ? "" : "s"}
                      {t.description ? ` · ${t.description}` : ""}
                    </div>
                  </Link>
                  <Button size="icon" variant="ghost" onClick={() => removeTraining(t.id)}><Trash2 className="size-4 text-muted-foreground" /></Button>
                  <Link to="/trainer/plans/$planId/trainings/$trainingId" params={{ planId, trainingId: t.id }}>
                    <ChevronRight className="size-5 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
