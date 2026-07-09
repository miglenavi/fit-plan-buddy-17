import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { useViewAs } from "@/lib/viewAs";

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
  /** True when a super admin is previewing another user. */
  isImpersonating: boolean;
  /** The real signed-in super admin, when impersonating. */
  realUser: User | null;
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
  const { target } = useViewAs();

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
        setLoading(true);
        setTimeout(() => {
          loadProfile(s.user.id).finally(() => setLoading(false));
        }, 0);
      } else {
        setRoles([]);
        setFullName(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const realUser = session?.user ?? null;
  const realIsSuperAdmin = roles.includes("super_admin");
  const impersonating = realIsSuperAdmin && !!target;

  const effectiveUser: User | null = impersonating
    ? ({
        ...(realUser as User),
        id: target!.userId,
        email: target!.email ?? undefined,
        user_metadata: {},
      } as User)
    : realUser;

  const effectiveRoles: AppRole[] = impersonating ? target!.roles : roles;
  const effectiveFullName = impersonating ? target!.fullName : fullName;
  const role = pickPrimary(effectiveRoles);

  const value: AuthCtx = {
    user: effectiveUser,
    session,
    roles: effectiveRoles,
    role,
    isSuperAdmin: effectiveRoles.includes("super_admin"),
    isTrainer: effectiveRoles.includes("trainer") || effectiveRoles.includes("super_admin"),
    isClient: effectiveRoles.includes("client"),
    fullName: effectiveFullName,
    loading,
    isImpersonating: impersonating,
    realUser,
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
