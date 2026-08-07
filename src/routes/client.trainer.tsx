import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { ClientShell } from "@/components/ClientShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CheckCircle2, Clock, Search, UserRoundSearch, XCircle } from "lucide-react";

export const Route = createFileRoute("/client/trainer")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Your trainer — ValhallaFit" },
      { name: "description", content: "Find a coach and request access to start training with them." },
    ],
  }),
  component: () => (
    <RoleGuard role="client">
      <ClientShell title="Your trainer">
        <ClientTrainer />
      </ClientShell>
    </RoleGuard>
  ),
});

type Trainer = { id: string; full_name: string | null };
type Request = {
  id: string;
  trainer_id: string;
  status: string;
  note: string | null;
  decline_reason: string | null;
  created_at: string;
};

function ClientTrainer() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [linkedTrainerId, setLinkedTrainerId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: t }, { data: r }, { data: link }] = await Promise.all([
      supabase.rpc("list_trainers"),
      supabase
        .from("trainer_requests")
        .select("id, trainer_id, status, note, decline_reason, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("trainer_clients").select("trainer_id").is("archived_at", null).limit(1),
    ]);
    setTrainers((t as Trainer[]) ?? []);
    setRequests((r as Request[]) ?? []);
    setLinkedTrainerId(link?.[0]?.trainer_id ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const nameOf = (id: string) => trainers.find((t) => t.id === id)?.full_name ?? "Your coach";
  const pending = requests.find((r) => r.status === "pending");
  const declined = requests.filter((r) => r.status === "declined");

  const submit = async () => {
    if (!selected) return toast.error("Pick a trainer first");
    setBusy(true);
    const { error } = await supabase.from("trainer_requests").insert({
      client_id: (await supabase.auth.getUser()).data.user?.id as string,
      trainer_id: selected,
      note: note.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Request sent — your trainer will review it.");
    setNote("");
    setSelected(null);
    load();
  };

  const cancel = async (id: string) => {
    const { error } = await supabase.from("trainer_requests").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Request cancelled");
    load();
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (linkedTrainerId) {
    return (
      <Card>
        <CardContent className="p-5 space-y-1">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <CheckCircle2 className="size-5" /> You're connected
          </div>
          <p className="text-sm text-muted-foreground">
            You're training with {nameOf(linkedTrainerId)}. Your plan appears on the Today screen.
          </p>
        </CardContent>
      </Card>
    );
  }

  const filtered = trainers.filter((t) =>
    (t.full_name ?? "").toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="space-y-5">
      {pending ? (
        <Card className="border-primary/60 bg-primary/5">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <Clock className="size-5" /> Request pending
            </div>
            <p className="text-sm text-muted-foreground">
              You asked to train with {nameOf(pending.trainer_id)}. You'll get access as soon as they approve.
            </p>
            <Button variant="outline" size="sm" onClick={() => cancel(pending.id)}>
              Cancel request
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {declined.length > 0 && (
            <Card className="border-destructive/40">
              <CardContent className="p-4 text-sm space-y-1">
                <div className="flex items-center gap-2 font-medium text-destructive">
                  <XCircle className="size-4" /> {nameOf(declined[0].trainer_id)} declined your request
                </div>
                {declined[0].decline_reason && (
                  <p className="text-muted-foreground">{declined[0].decline_reason}</p>
                )}
                <p className="text-muted-foreground">You can request another trainer below.</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserRoundSearch className="size-5" /> Request access to a trainer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search trainers by name"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {filtered.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelected(t.id)}
                    className={`w-full text-left flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                      selected === t.id ? "border-primary bg-primary/5" : "hover:border-primary/50"
                    }`}
                  >
                    <div className="size-9 rounded-full bg-accent flex items-center justify-center font-semibold text-accent-foreground">
                      {(t.full_name ?? "?")[0]?.toUpperCase()}
                    </div>
                    <span className="font-medium text-sm">{t.full_name ?? "Unnamed trainer"}</span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-sm text-muted-foreground">No trainers match that name.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rnote">Message (optional)</Label>
                <Textarea
                  id="rnote"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Your goals, experience, when you train…"
                />
              </div>

              <Button className="w-full" disabled={busy || !selected} onClick={submit}>
                {busy ? "Sending…" : "Send request"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
