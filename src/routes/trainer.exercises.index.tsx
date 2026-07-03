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
import { Plus, Trash2, Video, ImageIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/trainer/exercises/")({
  ssr: false,
  component: ExercisesList,
});

type Category = { id: string; name: string };

function ExercisesList() {
  const [list, setList] = useState<any[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  
  const [desc, setDesc] = useState("");
  const [categoryId, setCategoryId] = useState<string>("none");
  const [filter, setFilter] = useState<string>("all");

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    setUid(u.user?.id ?? null);
    const [{ data: ex }, { data: c }] = await Promise.all([
      supabase.from("exercises").select("*").order("name"),
      supabase.from("exercise_categories" as any).select("id, name").order("name"),
    ]);
    setList(ex ?? []);
    setCats(((c as any) ?? []) as Category[]);
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("exercises").insert({
      trainer_id: u.user!.id,
      name,
      description: desc || null,
      category_id: categoryId === "none" ? null : categoryId,
    } as any);
    if (error) toast.error(error.message);
    else {
      toast.success("Exercise added");
      setName(""); setDesc(""); setCategoryId("none"); setOpen(false); load();
    }
  };

  const remove = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this exercise?")) return;
    const { error } = await supabase.from("exercises").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  // Group by category
  const grouped = useMemo(() => {
    const filtered = filter === "all" ? list : filter === "uncat" ? list.filter((e) => !e.category_id) : list.filter((e) => e.category_id === filter);
    const byCat = new Map<string, any[]>();
    for (const ex of filtered) {
      const key = ex.category_id ?? "__none__";
      if (!byCat.has(key)) byCat.set(key, []);
      byCat.get(key)!.push(ex);
    }
    const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? "Uncategorized";
    return Array.from(byCat.entries())
      .map(([id, items]) => ({ id, name: id === "__none__" ? "Uncategorized" : catName(id), items }))
      .sort((a, b) => (a.name === "Uncategorized" ? 1 : b.name === "Uncategorized" ? -1 : a.name.localeCompare(b.name)));
  }, [list, cats, filter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exercises</h1>
          <p className="text-muted-foreground mt-1">Your exercise library, organized by category</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="size-4 mr-1" /> New exercise</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create exercise</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Uncategorized" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Uncategorized</SelectItem>
                    {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2"><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
              <Button type="submit" className="w-full">Save</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent"}`}
        >
          All
        </button>
        {cats.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilter(c.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filter === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent"}`}
          >
            {c.name}
          </button>
        ))}
        <button
          onClick={() => setFilter("uncat")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filter === "uncat" ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent"}`}
        >
          Uncategorized
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
                        {(() => { const cn = cats.find(c => c.id === ex.category_id)?.name; return cn ? <div className="text-xs text-muted-foreground mt-0.5">{cn}</div> : null; })()}
                        {!ex.trainer_id && <Badge variant="secondary" className="mt-1 text-[10px]">Built-in</Badge>}
                        {(ex.primary_muscle_group || (ex.secondary_muscle_groups?.length ?? 0) > 0) && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {ex.primary_muscle_group && (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-primary/15 text-primary border border-primary/30">
                                {ex.primary_muscle_group.replace("_", " ")}
                              </span>
                            )}
                            {(ex.secondary_muscle_groups ?? []).map((m: string) => (
                              <span key={m} className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border">
                                {m.replace("_", " ")}
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
