import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const Route = createFileRoute("/admin/trainers")({ ssr: false, component: Page });

type Trainer = { user_id: string; full_name: string | null };

function Page() {
  return (
    <RoleGuard role="super_admin">
      <AppShell>
        <Trainers />
      </AppShell>
    </RoleGuard>
  );
}

function Trainers() {
  const [rows, setRows] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: roleRows } = await supabase.from("user_roles").select("user_id").eq("role", "trainer");
      const ids = (roleRows ?? []).map((r) => r.user_id);
      if (ids.length === 0) { setRows([]); setLoading(false); return; }
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      setRows((profiles ?? []).map((p) => ({ user_id: p.id, full_name: p.full_name })));
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Approved trainers</h1>
        <p className="text-muted-foreground text-sm">All active trainers in the gym.</p>
      </div>
      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No trainers yet.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((t) => (
            <Card key={t.user_id}>
              <CardHeader>
                <div className="font-semibold">{t.full_name ?? "Unnamed"}</div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
