import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Dumbbell, ClipboardList, ArrowRight, Plus, UserPlus, Activity, CheckCircle2, Clock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { loadRecentSessions, type RecentSession } from "@/lib/recentSessions";
import { useLoader } from "@/lib/useLoader";
import { must } from "@/lib/loadState";
import { LoadError, StaleNotice } from "@/components/LoadStatus";

export const Route = createFileRoute("/trainer/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Trainer dashboard — ValhallaFit" },
      { name: "description", content: "Manage your clients, plans, and sessions from one dashboard." },
    ],
  }),
  component: () => <RoleGuard role="trainer"><AppShell><Dashboard /></AppShell></RoleGuard>,
});

function Dashboard() {
  const { fullName, user } = useAuth();
  const [stats, setStats] = useState({ clients: 0, exercises: 0, plans: 0, weekSessions: 0 });
  const [recent, setRecent] = useState<RecentSession[]>([]);
  const [recentState, setRecentState] = useState<"loading" | "ok" | "error">("loading");
  const uid = user?.id;

  const loadRecent = async () => {
    if (!uid) return;
    setRecentState("loading");
    try {
      setRecent(await loadRecentSessions(supabase, uid));
      setRecentState("ok");
    } catch {
      setRecentState("error");
    }
  };

  const SL = useLoader();
  const loadStats = () => SL.run(async (cur) => {
    const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString();
    const [c, e, p, w] = await Promise.all([
      supabase.from("trainer_clients").select("id", { count: "exact", head: true }),
      supabase.from("exercises").select("id", { count: "exact", head: true }),
      supabase.from("plans").select("id", { count: "exact", head: true }),
      supabase.from("training_sessions").select("id", { count: "exact", head: true }).gte("started_at", weekAgo),
    ]);
    [c, e, p, w].forEach((r) => must(r));
    if (cur()) setStats({ clients: c.count ?? 0, exercises: e.count ?? 0, plans: p.count ?? 0, weekSessions: w.count ?? 0 });
  });
  useEffect(() => { loadStats(); }, []);

  useEffect(() => { loadRecent(); }, [uid]);

  const cards = [
    { label: "Clients", value: stats.clients, icon: Users, to: "/trainer/clients" as const },
    { label: "Exercises", value: stats.exercises, icon: Dumbbell, to: "/trainer/exercises" as const },
    { label: "Plans", value: stats.plans, icon: ClipboardList, to: "/trainer/plans" as const },
    { label: "Sessions / 7d", value: stats.weekSessions, icon: Activity, to: "/trainer/clients" as const },
  ];

  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back{fullName ? `, ${fullName.split(" ")[0]}` : ""} 💪</h1>
          <p className="text-muted-foreground mt-1">{dateLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm"><Link to="/trainer/clients"><UserPlus className="size-4 mr-1.5" /> Invite client</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/trainer/exercises"><Plus className="size-4 mr-1.5" /> New exercise</Link></Button>
          <Button asChild size="sm"><Link to="/trainer/plans"><Plus className="size-4 mr-1.5" /> New plan</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="group">
            <Card className="h-full border-border/60 shadow-sm transition-all group-hover:shadow-md group-hover:border-primary/40">
              <CardContent className="p-5">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <c.icon className="size-5 text-primary" />
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-bold tracking-tight" aria-busy={!SL.loaded}>{SL.loaded ? c.value : "—"}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">{c.label}</div>
                </div>
                <div className="mt-4 pt-3 border-t border-border/60 text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors flex items-center">
                  View <ArrowRight className="size-3 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Recent client sessions</CardTitle></CardHeader>
        <CardContent>
          {recentState === "loading" && recent.length === 0 ? (
            <p className="text-muted-foreground text-sm" role="status">Loading sessions…</p>
          ) : recentState === "error" ? (
            <div role="alert" className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Couldn't load recent sessions.</span>
              <Button type="button" size="sm" variant="outline" onClick={loadRecent}>Retry</Button>
            </div>
          ) : recent.length === 0 ? (
            <p className="text-muted-foreground text-sm">No sessions yet.</p>
          ) : (
            <ul className="divide-y">
              {recent.map((s) => (
                <li key={s.id}>
                  <Link
                    to="/trainer/clients/$clientId/sessions/$sessionId"
                    params={{ clientId: s.client_id, sessionId: s.id }}
                    className="py-3 flex items-center gap-3 rounded-md hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                  {s.status === "completed" ? <CheckCircle2 className="size-4 text-primary" /> : <Clock className="size-4 text-muted-foreground" />}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium break-words">{s.client_name ?? "Client"} · {s.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(s.started_at).toLocaleDateString()} · {s.status.replace("_", " ")} · {s.logged_by === "trainer" ? "logged by you" : "logged by client"}
                    </div>
                  </div>
                  <span className="text-sm font-medium text-primary shrink-0 px-2">Open</span>
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
