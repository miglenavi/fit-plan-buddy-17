import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Swords, Users, ClipboardList, History, LogOut, Home, Dumbbell, ShieldCheck, UserCheck, Tag } from "lucide-react";
import type { ReactNode } from "react";

const trainerNav = [
  { to: "/trainer", label: "Dashboard", icon: Home },
  { to: "/trainer/clients", label: "Clients", icon: Users },
  { to: "/trainer/exercises", label: "Exercises", icon: Dumbbell },
  { to: "/trainer/plans", label: "Workout Plans", icon: ClipboardList },
];

const clientNav = [
  { to: "/client", label: "Today", icon: Home },
  { to: "/client/history", label: "History", icon: History },
];

const adminNav = [
  { to: "/admin/applications", label: "Applications", icon: UserCheck },
  { to: "/admin/trainers", label: "Trainers", icon: ShieldCheck },
];

function initialsOf(name?: string | null, email?: string | null) {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function NavGroup({
  label,
  items,
  path,
}: {
  label: string;
  items: { to: string; label: string; icon: any }[];
  path: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <div className="px-3 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
        {label}
      </div>
      {items.map((item) => {
        const active =
          path === item.to ||
          (!["/trainer", "/client"].includes(item.to) && path.startsWith(item.to));
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
            }`}
          >
            {active && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-primary" />
            )}
            <Icon
              className={`size-4 transition-colors ${
                active ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-primary"
              }`}
            />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { role, isSuperAdmin, isTrainer, isClient, fullName, signOut, user } = useAuth();
  const nav = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const adminItems = isSuperAdmin ? adminNav : [];
  const trainerItems = isTrainer ? trainerNav : [];
  const clientItems = isClient ? clientNav : [];
  const allMobile = [...adminItems, ...trainerItems, ...clientItems];

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="md:w-64 bg-sidebar text-sidebar-foreground md:min-h-screen flex md:flex-col">
        <div className="px-5 py-5 flex items-center gap-3 border-b border-sidebar-border flex-1 md:flex-none">
          <div className="size-10 rounded-2xl bg-primary flex items-center justify-center shadow-[0_0_24px_-4px_oklch(0.72_0.18_145/0.55)]">
            <Swords className="size-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-base leading-tight">ValhallaFit</div>
            <div className="text-[11px] opacity-60 capitalize leading-tight mt-0.5">
              {role?.replace("_", " ") ?? "..."}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sign out"
            className="md:hidden text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={async () => { await signOut(); nav({ to: "/auth" }); }}
          >
            <LogOut className="size-5" />
          </Button>
        </div>

        <nav className="hidden md:flex flex-col px-3 py-2 gap-1 flex-1">
          <NavGroup label="Admin" items={adminItems} path={path} />
          <NavGroup label="Coaching" items={trainerItems} path={path} />
          <NavGroup label="Client" items={clientItems} path={path} />
        </nav>

        <div className="p-3 border-t border-sidebar-border hidden md:block">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="size-9 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-semibold">
              {initialsOf(fullName, user?.email)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{fullName || user?.email}</div>
              <div className="text-[11px] opacity-60 truncate">{user?.email}</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start mt-1 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={async () => { await signOut(); nav({ to: "/auth" }); }}
          >
            <LogOut className="size-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-sidebar text-sidebar-foreground border-t border-sidebar-border flex justify-around z-50 overflow-x-auto">
        {allMobile.map((item) => {
          const active = path === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`relative flex flex-col items-center gap-1 py-2 px-3 text-[11px] ${
                active ? "text-primary" : "text-sidebar-foreground/70"
              }`}
            >
              <Icon className="size-5" />
              {item.label}
              {active && (
                <span className="absolute -top-0.5 size-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
        <button
          onClick={async () => { await signOut(); nav({ to: "/auth" }); }}
          className="flex flex-col items-center gap-1 py-2 px-3 text-[11px] text-sidebar-foreground/70"
        >
          <LogOut className="size-5" />
          Exit
        </button>
      </nav>

      <main className="flex-1 p-6 md:p-10 pb-24 md:pb-10 max-w-6xl mx-auto w-full">{children}</main>
    </div>
  );
}
