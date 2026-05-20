import { useAuth } from "@/lib/auth";
import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function RoleGuard({ role, children }: { role: "trainer" | "client"; children: ReactNode }) {
  const { user, role: r, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" />;
  if (r && r !== role) return <Navigate to={r === "trainer" ? "/trainer" : "/client"} />;
  return <>{children}</>;
}
