import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

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

  useEffect(() => {
    if (!open) return;
    if (!planId) {
      supabase.from("plans").select("id, name").order("created_at", { ascending: false })
        .then(({ data }) => setPlans(data ?? []));
    }
    if (!clientId) {
      supabase.from("trainer_clients")
        .select("client_id, profiles!trainer_clients_client_profile_fk(id, full_name)")
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          setClients((data ?? []).map((r: any) => ({
            id: r.client_id,
            name: r.profiles?.full_name ?? "Unnamed",
          })));
        });
    }
  }, [open, planId, clientId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pid = planId ?? pickPlan;
    const cid = clientId ?? pickClient;
    if (!pid) return toast.error("Pick a plan");
    if (!cid) return toast.error("Pick a client");
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("client_programs").insert({
        trainer_id: u.user!.id,
        client_id: cid,
        plan_id: pid,
        start_date: startDate,
        end_date: endDate || null,
        status: "active",
      });
      if (error) throw error;
      toast.success("Plan assigned");
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>End date (optional)</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Assigning…" : "Assign"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
