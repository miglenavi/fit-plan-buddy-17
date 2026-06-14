import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { AssignPlanDialog } from "@/components/AssignPlanDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Play, CheckCircle2, Clock, Archive } from "lucide-react";
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
  const [inProgress, setInProgress] = useState<{ id: string; training_id: string; trainings: { name: string } | null } | null>(null);
  const [starting, setStarting] = useState<string | null>(null);

  const load = async () => {
    const [{ data: p }, { data: pr }, { data: ss }, { data: ip }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", clientId).maybeSingle(),
      supabase.from("client_programs").select("*, plans(id, name, description)").eq("client_id", clientId).order("start_date", { ascending: false }),
      supabase.from("training_sessions")
        .select("id, started_at, completed_at, status, logged_by, trainings(name)")
        .eq("client_id", clientId)
        .order("started_at", { ascending: false })
        .limit(20),
      supabase.from("training_sessions")
        .select("id, training_id, trainings(name)")
        .eq("client_id", clientId)
        .eq("status", "in_progress")
        .order("started_at", { ascending: false })
        .limit(1),
    ]);
    setProfile(p); setPrograms(pr ?? []); setSessions(ss ?? []);
    setInProgress((ip?.[0] as any) ?? null);

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
    if (starting) return;
    setStarting(trainingId);
    try {
      const res = await start({ data: { trainingId, clientId } });
      navigate({ to: "/trainer/clients/$clientId/sessions/$sessionId", params: { clientId, sessionId: res.sessionId } });
    } catch (e: any) {
      setStarting(null);
      toast.error(e.message ?? "Couldn't start session");
    }
  };

  const archiveClient = async () => {
    if (!confirm("Archive this client? They'll be hidden from your active list. Their workout history is kept.")) return;
    const { error } = await supabase
      .from("trainer_clients")
      .update({ archived_at: new Date().toISOString() })
      .eq("client_id", clientId);
    if (error) return toast.error(error.message);
    toast.success("Client archived");
    navigate({ to: "/trainer/clients" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{profile?.full_name ?? "Client"}</h1>
          <p className="text-muted-foreground mt-1">Plan & training history</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <AssignPlanDialog
            clientId={clientId}
            onAssigned={load}
            trigger={<Button><Plus className="size-4 mr-1" /> Assign plan</Button>}
          />
          <Button variant="outline" onClick={archiveClient}>
            <Archive className="size-4 mr-1.5" /> Archive client
          </Button>
        </div>
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

      {inProgress && (
        <Card className="border-primary/60 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider text-primary font-semibold">Session in progress</div>
              <div className="font-semibold truncate">{inProgress.trainings?.name ?? "Training"}</div>
            </div>
            <Button onClick={() => navigate({ to: "/trainer/clients/$clientId/sessions/$sessionId", params: { clientId, sessionId: inProgress.id } })}>
              Resume
            </Button>
          </CardContent>
        </Card>
      )}

      {trainings.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Start a training for {profile?.full_name?.split(" ")[0] ?? "this client"}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-2">
              {trainings.map((t) => {
                const resumeHere = inProgress?.training_id === t.id;
                const isStarting = starting === t.id;
                return (
                  <Button
                    key={t.id}
                    variant="outline"
                    className="justify-between h-auto py-3"
                    disabled={isStarting}
                    onClick={() => resumeHere
                      ? navigate({ to: "/trainer/clients/$clientId/sessions/$sessionId", params: { clientId, sessionId: inProgress!.id } })
                      : startFor(t.id)}
                  >
                    <span>{t.name}{resumeHere ? " · resume" : ""}</span>
                    <Play className="size-4" />
                  </Button>
                );
              })}
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
                  <Button size="sm" variant="ghost" onClick={() => navigate({ to: "/trainer/clients/$clientId/sessions/$sessionId", params: { clientId, sessionId: s.id } })}>
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
