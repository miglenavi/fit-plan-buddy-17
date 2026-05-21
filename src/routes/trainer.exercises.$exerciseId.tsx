import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/trainer/exercises/$exerciseId")({
  ssr: false,
  component: ExerciseDetail,
});

type Category = { id: string; name: string };

function ExerciseDetail() {
  const { exerciseId } = useParams({ from: "/trainer/exercises/$exerciseId" });
  const navigate = useNavigate();
  const [ex, setEx] = useState<any>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<string>("none");
  
  const [desc, setDesc] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data, error }, { data: c }] = await Promise.all([
      supabase.from("exercises").select("*").eq("id", exerciseId).maybeSingle(),
      supabase.from("exercise_categories" as any).select("id, name").order("name"),
    ]);
    if (error) { toast.error(error.message); return; }
    if (!data) return;
    setEx(data);
    setName(data.name);
    
    setDesc(data.description ?? "");
    setVideoUrl(data.video_url ?? "");
    setCategoryId((data as any).category_id ?? "none");
    setCats(((c as any) ?? []) as Category[]);
  };
  useEffect(() => { load(); }, [exerciseId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("exercises").update({
      name, description: desc || null, video_url: videoUrl || null,
      category_id: categoryId === "none" ? null : categoryId,
    } as any).eq("id", exerciseId);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); load(); }
  };

  const uploadFile = async (file: File, kind: "image" | "video") => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Not signed in"); return null; }
    const ext = file.name.split(".").pop();
    const path = `${u.user.id}/${exerciseId}-${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("exercise-media").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return null; }
    const { data: pub } = supabase.storage.from("exercise-media").getPublicUrl(path);
    return pub.publicUrl;
  };

  const onImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingImage(true);
    const url = await uploadFile(file, "image");
    if (url) {
      const { error } = await supabase.from("exercises").update({ image_url: url }).eq("id", exerciseId);
      if (error) toast.error(error.message); else { toast.success("Image uploaded"); load(); }
    }
    setUploadingImage(false);
    e.target.value = "";
  };

  const onVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingVideo(true);
    const url = await uploadFile(file, "video");
    if (url) {
      setVideoUrl(url);
      const { error } = await supabase.from("exercises").update({ video_url: url }).eq("id", exerciseId);
      if (error) toast.error(error.message); else { toast.success("Video uploaded"); load(); }
    }
    setUploadingVideo(false);
    e.target.value = "";
  };

  const clearMedia = async (field: "image_url" | "video_url") => {
    const patch = field === "image_url" ? { image_url: null } : { video_url: null };
    const { error } = await supabase.from("exercises").update(patch).eq("id", exerciseId);
    if (error) toast.error(error.message);
    else { toast.success("Removed"); if (field === "video_url") setVideoUrl(""); load(); }
  };

  const remove = async () => {
    if (!confirm("Delete this exercise?")) return;
    const { error } = await supabase.from("exercises").delete().eq("id", exerciseId);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); navigate({ to: "/trainer/exercises" }); }
  };

  if (!ex) return <p className="text-muted-foreground">Loading...</p>;

  const isYoutube = videoUrl && /(?:youtube\.com|youtu\.be)/.test(videoUrl);
  const ytId = isYoutube ? videoUrl.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/)?.[1] : null;

  return (
    <div className="space-y-6 max-w-3xl">
      <Link to="/trainer/exercises" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4 mr-1" /> Back to exercises
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{ex.name}</h1>
          {(() => { const cn = cats.find(c => c.id === ex.category_id)?.name; return cn ? <p className="text-muted-foreground mt-1">{cn}</p> : null; })()}
        </div>
        <Button variant="outline" size="sm" onClick={remove}>
          <Trash2 className="size-4 mr-1" /> Delete
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
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
            
            <div className="space-y-2"><Label>Description</Label><Textarea rows={6} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="How to perform this exercise, tips, cues..." /></div>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Visual</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {ex.image_url ? (
            <div className="space-y-2">
              <img src={ex.image_url} alt={ex.name} className="w-full max-h-80 object-contain rounded-md border" />
              <Button variant="ghost" size="sm" onClick={() => clearMedia("image_url")}>
                <Trash2 className="size-4 mr-1" /> Remove image
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No image yet.</p>
          )}
          <div>
            <Label className="cursor-pointer">
              <div className="inline-flex items-center justify-center gap-2 rounded-md border border-dashed px-4 py-2 text-sm hover:bg-muted">
                {uploadingImage ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                Upload image
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={onImage} disabled={uploadingImage} />
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Video</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {ytId ? (
            <div className="aspect-video w-full">
              <iframe className="w-full h-full rounded-md" src={`https://www.youtube.com/embed/${ytId}`} title="Video" allowFullScreen />
            </div>
          ) : videoUrl ? (
            <video src={videoUrl} controls className="w-full max-h-80 rounded-md border" />
          ) : (
            <p className="text-sm text-muted-foreground">No video yet.</p>
          )}

          <div className="space-y-2">
            <Label>Video URL (YouTube or direct link)</Label>
            <div className="flex gap-2">
              <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtu.be/..." />
              {ex.video_url && (
                <Button type="button" variant="ghost" size="icon" onClick={() => clearMedia("video_url")}>
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </div>

          <div>
            <Label className="cursor-pointer">
              <div className="inline-flex items-center justify-center gap-2 rounded-md border border-dashed px-4 py-2 text-sm hover:bg-muted">
                {uploadingVideo ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                Upload video file
              </div>
              <input type="file" accept="video/*" className="hidden" onChange={onVideo} disabled={uploadingVideo} />
            </Label>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
