import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/auth";

const STORAGE_KEY = "valhalla.viewAs";

export type ViewAsTarget = {
  userId: string;
  fullName: string | null;
  email: string | null;
  roles: AppRole[];
};

interface ViewAsCtx {
  target: ViewAsTarget | null;
  setTarget: (t: ViewAsTarget | null) => void;
  startViewAs: (userId: string) => Promise<void>;
}

const Ctx = createContext<ViewAsCtx | undefined>(undefined);

export function ViewAsProvider({ children }: { children: ReactNode }) {
  const [target, setTargetState] = useState<ViewAsTarget | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setTargetState(JSON.parse(raw));
    } catch {}
  }, []);

  const setTarget = (t: ViewAsTarget | null) => {
    setTargetState(t);
    if (typeof window === "undefined") return;
    if (t) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(t));
    else sessionStorage.removeItem(STORAGE_KEY);
  };

  const startViewAs = async (userId: string) => {
    const [{ data: profile }, { data: roleRows }] = await Promise.all([
      supabase.from("profiles").select("id, full_name").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    const roles = (roleRows ?? []).map((r) => r.role as AppRole);
    setTarget({
      userId,
      fullName: profile?.full_name ?? null,
      email: null,
      roles,
    });
  };

  return <Ctx.Provider value={{ target, setTarget, startViewAs }}>{children}</Ctx.Provider>;
}

export function useViewAs() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useViewAs must be used within ViewAsProvider");
  return v;
}
