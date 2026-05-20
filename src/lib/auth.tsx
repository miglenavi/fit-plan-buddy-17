import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "trainer" | "client" | "super_admin";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  /** primary role for routing: super_admin > trainer > client */
  role: AppRole | null;
  isSuperAdmin: boolean;
  isTrainer: boolean;
  isClient: boolean;
  fullName: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

function pickPrimary(roles: AppRole[]): AppRole | null {
  if (roles.includes("super_admin")) return "super_admin";
  if (roles.includes("trainer")) return "trainer";
  if (roles.includes("client")) return "client";
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [fullName, setFullName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const [{ data: roleRows }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle(),
    ]);
    setRoles((roleRows ?? []).map((r) => r.role as AppRole));
    setFullName(profile?.full_name ?? null);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => loadProfile(s.user.id), 0);
      } else {
        setRoles([]);
        setFullName(null);
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const role = pickPrimary(roles);

  const value: AuthCtx = {
    user: session?.user ?? null,
    session,
    roles,
    role,
    isSuperAdmin: roles.includes("super_admin"),
    isTrainer: roles.includes("trainer") || roles.includes("super_admin"),
    isClient: roles.includes("client"),
    fullName,
    loading,
    signOut: async () => { await supabase.auth.signOut(); },
    refresh: async () => { if (session?.user) await loadProfile(session.user.id); },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
