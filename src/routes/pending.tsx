import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Swords, LogOut } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pending")({ ssr: false, component: PendingPage });

type Application = {
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  note: string | null;
  full_name: string;
};

function PendingPage() {
  const { user, role, loading, signOut, refresh } = useAuth();
  const nav = useNavigate();
  const [app, setApp] = useState<Application | null>(null);
  const [loadingApp, setLoadingApp] = useState(true);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoadingApp(true);
    const { data } = await supabase
      .from("trainer_applications")
      .select("status, rejection_reason, note, full_name")
      .eq("user_id", user.id)
      .maybeSingle();
    setApp(data as Application | null);
    setNote(data?.note ?? "");
    setLoadingApp(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" />;
  if (role) {
    if (role === "super_admin") return <Navigate to="/admin/applications" />;
    if (role === "trainer") return <Navigate to="/trainer" />;
    if (role === "client") return <Navigate to="/client" />;
  }

  const reapply = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("reapply_trainer", { _note: note });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Application resubmitted!");
      await load();
      await refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-accent/30">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="size-12 rounded-2xl bg-primary flex items-center justify-center">
            <Swords className="size-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">ValhallaFit</h1>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="font-semibold">Trainer application</div>
            {app && (
              <Badge variant={app.status === "rejected" ? "destructive" : app.status === "approved" ? "default" : "secondary"} className="capitalize">
                {app.status}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingApp ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !app ? (
              <p className="text-sm text-muted-foreground">
                We couldn't find an application linked to your account.
              </p>
            ) : app.status === "pending" ? (
              <>
                <p className="text-sm">
                  Hi {app.full_name}, your application is under review. You'll receive an email as soon as a super admin decides.
                </p>
                <p className="text-xs text-muted-foreground">You can close this tab and come back later.</p>
              </>
            ) : app.status === "rejected" ? (
              <>
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  <div className="font-medium text-destructive mb-1">Application rejected</div>
                  <div className="text-foreground/80">{app.rejection_reason || "No reason provided."}</div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Update your note and re-apply</label>
                  <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
                <Button className="w-full" disabled={busy} onClick={reapply}>
                  {busy ? "Submitting…" : "Re-apply"}
                </Button>
              </>
            ) : null}

            <Button variant="ghost" className="w-full" onClick={async () => { await signOut(); nav({ to: "/auth" }); }}>
              <LogOut className="size-4 mr-2" /> Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
