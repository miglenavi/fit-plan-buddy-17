import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Swords, LogOut, History, Home, User } from "lucide-react";
import type { ReactNode } from "react";

export function ClientShell({ children, title }: { children: ReactNode; title?: string }) {
  const { signOut } = useAuth();
  const nav = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur border-b">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/client" className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
              <Swords className="size-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">{title ?? "ValhallaFit"}</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              to="/client"
              className={`p-2 rounded-md ${path === "/client" ? "text-primary" : "text-muted-foreground"}`}
              aria-label="Today"
            >
              <Home className="size-5" />
            </Link>
            <Link
              to="/client/history"
              className={`p-2 rounded-md ${path.startsWith("/client/history") ? "text-primary" : "text-muted-foreground"}`}
              aria-label="History"
            >
              <History className="size-5" />
            </Link>
            <Link
              to="/client/profile"
              className={`p-2 rounded-md ${path.startsWith("/client/profile") ? "text-primary" : "text-muted-foreground"}`}
              aria-label="Profile"
            >
              <User className="size-5" />
            </Link>
            <button
              onClick={async () => { await signOut(); nav({ to: "/auth" }); }}
              className="p-2 rounded-md text-muted-foreground"
              aria-label="Sign out"
            >
              <LogOut className="size-5" />
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-md mx-auto px-4 py-5 pb-24">{children}</main>
    </div>
  );
}
