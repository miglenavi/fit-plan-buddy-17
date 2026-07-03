import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Video, ImageIcon, Search, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/trainer/exercises/")({
  ssr: false,
  component: ExercisesList,
});

const MUSCLE_GROUPS = [
  "chest", "back", "shoulders", "biceps", "triceps",
  "quads", "hamstrings", "glutes", "calves", "core", "full_body",
] as const;
type MuscleGroup = typeof MUSCLE_GROUPS[number];
const prettyMuscle = (m: string) => m.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

function ExercisesList() {
  const [list, setList] = useState<any[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [primary, setPrimary] = useState<string>("none");
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");


  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    setUid(u.user?.id ?? null);
    const { data: ex } = await supabase.from("exercises").select("*").order("name");
    setList(ex ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("exercises").insert({
      trainer_id: u.user!.id,
      name,
      description: desc || null,
      primary_muscle_group: primary === "none" ? null : primary,
    } as any);
    if (error) toast.error(error.message);
    else {
      toast.success("Exercise added");
      setName(""); setDesc(""); setPrimary("none"); setOpen(false); load();
    }
  };

  const remove = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this exercise?")) return;
    const { error } = await supabase.from("exercises").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  // Group by primary muscle group
  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = list.filter((ex) => {
      const matchesFilter =
        filter === "all" ? true :
        filter === "unset" ? !ex.primary_muscle_group :
        ex.primary_muscle_group === filter;
      if (!matchesFilter) return false;
      if (!q) return true;
      const haystack = [
        ex.name,
        ex.description,
        ex.primary_muscle_group ? prettyMuscle(ex.primary_muscle_group) : "",
        ...(ex.secondary_muscle_groups ?? []).map((m: string) => prettyMuscle(m)),
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });
    const byGroup = new Map<string, any[]>();
    for (const ex of filtered) {
      const key = (ex.primary_muscle_group as string) ?? "__none__";
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key)!.push(ex);
    }
    return Array.from(byGroup.entries())
      .map(([id, items]) => ({ id, name: id === "__none__" ? "Unassigned" : prettyMuscle(id), items }))
      .sort((a, b) => (a.name === "Unassigned" ? 1 : b.name === "Unassigned" ? -1 : a.name.localeCompare(b.name)));
  }, [list, filter, search]);


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exercises</h1>
          <p className="text-muted-foreground mt-1">Your exercise library, organized by primary muscle group</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="size-4 mr-1" /> New exercise</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create exercise</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Primary muscle group</Label>
                <Select value={primary} onValueChange={setPrimary}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {MUSCLE_GROUPS.map((m) => <SelectItem key={m} value={m}>{prettyMuscle(m)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
              <Button type="submit" className="w-full">Save</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Muscle-group filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent"}`}
        >
          All
        </button>
        {MUSCLE_GROUPS.map((m) => (
          <button
            key={m}
            onClick={() => setFilter(m)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filter === m ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent"}`}
          >
            {prettyMuscle(m)}
          </button>
        ))}
        <button
          onClick={() => setFilter("unset")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filter === "unset" ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent"}`}
        >
          Unassigned
        </button>
      </div>

      {grouped.length === 0 && <p className="text-muted-foreground text-sm">No exercises yet.</p>}

      {grouped.map((g) => (
        <section key={g.id} className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{g.name}</h2>
            <span className="text-xs text-muted-foreground">{g.items.length}</span>
            <div className="flex-1 h-px bg-border ml-2" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {g.items.map((ex) => (
              <Link key={ex.id} to="/trainer/exercises/$exerciseId" params={{ exerciseId: ex.id }} className="block">
                <Card className="hover:border-primary transition-colors h-full">
                  {ex.image_url && (
                    <img src={ex.image_url} alt={ex.name} className="w-full h-32 object-cover rounded-t-lg" />
                  )}
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">{ex.name}</div>
                        {!ex.trainer_id && <Badge variant="secondary" className="mt-1 text-[10px]">Built-in</Badge>}
                        {(ex.primary_muscle_group || (ex.secondary_muscle_groups?.length ?? 0) > 0) && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {ex.primary_muscle_group && (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-primary/15 text-primary border border-primary/30">
                                {prettyMuscle(ex.primary_muscle_group)}
                              </span>
                            )}
                            {(ex.secondary_muscle_groups ?? []).map((m: string) => (
                              <span key={m} className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border">
                                {prettyMuscle(m)}
                              </span>
                            ))}
                          </div>
                        )}
                        {ex.description && <p className="text-sm mt-2 text-muted-foreground line-clamp-2">{ex.description}</p>}
                        <div className="flex gap-2 mt-2 text-muted-foreground">
                          {ex.image_url && <ImageIcon className="size-3.5" />}
                          {ex.video_url && <Video className="size-3.5" />}
                        </div>
                      </div>
                      {ex.trainer_id === uid && (
                        <Button size="icon" variant="ghost" onClick={(e) => remove(e, ex.id)}>
                          <Trash2 className="size-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
