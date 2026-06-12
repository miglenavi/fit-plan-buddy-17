import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { AssignPlanDialog } from "@/components/AssignPlanDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Play, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { startSession } from "@/lib/sessions.functions";

export const Route = createFileRoute("/trainer/clients/$clientId")({
  ssr: false,
  component: ClientDetail,
});

function ClientDetail() {
  const { clientId } = useParams({ from: "/trainer/clients/$clientId" });
  const navigate = useNavigate();
  const start = useServerFn(startSession);
  const [profile, setProfile] = useState<any>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);

  const load = async () => {
    const [{ data: p }, { data: pr }, { data: ss }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", clientId).maybeSingle(),
      supabase.from("client_programs").select("*, plans(id, name, description)").eq("client_id", clientId).order("start_date", { ascending: false }),
      supabase.from("training_sessions")
        .select("id, started_at, completed_at, status, logged_by, trainings(name)")
        .eq("client_id", clientId)
        .order("started_at", { ascending: false })
        .limit(20),
    ]);
    setProfile(p); setPrograms(pr ?? []); setSessions(ss ?? []);

    // active program → trainings to start
    const active = (pr ?? []).find((x: any) => x.status === "active");
    if (active?.plan_id) {
      const { data: t } = await supabase.from("trainings").select("id, name, order_index").eq("plan_id", active.plan_id).order("order_index");
      setTrainings(t ?? []);
    } else setTrainings([]);
  };
  useEffect(() => { load(); }, [clientId]);



  const endProgram = async (id: string) => {
    if (!confirm("Mark this program as completed?")) return;
    await supabase.from("client_programs").update({ status: "completed", end_date: new Date().toISOString().slice(0, 10) }).eq("id", id);
    load();
  };

  const startFor = async (trainingId: string) => {
    try {
      const res = await start({ data: { trainingId, clientId } });
      navigate({ to: "/client/sessions/$sessionId", params: { sessionId: res.sessionId } });
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't start session");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{profile?.full_name ?? "Client"}</h1>
          <p className="text-muted-foreground mt-1">Plan & training history</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="size-4 mr-1" /> Assign plan</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign a plan</DialogTitle></DialogHeader>
            <form onSubmit={assignPlan} className="space-y-4">
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select value={pickPlan} onValueChange={setPickPlan}>
                  <SelectTrigger><SelectValue placeholder="Pick a plan…" /></SelectTrigger>
                  <SelectContent>
                    {plans.map((pl) => <SelectItem key={pl.id} value={pl.id}>{pl.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Start date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required /></div>
                <div className="space-y-2"><Label>End date (optional)</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
              </div>
              <Button type="submit" className="w-full" disabled={!pickPlan}>Assign</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Assigned plans</CardTitle></CardHeader>
        <CardContent>
          {programs.length === 0 ? (
            <p className="text-muted-foreground text-sm">No plans assigned yet.</p>
          ) : (
            <ul className="divide-y">
              {programs.map((p) => (
                <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">
                      {p.plans?.name ?? "Plan"}
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${p.status === "active" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {p.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(p.start_date).toLocaleDateString()}{p.end_date ? ` → ${new Date(p.end_date).toLocaleDateString()}` : " · ongoing"}
                    </div>
                  </div>
                  {p.status === "active" && <Button size="sm" variant="outline" onClick={() => endProgram(p.id)}>End</Button>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {trainings.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Start a training for {profile?.full_name?.split(" ")[0] ?? "this client"}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-2">
              {trainings.map((t) => (
                <Button key={t.id} variant="outline" className="justify-between h-auto py-3" onClick={() => startFor(t.id)}>
                  <span>{t.name}</span>
                  <Play className="size-4" />
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">Log the session yourself during in-person coaching.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Recent sessions</CardTitle></CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No sessions yet.</p>
          ) : (
            <ul className="divide-y">
              {sessions.map((s) => (
                <li key={s.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {s.status === "completed" ? <CheckCircle2 className="size-4 text-primary" /> : <Clock className="size-4 text-muted-foreground" />}
                    <div>
                      <div className="font-medium">{s.trainings?.name ?? "Training"}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(s.started_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        {s.logged_by === "trainer" ? " · logged by you" : " · logged by client"}
                        {" · "}{s.status.replace("_", " ")}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => navigate({ to: "/client/sessions/$sessionId", params: { sessionId: s.id } })}>
                    Open
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
