import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";

export const Route = createFileRoute("/admin/waitlist")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — Waitlist — ValhallaFit" },
      { name: "description", content: "Emails collected from the marketing site." },
    ],
  }),
  component: Page,
});

type Row = {
  id: string;
  email: string;
  role: string | null;
  source: string | null;
  created_at: string;
};

function Page() {
  return (
    <RoleGuard role="super_admin">
      <AppShell>
        <Waitlist />
      </AppShell>
    </RoleGuard>
  );
}

function Waitlist() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("waitlist_signups")
        .select("id, email, role, source, created_at")
        .order("created_at", { ascending: false });
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) =>
    q.trim() ? r.email.toLowerCase().includes(q.trim().toLowerCase()) : true,
  );

  const exportCsv = () => {
    const csv = [
      "email,role,source,created_at",
      ...filtered.map((r) =>
        [r.email, r.role ?? "", r.source ?? "", r.created_at].join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "valhallafit-waitlist.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Waitlist</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} email{rows.length === 1 ? "" : "s"} collected from the site.
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!filtered.length} className="gap-2">
          <Download className="size-4" /> Export CSV
        </Button>
      </div>

      <Input
        placeholder="Search by email"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-sm"
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !filtered.length ? (
        <p className="text-sm text-muted-foreground">No signups yet.</p>
      ) : (
        <div className="grid gap-2">
          {filtered.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium break-all">{r.email}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex flex-wrap gap-2">
                {r.role && <Badge variant="secondary">{r.role}</Badge>}
                {r.source && <Badge variant="outline">{r.source}</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
