import { useAuth, type AppRole } from "@/lib/auth";
import { Navigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

function defaultRoute(role: AppRole | null): string {
  if (role === "super_admin") return "/admin/applications";
  if (role === "trainer") return "/trainer";
  if (role === "client") return "/client";
  return "/pending";
}

export function RoleGuard({
  role,
  anyOf,
  children,
}: {
  role?: AppRole;
  anyOf?: AppRole[];
  children: ReactNode;
}) {
  const { user, roles, role: primary, loading } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (loading)
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" />;

  // Force clients with a temporary password to set a new one before using the app.
  if (user.user_metadata?.must_change_password && path !== "/auth") {
    return <Navigate to="/auth" />;
  }

  const allowed = anyOf ?? (role ? [role] : []);
  // super_admin implicitly has trainer access
  const effective = new Set<AppRole>(roles);
  if (effective.has("super_admin")) effective.add("trainer");

  if (allowed.length > 0 && !allowed.some((r) => effective.has(r))) {
    return <Navigate to={defaultRoute(primary)} />;
  }
  return <>{children}</>;
}
