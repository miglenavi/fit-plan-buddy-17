import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/trainer/clients/$clientId")({
  ssr: false,
  component: () => <RoleGuard role="trainer"><AppShell><ClientDetail /></AppShell></RoleGuard>,
});

function ClientDetail() {
  const { clientId } = useParams({ from: "/trainer/clients/$clientId" });
  const [profile, setProfile] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const load = async () => {
    const [{ data: p }, { data: a }, { data: pl }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", clientId).maybeSingle(),
      supabase.from("assigned_workouts")
        .select("id, scheduled_date, status, workout_plans(name)")
        .eq("client_id", clientId).order("scheduled_date", { ascending: false }),
      supabase.from("workout_plans").select("id, name"),
    ]);
    setProfile(p); setAssignments(a ?? []); setPlans(pl ?? []);
  };
  useEffect(() => { load(); }, [clientId]);

  const assign = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("assigned_workouts").insert({
      trainer_id: u.user!.id, client_id: clientId, workout_plan_id: planId, scheduled_date: date,
    });
    if (error) toast.error(error.message);
    else { toast.success("Workout assigned"); setOpen(false); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{profile?.full_name ?? "Client"}</h1>
          <p className="text-muted-foreground mt-1">Workout history & assignments</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="size-4 mr-1" /> Assign workout</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign a workout</DialogTitle></DialogHeader>
            <form onSubmit={assign} className="space-y-4">
              <div className="space-y-2">
                <Label>Workout plan</Label>
                <Select value={planId} onValueChange={setPlanId} required>
                  <SelectTrigger><SelectValue placeholder="Select a plan" /></SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={!planId}>Assign</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>History</CardTitle></CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-muted-foreground text-sm">No workouts assigned yet.</p>
          ) : (
            <ul className="divide-y">
              {assignments.map((a) => (
                <li key={a.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.workout_plans?.name}</div>
                    <div className="text-xs text-muted-foreground">{new Date(a.scheduled_date).toLocaleDateString()}</div>
                  </div>
                  <span className="text-xs flex items-center gap-1 px-2 py-1 rounded-full bg-secondary capitalize">
                    {a.status === "completed" ? <CheckCircle2 className="size-3 text-primary" /> : <Clock className="size-3" />}
                    {a.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
