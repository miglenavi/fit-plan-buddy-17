import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/trainer/plans/")({
  ssr: false,
  component: Plans,
});

function Plans() {
  const navigate = useNavigate();
  const [list, setList] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("workout_plans").select("*").order("created_at", { ascending: false });
    setList(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    setCreating(true);
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("workout_plans")
      .insert({ trainer_id: u.user!.id, name: "Untitled plan" })
      .select("id")
      .single();
    setCreating(false);
    if (error || !data) { toast.error(error?.message ?? "Could not create plan"); return; }
    navigate({ to: "/trainer/plans/$planId", params: { planId: data.id } });
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
        <Button onClick={create} disabled={creating}>
          {creating ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Plus className="size-4 mr-1" />}
          New plan
        </Button>
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
