import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Swords } from "lucide-react";
import { toast } from "sonner";
import { PENDING_INVITE_KEY } from "@/lib/invite";


export const Route = createFileRoute("/join/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Join your trainer — ValhallaFit" },
      { name: "description", content: "Accept your trainer's invite and start training with ValhallaFit." },
      { property: "og:title", content: "Join your trainer — ValhallaFit" },
      { property: "og:description", content: "Accept your trainer's invite and start training with ValhallaFit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const { token } = Route.useParams();
  const nav = useNavigate();
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try { localStorage.setItem(PENDING_INVITE_KEY, token); } catch { /* ignore */ }
      const [{ data }, { data: sess }] = await Promise.all([
        supabase.rpc("get_invite_info", { _token: token }),
        supabase.auth.getSession(),
      ]);
      setInfo(Array.isArray(data) ? data[0] : data);
      setSignedIn(!!sess.session);
      setLoading(false);
    })();
  }, [token]);

  const accept = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("accept_client_invite", { _token: token });
    setBusy(false);
    if (error) return toast.error(error.message);
    try { localStorage.removeItem(PENDING_INVITE_KEY); } catch { /* ignore */ }
    toast.success("You're connected with your trainer!");
    nav({ to: "/client" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-accent/30">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center gap-2">
          <div className="size-12 rounded-2xl bg-primary flex items-center justify-center">
            <Swords className="size-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">ValhallaFit</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {loading
                ? "Checking your invite…"
                : info?.valid
                  ? `${info.trainer_name ?? "Your trainer"} invited you to train`
                  : "This invite is no longer valid"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!loading && info?.valid && (
              signedIn ? (
                <Button className="w-full" disabled={busy} onClick={accept}>
                  {busy ? "…" : "Accept invite"}
                </Button>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Create your account (or log in) and you'll be connected automatically.
                  </p>
                  <Button asChild className="w-full">
                    <Link to="/auth">Create account or log in</Link>
                  </Button>
                </>
              )
            )}
            {!loading && !info?.valid && (
              <>
                <p className="text-sm text-muted-foreground">
                  Ask your trainer for a fresh invite link, or sign up and request access to them directly.
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/auth">Go to sign up</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
