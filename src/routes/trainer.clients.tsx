import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createClientWithTempPassword, resetClientTempPassword } from "@/lib/clients.functions";
import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, ChevronRight, Copy, KeyRound } from "lucide-react";

export const Route = createFileRoute("/trainer/clients")({
  ssr: false,
  component: () => <RoleGuard role="trainer"><AppShell><Clients /></AppShell></RoleGuard>,
});

interface CredentialDialogState {
  email: string;
  tempPassword: string;
}

function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [tempPasswords, setTempPasswords] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [credDialog, setCredDialog] = useState<CredentialDialogState | null>(null);
  const createClient = useServerFn(createClientWithTempPassword);
  const resetPwd = useServerFn(resetClientTempPassword);

  const load = async () => {
    const { data } = await supabase
      .from("trainer_clients")
      .select("client_id, created_at, profiles!trainer_clients_client_profile_fk(id, full_name)")
      .order("created_at", { ascending: false });
    setClients(data ?? []);

    const { data: temps } = await supabase
      .from("client_temp_passwords")
      .select("client_id, temp_password");
    const map: Record<string, string> = {};
    (temps ?? []).forEach((t: any) => { map[t.client_id] = t.temp_password; });
    setTempPasswords(map);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await createClient({ data: { email, fullName } });
      setCredDialog({ email: res.email, tempPassword: res.tempPassword });
      setEmail("");
      setFullName("");
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create client");
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async (clientId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Generate a new temporary password? The old one will stop working.")) return;
    try {
      const res = await resetPwd({ data: { clientId } });
      const client = clients.find((c) => c.client_id === clientId);
      setCredDialog({
        email: client?.profiles?.full_name ?? "client",
        tempPassword: res.tempPassword,
      });
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to reset password");
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
        <p className="text-muted-foreground mt-1">Create client accounts and share the temporary password with them.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="size-5" /> Add a client</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex gap-2 flex-col sm:flex-row">
            <Input placeholder="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <Input placeholder="client@email.com" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button disabled={busy}>{busy ? "..." : "Create client"}</Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">A temporary password is generated — share it with your client. They'll set their own password on first login.</p>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-3">
        {clients.map((c) => {
          const temp = tempPasswords[c.client_id];
          return (
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
                {temp ? (
                  <div className="rounded-md bg-muted px-3 py-2 text-xs space-y-1">
                    <div className="text-muted-foreground">Temporary password (until first login):</div>
                    <div className="flex items-center justify-between gap-2">
                      <code className="font-mono text-sm">{temp}</code>
                      <div className="flex gap-1">
                        <Button type="button" size="sm" variant="ghost" onClick={(e) => { e.preventDefault(); e.stopPropagation(); copy(temp); }}>
                          <Copy className="size-3.5" />
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={(e) => handleReset(c.client_id, e)}>
                          <KeyRound className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button type="button" size="sm" variant="outline" className="w-full" onClick={(e) => handleReset(c.client_id, e)}>
                    <KeyRound className="size-3.5 mr-1.5" /> Reset password
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
        {clients.length === 0 && <p className="text-muted-foreground text-sm">No clients yet.</p>}
      </div>

      <Dialog open={!!credDialog} onOpenChange={(o) => !o && setCredDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Client credentials</DialogTitle>
            <DialogDescription>
              Share these with your client. They will be asked to set their own password on first login.
            </DialogDescription>
          </DialogHeader>
          {credDialog && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Email</div>
                <div className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2">
                  <code className="font-mono text-sm">{credDialog.email}</code>
                  <Button type="button" size="sm" variant="ghost" onClick={() => copy(credDialog.email)}>
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Temporary password</div>
                <div className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2">
                  <code className="font-mono text-sm">{credDialog.tempPassword}</code>
                  <Button type="button" size="sm" variant="ghost" onClick={() => copy(credDialog.tempPassword)}>
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCredDialog(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
