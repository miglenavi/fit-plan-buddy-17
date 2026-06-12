import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";
import { ClientShell } from "@/components/ClientShell";
import { SessionLogger } from "@/components/SessionLogger";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/client/sessions/$sessionId")({
  ssr: false,
  component: () => (
    <RoleGuard anyOf={["client", "trainer"]}>
      <ClientShell title="Session">
        <ClientSessionPage />
      </ClientShell>
    </RoleGuard>
  ),
});

function ClientSessionPage() {
  const { sessionId } = useParams({ from: "/client/sessions/$sessionId" });
  return (
    <>
      <Link to="/client" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-3 -ml-1">
        <ArrowLeft className="size-4" /> Back
      </Link>
      <SessionLogger sessionId={sessionId} />
    </>
  );
}
