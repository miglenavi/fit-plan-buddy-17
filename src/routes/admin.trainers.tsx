import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useViewAs } from "@/lib/viewAs";
import type { AppRole } from "@/lib/auth";
import { Eye } from "lucide-react";

export const Route = createFileRoute("/admin/trainers")({ ssr: false, component: Page });

type Row = { user_id: string; full_name: string | null; roles: AppRole[] };

function Page() {
  return (
    <RoleGuard role="super_admin">
      <AppShell>
        <Users />
      </AppShell>
    </RoleGuard>
  );
}

function Users() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "trainer" | "client">("all");
  const { startViewAs } = useViewAs();
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: roleRows }, { data: profiles }] = await Promise.all([
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("profiles").select("id, full_name"),
      ]);
      const byId = new Map<string, Row>();
      for (const p of profiles ?? []) {
        byId.set(p.id, { user_id: p.id, full_name: p.full_name, roles: [] });
      }
      for (const r of roleRows ?? []) {
        const row = byId.get(r.user_id);
        if (row) row.roles.push(r.role as AppRole);
      }
      setRows(Array.from(byId.values()).sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? "")));
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) => {
    if (filter !== "all" && !r.roles.includes(filter)) return false;
    if (q && !(r.full_name ?? "").toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const handleViewAs = async (r: Row) => {
    await startViewAs(r.user_id);
    if (r.roles.includes("trainer") || r.roles.includes("super_admin")) nav({ to: "/trainer" });
    else if (r.roles.includes("client")) nav({ to: "/client" });
    else nav({ to: "/pending" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground text-sm">Preview the app as any trainer or client (read-only).</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Search by name…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        {(["all", "trainer", "client"] as const).map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)} className="capitalize">
            {f}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No users match.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((r) => (
            <Card key={r.user_id}>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{r.full_name ?? "Unnamed"}</div>
                  <div className="flex gap-1 mt-1">
                    {r.roles.length === 0 && <Badge variant="outline">no role</Badge>}
                    {r.roles.map((role) => (
                      <Badge key={role} variant="secondary" className="capitalize">{role.replace("_", " ")}</Badge>
                    ))}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleViewAs(r)}>
                  <Eye className="size-4 mr-1.5" /> View as
                </Button>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
