import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/categories")({ ssr: false, component: Page });

type Category = { id: string; name: string };

function Page() {
  return (
    <RoleGuard role="super_admin">
      <AppShell>
        <Categories />
      </AppShell>
    </RoleGuard>
  );
}

function Categories() {
  const [rows, setRows] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("exercise_categories" as any).select("id, name").order("name");
    if (error) toast.error(error.message);
    setRows(((data as any) ?? []) as Category[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("exercise_categories" as any).insert({ name: name.trim(), created_by: u.user?.id } as any);
    if (error) toast.error(error.message);
    else { setName(""); toast.success("Category added"); load(); }
  };

  const startEdit = (c: Category) => { setEditId(c.id); setEditName(c.name); };
  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    const { error } = await supabase.from("exercise_categories" as any).update({ name: editName.trim() } as any).eq("id", id);
    if (error) toast.error(error.message);
    else { setEditId(null); toast.success("Updated"); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this category? Exercises in it will become uncategorized.")) return;
    const { error } = await supabase.from("exercise_categories" as any).delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Exercise categories</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage the categories trainers use to organize exercises.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={add} className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label>New category</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mobility" />
            </div>
            <Button type="submit"><Plus className="size-4 mr-1" /> Add</Button>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No categories yet.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <ul className="divide-y">
              {rows.map((c) => (
                <li key={c.id} className="py-3 flex items-center gap-2">
                  {editId === c.id ? (
                    <>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1" />
                      <Button size="icon" variant="ghost" onClick={() => saveEdit(c.id)}><Check className="size-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditId(null)}><X className="size-4" /></Button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 font-medium">{c.name}</div>
                      <Button size="icon" variant="ghost" onClick={() => startEdit(c)}><Pencil className="size-4 text-muted-foreground" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="size-4 text-muted-foreground" /></Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
