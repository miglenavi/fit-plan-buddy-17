import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { RoleGuard } from "@/components/RoleGuard";
import { ClientShell } from "@/components/ClientShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { startSession } from "@/lib/sessions.functions";

export const Route = createFileRoute("/client/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Today's workout — ValhallaFit" },
      { name: "description", content: "View your assigned plans and start your training sessions." },
    ],
  }),
  component: () => <RoleGuard role="client"><ClientShell title="Today"><ClientToday /></ClientShell></RoleGuard>,
});

function ClientToday() {
  const { fullName } = useAuth();
  const navigate = useNavigate();
  const start = useServerFn(startSession);
  const [program, setProgram] = useState<any>(null);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [lastDone, setLastDone] = useState<string | null>(null);
  const [inProgress, setInProgress] = useState<{ id: string; training_id: string } | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const [hasTrainer, setHasTrainer] = useState<boolean | null>(null);
  const [todayBooking, setTodayBooking] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: progs } = await supabase
        .from("client_programs")
        .select("id, plan_id, status, plans(id, name, description)")
        .eq("status", "active")
        .order("start_date", { ascending: false })
        .limit(1);
      const p = progs?.[0];
      setProgram(p ?? null);
      if (p?.plan_id) {
        const { data: t } = await supabase
          .from("trainings")
          .select("id, name, description, order_index, training_exercises(id)")
          .eq("plan_id", p.plan_id)
          .order("order_index");
        setTrainings(t ?? []);
      }
      const { data: last } = await supabase
        .from("training_sessions")
        .select("training_id, completed_at")
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1);
      setLastDone(last?.[0]?.training_id ?? null);

      const { data: ip } = await supabase
        .from("training_sessions")
        .select("id, training_id")
        .eq("status", "in_progress")
        .order("started_at", { ascending: false })
        .limit(1);
      setInProgress(ip?.[0] ?? null);

      const { data: link } = await supabase
        .from("trainer_clients")
        .select("trainer_id")
        .is("archived_at", null)
        .limit(1);
      setHasTrainer(!!link?.[0]);

      const now = new Date();
      const dayEnd = new Date(now);
      dayEnd.setHours(23, 59, 59, 999);
      const { data: bk } = await supabase
        .from("bookings")
        .select("id, start_at, end_at, status")
        .eq("status", "booked")
        .gte("end_at", now.toISOString())
        .lte("start_at", dayEnd.toISOString())
        .order("start_at")
        .limit(1);
      setTodayBooking(bk?.[0] ?? null);
    })();
  }, []);


  // Next suggestion: the training after the last completed one, in order_index. Wraps around.
  let nextId: string | null = null;
  if (trainings.length > 0) {
    if (!lastDone) nextId = trainings[0].id;
    else {
      const idx = trainings.findIndex((t) => t.id === lastDone);
      nextId = trainings[(idx + 1) % trainings.length]?.id ?? trainings[0].id;
    }
  }

  const doStart = async (trainingId: string) => {
    setStarting(trainingId);
    try {
      const res = await start({ data: { trainingId } });
      navigate({ to: "/client/sessions/$sessionId", params: { sessionId: res.sessionId } });
    } catch (e: any) {
      setStarting(null);
      alert(e.message ?? "Couldn't start");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hey{fullName ? `, ${fullName.split(" ")[0]}` : ""} 👋</h1>
        {program?.plans?.name && <p className="text-sm text-muted-foreground mt-0.5">Current plan: {program.plans.name}</p>}
      </div>

      {todayBooking && (
        <Card className="border-primary/60 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <CalendarClock className="size-5 text-primary shrink-0" />
            <div className="text-sm">
              <div className="font-semibold">
                You have a session booked at{" "}
                {new Date(todayBooking.start_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} today
              </div>
              <div className="text-xs text-muted-foreground">
                Start your training when you get there — it links to this booking automatically.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!program && hasTrainer !== null && (
        <Card><CardContent className="p-5 text-sm text-center space-y-3">
          {hasTrainer ? (
            <p className="text-muted-foreground">
              Your trainer hasn't assigned a plan yet — check back soon 🌿
            </p>
          ) : (
            <>
              <p className="text-muted-foreground">
                No active plan yet. Connect with a trainer to get your first plan 🌿
              </p>
              <Link to="/client/trainer">
                <Button variant="outline" size="sm">Find a trainer</Button>
              </Link>
            </>
          )}
        </CardContent></Card>
      )}



      {program && trainings.length === 0 && (
        <Card><CardContent className="p-5 text-sm text-muted-foreground text-center">
          Your plan is being put together — no trainings yet.
        </CardContent></Card>
      )}

      {inProgress && (
        <Card className="border-primary/60 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider text-primary font-semibold">In progress</div>
              <div className="font-semibold truncate">
                {trainings.find((t) => t.id === inProgress.training_id)?.name ?? "Your session"}
              </div>
            </div>
            <Button onClick={() => navigate({ to: "/client/sessions/$sessionId", params: { sessionId: inProgress.id } })}>
              Resume
            </Button>
          </CardContent>
        </Card>
      )}

      {trainings.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 px-1">Pick a training</h2>
          <div className="space-y-3">
            {trainings.map((t) => {
              const isNext = t.id === nextId;
              const resumeHere = inProgress?.training_id === t.id;
              return (
                <Card key={t.id} className={isNext ? "border-primary/60 bg-primary/5" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold flex items-center gap-1.5">
                          {t.name}
                          {isNext && !resumeHere && <span className="text-[10px] font-medium uppercase tracking-wider text-primary bg-primary/15 px-1.5 py-0.5 rounded inline-flex items-center gap-1"><Sparkles className="size-3" />Next up</span>}
                        </div>
                        {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                        <div className="text-xs text-muted-foreground mt-1">{t.training_exercises?.length ?? 0} exercises</div>
                      </div>
                    </div>
                    {resumeHere ? (
                      <Button className="w-full mt-3" onClick={() => navigate({ to: "/client/sessions/$sessionId", params: { sessionId: inProgress!.id } })}>
                        <Play className="size-4 mr-1.5" /> Resume session
                      </Button>
                    ) : (
                      <Button className="w-full mt-3" disabled={starting === t.id} onClick={() => doStart(t.id)}>
                        <Play className="size-4 mr-1.5" /> {starting === t.id ? "Starting…" : "Start training"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <Card>
        <CardContent className="p-4">
          <Link to="/client/history" className="flex items-center justify-between text-sm">
            <span className="font-medium">View history</span>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
