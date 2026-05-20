import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Swords } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false, component: AuthPage });

function AuthPage() {
  const { user, role, loading } = useAuth();
  const nav = useNavigate();

  // Detect invite/recovery flow from URL hash
  const [isInvite, setIsInvite] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.includes("type=invite") || hash.includes("type=recovery")) {
      setIsInvite(true);
    }
  }, []);

  useEffect(() => {
    if (loading || !user || isInvite) return;
    if (role === "super_admin") nav({ to: "/admin/applications" });
    else if (role === "trainer") nav({ to: "/trainer" });
    else if (role === "client") nav({ to: "/client" });
    else nav({ to: "/pending" });
  }, [user, role, loading, nav, isInvite]);

  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [note, setNote] = useState("");

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password set! Welcome.");
    setIsInvite(false);
    window.location.hash = "";
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Welcome back!");
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName, role: "trainer", note },
      },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Application submitted! Awaiting approval.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-accent/30">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="size-12 rounded-2xl bg-primary flex items-center justify-center">
            <Swords className="size-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ValhallaFit</h1>
            <p className="text-sm text-muted-foreground">Train like a Viking.</p>
          </div>
        </div>

        <Card>
          {isInvite ? (
            <>
              <CardHeader>
                <h2 className="text-lg font-semibold">Set your password</h2>
                <p className="text-sm text-muted-foreground">Welcome! Choose a password to finish setting up your account.</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="np">New password</Label>
                    <Input id="np" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>{busy ? "..." : "Set password & continue"}</Button>
                </form>
              </CardContent>
            </>
          ) : (
          <Tabs defaultValue="login">
            <CardHeader>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="login">Log in</TabsTrigger>
                <TabsTrigger value="apply">Apply as trainer</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="le">Email</Label>
                    <Input id="le" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lp">Password</Label>
                    <Input id="lp" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>{busy ? "..." : "Log in"}</Button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!email) return toast.error("Enter your email first");
                      setBusy(true);
                      const { error } = await supabase.auth.resetPasswordForEmail(email, {
                        redirectTo: `${window.location.origin}/auth`,
                      });
                      setBusy(false);
                      if (error) toast.error(error.message);
                      else toast.success("Password reset email sent. Check your inbox.");
                    }}
                    className="w-full text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </button>
                </form>
              </TabsContent>
              <TabsContent value="apply">
                <form onSubmit={handleApply} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sn">Full name</Label>
                    <Input id="sn" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="se">Email</Label>
                    <Input id="se" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sp">Password</Label>
                    <Input id="sp" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="snote">Tell us about yourself (optional)</Label>
                    <Textarea id="snote" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Experience, certifications, gym…" />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>{busy ? "..." : "Submit application"}</Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
          )}
        </Card>
        <p className="text-xs text-center text-muted-foreground mt-4">
          Clients: log in with the credentials your trainer gave you. Trainers: apply and wait for super‑admin approval.
        </p>
      </div>
    </div>
  );
}
