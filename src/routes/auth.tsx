import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Swords } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false, component: AuthPage });

function AuthPage() {
  const { user, role, loading } = useAuth();
  const nav = useNavigate();

  const [trainerExists, setTrainerExists] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.rpc("trainer_exists").then(({ data }) => {
      setTrainerExists(Boolean(data));
    });
  }, []);

  useEffect(() => {
    if (!loading && user && role) {
      nav({ to: role === "trainer" ? "/trainer" : "/client" });
    }
  }, [user, role, loading, nav]);

  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Welcome back!");
  };

  const handleTrainerSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName, role: "trainer" },
      },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Trainer account created!");
      setTrainerExists(true);
    }
  };

  const showSignup = trainerExists === false;

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
          <Tabs defaultValue={showSignup ? "signup" : "login"}>
            <CardHeader>
              <TabsList className={`grid w-full ${showSignup ? "grid-cols-2" : "grid-cols-1"}`}>
                <TabsTrigger value="login">Log in</TabsTrigger>
                {showSignup && <TabsTrigger value="signup">Claim trainer</TabsTrigger>}
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
                </form>
              </TabsContent>
              {showSignup && (
                <TabsContent value="signup">
                  <form onSubmit={handleTrainerSignup} className="space-y-4">
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
                    <Button type="submit" className="w-full" disabled={busy}>{busy ? "..." : "Create trainer account"}</Button>
                  </form>
                </TabsContent>
              )}
            </CardContent>
          </Tabs>
        </Card>
        <p className="text-xs text-center text-muted-foreground mt-4">
          {showSignup
            ? "One trainer runs the gym. Clients are added by the trainer."
            : "Clients: log in with the credentials your trainer gave you."}
        </p>
      </div>
    </div>
  );
}
