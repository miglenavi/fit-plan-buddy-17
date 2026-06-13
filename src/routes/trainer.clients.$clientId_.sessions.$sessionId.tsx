import { createFileRoute, useParams, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SessionLogger } from "@/components/SessionLogger";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/trainer/clients/$clientId_/sessions/$sessionId")({
  ssr: false,
  component: TrainerClientSessionPage,
});

function TrainerClientSessionPage() {
  const { clientId, sessionId } = useParams({ from: "/trainer/clients/$clientId/sessions/$sessionId" });
  const nav = useNavigate();
  const [clientName, setClientName] = useState<string>("");

  useEffect(() => {
    supabase.from("profiles").select("full_name").eq("id", clientId).maybeSingle()
      .then(({ data }) => setClientName(data?.full_name ?? ""));
  }, [clientId]);

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/trainer/clients/$clientId" params={{ clientId }} className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-3 -ml-1">
        <ArrowLeft className="size-4" /> Back to {clientName || "client"}
      </Link>
      <div className="mb-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Logging for</p>
        <h1 className="text-2xl font-bold tracking-tight">{clientName || "Client"}</h1>
      </div>
      <SessionLogger
        sessionId={sessionId}
        onFinished={() => nav({ to: "/trainer/clients/$clientId", params: { clientId } })}
      />
    </div>
  );
}
