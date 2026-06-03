import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { ClientShell } from "@/components/ClientShell";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/client/history")({
  ssr: false,
  component: () => <RoleGuard role="client"><ClientShell title="History"><HistoryView /></ClientShell></RoleGuard>,
});

function monthLabel(d: string) {
  return new Date(d).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function HistoryView() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("training_sessions")
        .select("id, started_at, completed_at, status, logged_by, trainings(name)")
        .order("started_at", { ascending: false });
      setItems(data ?? []);
    })();
  }, []);

  const sortKey = (a: any) => a.completed_at || a.started_at || "";
  const groups = items.reduce<Record<string, any[]>>((acc, it) => {
    const k = monthLabel(sortKey(it));
    (acc[k] ??= []).push(it);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">History</h1>
        <p className="text-sm text-muted-foreground mt-0.5">All your past training sessions</p>
      </div>
      {items.length === 0 && <p className="text-muted-foreground text-sm">No sessions yet.</p>}
      {Object.entries(groups).map(([month, list]) => (
        <section key={month}>
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 px-1">{month}</h2>
          <Card><CardContent className="p-0">
            <ul className="divide-y">
              {list.map((s) => (
                <li key={s.id}>
                  <Link to="/client/sessions/$sessionId" params={{ sessionId: s.id }}
                    className="flex items-center justify-between px-4 py-3 hover:bg-accent/40 transition-colors">
                    <div className="flex items-center gap-3">
                      {s.status === "completed"
                        ? <CheckCircle2 className="size-5 text-primary shrink-0" />
                        : <Clock className="size-5 text-muted-foreground shrink-0" />}
                      <div>
                        <div className="font-medium text-sm">{s.trainings?.name ?? "Training"}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(s.completed_at || s.started_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                          {s.logged_by === "trainer" ? " · logged by trainer" : ""}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent></Card>
        </section>
      ))}
    </div>
  );
}
