import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { clearMustChangePassword } from "@/lib/clients.functions";
import { RoleGuard } from "@/components/RoleGuard";
import { ClientShell } from "@/components/ClientShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/client/profile")({
  ssr: false,
  component: () => (
    <RoleGuard role="client">
      <ClientShell title="Profile"><Profile /></ClientShell>
    </RoleGuard>
  ),
});

function Profile() {
  const { user, fullName, refresh } = useAuth();
  const [name, setName] = useState(fullName ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const clearFlag = useServerFn(clearMustChangePassword);

  useEffect(() => { setName(fullName ?? ""); }, [fullName]);

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    await refresh();
    toast.success("Profile updated");
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setBusy(false); return toast.error(error.message); }
    try { await clearFlag({}); } catch { /* ignore */ }
    await supabase.auth.refreshSession();
    setBusy(false);
    setPassword("");
    toast.success("Password updated");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Your details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={saveName} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="fn">Full name</Label>
              <Input id="fn" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy}>{busy ? "..." : "Save"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Change password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="np">New password</Label>
              <Input id="np" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy || password.length < 6}>{busy ? "..." : "Update password"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
