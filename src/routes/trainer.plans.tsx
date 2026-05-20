import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/trainer/plans")({
  ssr: false,
  component: () => <RoleGuard role="trainer"><AppShell><Plans /></AppShell></RoleGuard>,
});

function Plans() {
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const load = async () => {
    const { data } = await supabase.from("workout_plans").select("*").order("created_at", { ascending: false });
    setList(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("workout_plans").insert({ trainer_id: u.user!.id, name, description: desc || null });
    if (error) toast.error(error.message);
    else { toast.success("Plan created"); setName(""); setDesc(""); setOpen(false); load(); }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("workout_plans").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workout Plans</h1>
          <p className="text-muted-foreground mt-1">Build reusable templates for your clients</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="size-4 mr-1" /> New plan</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create workout plan</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Push Day, Leg Day..." /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
              <Button type="submit" className="w-full">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {list.map((p) => (
          <Card key={p.id} className="hover:border-primary transition-colors">
            <CardContent className="p-4 flex items-center justify-between">
              <Link to="/trainer/plans/$planId" params={{ planId: p.id }} className="flex-1">
                <div className="font-semibold">{p.name}</div>
                {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
              </Link>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="size-4 text-muted-foreground" /></Button>
                <Link to="/trainer/plans/$planId" params={{ planId: p.id }}><ChevronRight className="size-5 text-muted-foreground" /></Link>
              </div>
            </CardContent>
          </Card>
        ))}
        {list.length === 0 && <p className="text-muted-foreground text-sm">No plans yet.</p>}
      </div>
    </div>
  );
}
