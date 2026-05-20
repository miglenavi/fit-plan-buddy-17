import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/trainer/exercises")({
  ssr: false,
  component: () => <RoleGuard role="trainer"><AppShell><Exercises /></AppShell></RoleGuard>,
});

function Exercises() {
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState("");
  const [desc, setDesc] = useState("");

  const load = async () => {
    const { data } = await supabase.from("exercises").select("*").order("created_at", { ascending: false });
    setList(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("exercises").insert({
      trainer_id: u.user!.id, name, muscle_group: muscle || null, description: desc || null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Exercise added"); setName(""); setMuscle(""); setDesc(""); setOpen(false); load(); }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("exercises").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exercises</h1>
          <p className="text-muted-foreground mt-1">Your exercise library</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="size-4 mr-1" /> New exercise</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create exercise</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Muscle group</Label><Input value={muscle} onChange={(e) => setMuscle(e.target.value)} placeholder="Chest, Back, Legs..." /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
              <Button type="submit" className="w-full">Save</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map((ex) => (
          <Card key={ex.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold">{ex.name}</div>
                  {ex.muscle_group && <div className="text-xs text-muted-foreground mt-0.5">{ex.muscle_group}</div>}
                  {ex.description && <p className="text-sm mt-2 text-muted-foreground">{ex.description}</p>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => remove(ex.id)}><Trash2 className="size-4 text-muted-foreground" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {list.length === 0 && <p className="text-muted-foreground text-sm">No exercises yet.</p>}
      </div>
    </div>
  );
}
