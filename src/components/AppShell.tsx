import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Swords, Users, ClipboardList, Calendar, History, LogOut, Home, Dumbbell, ShieldCheck, UserCheck, Tag } from "lucide-react";
import type { ReactNode } from "react";

const trainerNav = [
  { to: "/trainer", label: "Dashboard", icon: Home },
  { to: "/trainer/clients", label: "Clients", icon: Users },
  { to: "/trainer/exercises", label: "Exercises", icon: Dumbbell },
  { to: "/trainer/plans", label: "Workout Plans", icon: ClipboardList },
  { to: "/trainer/schedule", label: "Schedule", icon: Calendar },
];

const clientNav = [
  { to: "/client", label: "Today", icon: Home },
  { to: "/client/history", label: "History", icon: History },
];

const adminNav = [
  { to: "/admin/applications", label: "Applications", icon: UserCheck },
  { to: "/admin/trainers", label: "Trainers", icon: ShieldCheck },
  { to: "/admin/categories", label: "Categories", icon: Tag },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { role, isSuperAdmin, isTrainer, isClient, fullName, signOut, user } = useAuth();
  const nav = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const items = [
    ...(isSuperAdmin ? adminNav : []),
    ...(isTrainer ? trainerNav : []),
    ...(isClient ? clientNav : []),
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="md:w-64 bg-sidebar text-sidebar-foreground md:min-h-screen flex md:flex-col">
        <div className="p-6 flex items-center gap-2 border-b border-sidebar-border flex-1 md:flex-none">
          <div className="size-9 rounded-xl bg-primary flex items-center justify-center">
            <Swords className="size-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-lg">ValhallaFit</div>
            <div className="text-xs opacity-70 capitalize">{role?.replace("_", " ") ?? "..."}</div>
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
        <nav className="hidden md:flex flex-col p-3 gap-1 flex-1">
          {items.map((item) => {
            const active = path === item.to || (!["/trainer", "/client"].includes(item.to) && path.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"
                }`}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-2 hidden md:block">
          <div className="px-3 py-2 text-sm">
            <div className="font-medium truncate">{fullName || user?.email}</div>
            <div className="text-xs opacity-60 truncate">{user?.email}</div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={async () => { await signOut(); nav({ to: "/auth" }); }}
          >
            <LogOut className="size-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-sidebar text-sidebar-foreground border-t border-sidebar-border flex justify-around z-50 overflow-x-auto">
        {items.map((item) => {
          const active = path === item.to;
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to} className={`flex flex-col items-center gap-1 py-2 px-3 text-xs ${active ? "text-primary" : ""}`}>
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
        <button onClick={async () => { await signOut(); nav({ to: "/auth" }); }} className="flex flex-col items-center gap-1 py-2 px-3 text-xs">
          <LogOut className="size-5" />
          Exit
        </button>
      </nav>

      <main className="flex-1 p-6 md:p-10 pb-24 md:pb-10 max-w-6xl mx-auto w-full">{children}</main>
    </div>
  );
}
