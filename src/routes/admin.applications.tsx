import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { inviteTrainer } from "@/lib/trainers.functions";

export const Route = createFileRoute("/admin/applications")({ ssr: false, component: Page });

type Application = {
  user_id: string;
  full_name: string;
  email: string;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
};

function Page() {
  return (
    <RoleGuard role="super_admin">
      <AppShell>
        <Applications />
      </AppShell>
    </RoleGuard>
  );
}

function Applications() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const load = async () => {
    setLoading(true);
    const q = supabase
      .from("trainer_applications")
      .select("user_id, full_name, email, note, status, rejection_reason, created_at")
      .order("created_at", { ascending: false });
    const { data, error } = filter === "pending" ? await q.eq("status", "pending") : await q;
    if (error) toast.error(error.message);
    setApps((data as Application[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const approve = async (id: string) => {
    const { error } = await supabase.rpc("approve_trainer", { _user_id: id });
    if (error) toast.error(error.message);
    else { toast.success("Trainer approved"); await load(); }
  };

  const reject = async () => {
    if (!rejectingId) return;
    const { error } = await supabase.rpc("reject_trainer", { _user_id: rejectingId, _reason: reason });
    if (error) toast.error(error.message);
    else {
      toast.success("Application rejected");
      setRejectingId(null);
      setReason("");
      await load();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trainer applications</h1>
          <p className="text-muted-foreground text-sm">Approve or reject trainer signup requests.</p>
        </div>
        <div className="flex gap-2">
          <InviteTrainerDialog onInvited={load} />
          <Button variant={filter === "pending" ? "default" : "outline"} size="sm" onClick={() => setFilter("pending")}>Pending</Button>
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>All</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : apps.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No applications.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {apps.map((a) => (
            <Card key={a.user_id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <div className="font-semibold">{a.full_name}</div>
                  <div className="text-sm text-muted-foreground">{a.email}</div>
                </div>
                <Badge variant={a.status === "rejected" ? "destructive" : a.status === "approved" ? "default" : "secondary"} className="capitalize">
                  {a.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {a.note && <p className="text-sm bg-muted/40 rounded-lg p-3">{a.note}</p>}
                {a.status === "rejected" && a.rejection_reason && (
                  <p className="text-sm text-destructive">Reason: {a.rejection_reason}</p>
                )}
                {a.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => approve(a.user_id)}>Approve</Button>
                    <Dialog open={rejectingId === a.user_id} onOpenChange={(o) => { if (!o) { setRejectingId(null); setReason(""); } }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" onClick={() => setRejectingId(a.user_id)}>Reject</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reject {a.full_name}?</DialogTitle>
                        </DialogHeader>
                        <Textarea placeholder="Reason (sent to the applicant)" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
                        <DialogFooter>
                          <Button variant="ghost" onClick={() => { setRejectingId(null); setReason(""); }}>Cancel</Button>
                          <Button variant="destructive" onClick={reject}>Reject</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function InviteTrainerDialog({ onInvited }: { onInvited: () => void | Promise<void> }) {
  const invite = useServerFn(inviteTrainer);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!email || !fullName) {
      toast.error("Name and email are required");
      return;
    }
    setSubmitting(true);
    try {
      await invite({ data: { email: email.trim(), fullName: fullName.trim() } });
      toast.success(`Invitation sent to ${email}`);
      setOpen(false);
      setEmail("");
      setFullName("");
      await onInvited();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to send invitation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Invite trainer</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a trainer</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="invite-name">Full name</Label>
            <Input id="invite-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" />
          </div>
          <p className="text-xs text-muted-foreground">
            They'll receive an email invitation. Once they sign up, they'll be granted the trainer role automatically.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? "Sending…" : "Send invitation"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
