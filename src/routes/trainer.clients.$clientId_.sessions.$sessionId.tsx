import { createFileRoute, useParams, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SessionLogger } from "@/components/SessionLogger";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil } from "lucide-react";

export const Route = createFileRoute("/trainer/clients/$clientId_/sessions/$sessionId")({
  ssr: false,
  component: TrainerClientSessionPage,
});

function TrainerClientSessionPage() {
  const { clientId, sessionId } = useParams({ from: "/trainer/clients/$clientId_/sessions/$sessionId" });
  const nav = useNavigate();
  const [clientName, setClientName] = useState<string>("");
  const [status, setStatus] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("full_name").eq("id", clientId).maybeSingle()
      .then(({ data }) => setClientName(data?.full_name ?? ""));
    supabase.from("training_sessions").select("status").eq("id", sessionId).maybeSingle()
      .then(({ data }) => setStatus(data?.status ?? null));
  }, [clientId, sessionId]);

  const reopen = async () => {
    if (!confirm("Reopen this completed session for editing?")) return;
    const { error } = await supabase
      .from("training_sessions")
      .update({ status: "in_progress", completed_at: null })
      .eq("id", sessionId);
    if (error) return;
    setStatus("in_progress");
    setEditing(true);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/trainer/clients/$clientId" params={{ clientId }} className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-3 -ml-1">
        <ArrowLeft className="size-4" /> Back to {clientName || "client"}
      </Link>
      <div className="mb-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Logging for</p>
          <h1 className="text-2xl font-bold tracking-tight">{clientName || "Client"}</h1>
        </div>
        {status === "completed" && !editing && (
          <Button size="sm" variant="outline" onClick={reopen}>
            <Pencil className="size-4 mr-1.5" /> Edit session
          </Button>
        )}
      </div>
      <SessionLogger
        sessionId={sessionId}
        onFinished={() => nav({ to: "/trainer/clients/$clientId", params: { clientId } })}
      />
    </div>
  );
}
