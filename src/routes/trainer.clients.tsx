import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/trainer/clients")({
  ssr: false,
  component: () => <RoleGuard role="trainer"><AppShell><Outlet /></AppShell></RoleGuard>,
});
