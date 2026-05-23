import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { inviteClient, resendClientInvite } from "@/lib/clients.functions";
import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { UserPlus, ChevronRight, Mail } from "lucide-react";

export const Route = createFileRoute("/trainer/clients")({
  ssr: false,
  component: () => <RoleGuard role="trainer"><AppShell><Clients /></AppShell></RoleGuard>,
});

function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const invite = useServerFn(inviteClient);
  const resend = useServerFn(resendClientInvite);

  const load = async () => {
    const { data } = await supabase
      .from("trainer_clients")
      .select("client_id, created_at, profiles!trainer_clients_client_profile_fk(id, full_name)")
      .order("created_at", { ascending: false });
    setClients(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const redirectTo = () =>
    typeof window !== "undefined" ? `${window.location.origin}/auth` : "";

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await invite({ data: { email, fullName, redirectTo: redirectTo() } });
      toast.success(`Invite sent to ${email}`);
      setEmail("");
      setFullName("");
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to invite client");
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async (clientId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await resend({ data: { clientId, redirectTo: redirectTo() } });
      toast.success(`New invite link sent to ${res.email}`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to resend invite");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
        <p className="text-muted-foreground mt-1">
          Invite clients by email — they'll get a link to set their own password.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="size-5" /> Invite a client</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex gap-2 flex-col sm:flex-row">
            <Input placeholder="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <Input placeholder="client@email.com" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button disabled={busy}>{busy ? "..." : "Send invite"}</Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">
            Your client receives an email with a secure link to activate their account and set a password.
          </p>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-3">
        {clients.map((c) => (
          <Card key={c.client_id} className="hover:border-primary transition-colors">
            <CardContent className="p-4 space-y-3">
              <Link to="/trainer/clients/$clientId" params={{ clientId: c.client_id }} className="flex items-center justify-between">
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
              </Link>
              <Button type="button" size="sm" variant="outline" className="w-full" onClick={(e) => handleResend(c.client_id, e)}>
                <Mail className="size-3.5 mr-1.5" /> Resend invite link
              </Button>
            </CardContent>
          </Card>
        ))}
        {clients.length === 0 && <p className="text-muted-foreground text-sm">No clients yet.</p>}
      </div>
    </div>
  );
}
