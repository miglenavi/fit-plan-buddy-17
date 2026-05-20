import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Index,
});

function Index() {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" />;
  if (role === "super_admin") return <Navigate to="/admin/applications" />;
  if (role === "trainer") return <Navigate to="/trainer" />;
  if (role === "client") return <Navigate to="/client" />;
  return <Navigate to="/pending" />;
}
