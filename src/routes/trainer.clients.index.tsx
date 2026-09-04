import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { resendClientInvite, listPendingClients } from "@/lib/clients.functions";
import { AssignPlanDialog } from "@/components/AssignPlanDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ChevronRight, Mail, ClipboardList, UserRoundCheck, Link as LinkIcon, Copy, KeyRound } from "lucide-react";

export const Route = createFileRoute("/trainer/clients/")({
  ssr: false,
  component: Clients,
});

function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [linkName, setLinkName] = useState("");
  const [creatingLink, setCreatingLink] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [pendingFirstLogin, setPendingFirstLogin] = useState<string[]>([]);
  const resend = useServerFn(resendClientInvite);
  const loadPending = useServerFn(listPendingClients);


  const load = async () => {
    const [{ data }, { data: reqs }, { data: invs }] = await Promise.all([
      supabase
        .from("trainer_clients")
        .select("client_id, created_at, profiles!trainer_clients_client_profile_fk(id, full_name)")
        .is("archived_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("trainer_requests")
        .select("id, client_id, note, created_at, profiles:client_id(full_name)")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("client_invites")
        .select("id, token, full_name, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);
    setClients(data ?? []);
    setRequests(reqs ?? []);
    setLinks(invs ?? []);
    try {
      const res = await loadPending({ data: {} } as any);
      setPendingFirstLogin(res.pending ?? []);
    } catch {
      setPendingFirstLogin([]);
    }
  };


  useEffect(() => { load(); }, []);

  const inviteUrl = (token: string) =>
    typeof window !== "undefined" ? `${window.location.origin}/join/${token}` : "";

  const mailtoLink = (l: any) => {
    const url = inviteUrl(l.token);
    const subject = "Your ValhallaFit invite";
    const body = `Hi${l.full_name ? ` ${l.full_name}` : ""},\n\nHere's your invite link to join me on ValhallaFit:\n\n${url}\n\nOpen it, create your account (or log in), and we'll be connected automatically.\n`;
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };


  const createInviteLink = async () => {
    setCreatingLink(true);
    const { data: auth } = await supabase.auth.getUser();
    const token = crypto.randomUUID().replace(/-/g, "");
    const { error } = await supabase.from("client_invites").insert({
      trainer_id: auth.user?.id as string,
      token,
      full_name: linkName || null,
    });
    setCreatingLink(false);
    if (error) return toast.error(error.message);
    setLinkName("");
    await copyLink(token);
    load();
  };

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(inviteUrl(token));
      toast.success("Invite link copied — send it to your client");
    } catch {
      toast.info(inviteUrl(token));
    }
  };

  const cancelLink = async (id: string) => {
    const { error } = await supabase.from("client_invites").update({ status: "cancelled" }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };


  const respond = async (id: string, approve: boolean) => {
    setRespondingTo(id);
    const reason = approve ? undefined : (window.prompt("Reason (optional)") || undefined);
    const { error } = await supabase.rpc("respond_to_trainer_request", {
      _request_id: id,
      _approve: approve,
      ...(reason ? { _reason: reason } : {}),
    });

    setRespondingTo(null);
    if (error) return toast.error(error.message);
    toast.success(approve ? "Client added" : "Request declined");
    load();
  };


  const redirectTo = () =>
    typeof window !== "undefined" ? `${window.location.origin}/auth` : "";


  const handleResend = async (clientId: string, e: React.MouseEvent, isReset = false) => {
    e.preventDefault();
    e.stopPropagation();
    if (isReset && !window.confirm("Send this client a password reset email? They'll be asked to set a new password on next login.")) return;
    try {
      const res = await resend({ data: { clientId, redirectTo: redirectTo() } });
      toast.success(isReset ? `Password reset sent to ${res.email}` : `New invite link sent to ${res.email}`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send email");
    }
  };


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
        <p className="text-muted-foreground mt-1">
          Invite clients with a shareable link, or approve clients who requested to train with you.
        </p>
      </div>

      {requests.length > 0 && (
        <Card className="border-primary/60 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRoundCheck className="size-5" /> Access requests ({requests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-3 rounded-lg border bg-background p-3">
                <div className="min-w-0">
                  <div className="font-medium">{r.profiles?.full_name ?? "New client"}</div>
                  {r.note && <p className="text-xs text-muted-foreground mt-0.5">{r.note}</p>}
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Requested {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" disabled={respondingTo === r.id} onClick={() => respond(r.id, true)}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" disabled={respondingTo === r.id} onClick={() => respond(r.id, false)}>
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}


      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><LinkIcon className="size-5" /> Invite link (most reliable)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Create a link and send it however you like — WhatsApp, Messenger, SMS. When your client opens it and
            creates an account (or logs in), they're connected to you automatically. Valid 30 days.
          </p>
          <div className="flex gap-2 flex-col sm:flex-row">
            <Input placeholder="Client name (optional)" value={linkName} onChange={(e) => setLinkName(e.target.value)} />
            <Button type="button" disabled={creatingLink} onClick={createInviteLink}>
              {creatingLink ? "..." : "Create invite link"}
            </Button>
          </div>
          {links.length > 0 && (
            <div className="space-y-2">
              {links.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{l.full_name || "Invite link"}</div>
                    <div className="text-xs text-muted-foreground truncate">{inviteUrl(l.token)}</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button type="button" size="sm" variant="outline" onClick={() => copyLink(l.token)}>
                      <Copy className="size-3.5 mr-1" /> Copy
                    </Button>
                    <Button type="button" size="sm" variant="outline" asChild>
                      <a href={mailtoLink(l)}>
                        <Mail className="size-3.5 mr-1" /> Email it
                      </a>
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => cancelLink(l.id)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
              <div className="flex gap-2">
                <AssignPlanDialog
                  clientId={c.client_id}
                  trigger={
                    <Button type="button" size="sm" variant="default" className="flex-1">
                      <ClipboardList className="size-3.5 mr-1.5" /> Assign plan
                    </Button>
                  }
                />
                {pendingFirstLogin.includes(c.client_id) ? (
                  <Button type="button" size="sm" variant="outline" className="flex-1" onClick={(e) => handleResend(c.client_id, e)}>
                    <Mail className="size-3.5 mr-1.5" /> Resend invite
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="flex-1 text-muted-foreground"
                    onClick={(e) => handleResend(c.client_id, e, true)}
                  >
                    <KeyRound className="size-3.5 mr-1.5" /> Send password reset
                  </Button>
                )}
              </div>
              {pendingFirstLogin.includes(c.client_id) && (
                <p className="text-[11px] text-muted-foreground">Hasn't logged in yet</p>
              )}

            </CardContent>
          </Card>
        ))}
        {clients.length === 0 && <p className="text-muted-foreground text-sm">No clients yet.</p>}
      </div>
    </div>
  );
}
