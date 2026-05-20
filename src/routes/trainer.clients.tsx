import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { UserPlus, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/trainer/clients")({
  component: () => <RoleGuard role="trainer"><AppShell><Clients /></AppShell></RoleGuard>,
});

function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("trainer_clients")
      .select("client_id, created_at, profiles!trainer_clients_client_id_fkey(id, full_name)")
      .order("created_at", { ascending: false });
    setClients(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const addClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.rpc("link_client_by_email", { _email: email });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Client added"); setEmail(""); load(); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
        <p className="text-muted-foreground mt-1">Add and manage the people you train.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="size-5" /> Add a client</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={addClient} className="flex gap-2 flex-col sm:flex-row">
            <Input placeholder="client@email.com" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button disabled={busy}>{busy ? "..." : "Add"}</Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">The client must already have a FitCoach account.</p>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-3">
        {clients.map((c) => (
          <Link key={c.client_id} to="/trainer/clients/$clientId" params={{ clientId: c.client_id }}>
            <Card className="hover:border-primary transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-accent flex items-center justify-center font-semibold text-accent-foreground">
                    {(c.profiles?.full_name ?? "?")[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{c.profiles?.full_name ?? "Unnamed"}</div>
                    <div className="text-xs text-muted-foreground">Since {new Date(c.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <ChevronRight className="size-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
        {clients.length === 0 && <p className="text-muted-foreground text-sm">No clients yet.</p>}
      </div>
    </div>
  );
}
