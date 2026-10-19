import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

type Props = {
  trigger: React.ReactNode;
  /** If set, plan is locked and user picks a client. */
  planId?: string;
  /** If set, client is locked and user picks a plan. */
  clientId?: string;
  onAssigned?: () => void;
};

export function AssignPlanDialog({ trigger, planId, clientId, onAssigned }: Props) {
  const [open, setOpen] = useState(false);
  const [plans, setPlans] = useState<{ id: string; name: string }[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [pickPlan, setPickPlan] = useState(planId ?? "");
  const [pickClient, setPickClient] = useState(clientId ?? "");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState<{ plan_id: string; name: string } | null>(null);
  const { isImpersonating } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const dateError =
    !startDate ? "Pick a start date."
    : startDate > today ? "Start date can't be in the future — the new program replaces the current one right away."
    : endDate && endDate < startDate ? "End date must be on or after the start date."
    : endDate && endDate < today ? "End date can't be in the past."
    : null;

  useEffect(() => {
    if (!open) return;
    if (!planId) {
      supabase.from("plans").select("id, name").order("created_at", { ascending: false })
        .then(({ data }) => setPlans(data ?? []));
    }
    if (!clientId) {
      supabase.from("trainer_clients")
        .select("client_id, profiles!trainer_clients_client_profile_fk(id, full_name)")
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          setClients((data ?? []).map((r: any) => ({
            id: r.client_id,
            name: r.profiles?.full_name ?? "Unnamed",
          })));
        });
    }
  }, [open, planId, clientId]);

  const cidSel = clientId ?? pickClient;
  useEffect(() => {
    setCurrent(null);
    if (!open || !cidSel) return;
    let live = true;
    supabase.from("client_programs").select("plan_id, plans(name)")
      .eq("client_id", cidSel).eq("status", "active").limit(1)
      .then(({ data }) => {
        const r: any = data?.[0];
        if (live) setCurrent(r ? { plan_id: r.plan_id, name: r.plans?.name ?? "Current program" } : null);
      });
    return () => { live = false; };
  }, [open, cidSel]);
  const pidSel = planId ?? pickPlan;
  const sameAsCurrent = !!current && current.plan_id === pidSel;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pid = planId ?? pickPlan;
    const cid = clientId ?? pickClient;
    if (!pid) return toast.error("Pick a plan");
    if (!cid) return toast.error("Pick a client");
    if (isImpersonating) {
      return toast.error("You're viewing as another user. Exit view-as mode to assign plans.");
    }
    setBusy(true);
    try {
      if (dateError) throw new Error(dateError);
      const { error } = await supabase.rpc("assign_client_program", {
        _client_id: cid,
        _plan_id: pid,
        _start_date: startDate,
        _end_date: endDate || undefined,
      });
      if (error) throw error;
      toast.success(sameAsCurrent ? "That program is already active" : current ? "Program replaced" : "Program assigned");
      setOpen(false);
      setPickPlan(planId ?? "");
      setPickClient(clientId ?? "");
      setEndDate("");
      onAssigned?.();
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't assign plan");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{planId ? "Assign to client" : "Assign a plan"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {!planId && (
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={pickPlan} onValueChange={setPickPlan}>
                <SelectTrigger><SelectValue placeholder="Pick a plan…" /></SelectTrigger>
                <SelectContent>
                  {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {!clientId && (
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={pickClient} onValueChange={setPickClient}>
                <SelectTrigger><SelectValue placeholder="Pick a client…" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {cidSel && (
            <p className="text-sm text-muted-foreground" data-testid="current-program">
              {current
                ? sameAsCurrent
                  ? <>This client is already on <span className="font-medium text-foreground">{current.name}</span>. Nothing will change.</>
                  : <>Current program: <span className="font-medium text-foreground">{current.name}</span>. Assigning a new program replaces it — it'll be marked completed today and kept in history.</>
                : "No active program yet."}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start date</Label>
              <Input type="date" value={startDate} max={today} onChange={(e) => setStartDate(e.target.value)} required aria-invalid={!!dateError} />
            </div>
            <div className="space-y-2">
              <Label>End date (optional)</Label>
              <Input type="date" value={endDate} min={startDate > today ? startDate : today} onChange={(e) => setEndDate(e.target.value)} aria-invalid={!!dateError} />
            </div>
          </div>
          {dateError && <p className="text-sm text-destructive" role="alert">{dateError}</p>}
          <Button type="submit" className="w-full" disabled={busy || !!dateError}>
            {busy ? "Saving…" : current && !sameAsCurrent ? "Replace program" : "Assign program"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
