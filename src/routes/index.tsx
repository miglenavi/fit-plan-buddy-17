import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Swords,
  Smartphone,
  LineChart,
  Library,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  FileText,
  X,
  ArrowRight,
  LayoutDashboard,
  ClipboardList,
  CheckCircle2,
  Repeat,
} from "lucide-react";



export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ValhallaFit — Coaching platform for personal trainers" },
      {
        name: "description",
        content:
          "ValhallaFit helps personal trainers manage clients, build progressive workout plans, and track performance from one platform.",
      },
      { property: "og:title", content: "ValhallaFit — Coaching platform for personal trainers" },
      {
        property: "og:description",
        content:
          "Manage clients, build progressive workout plans, and track performance from one platform.",
      },
      { property: "og:url", content: "https://fit-plan-buddy-17.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://fit-plan-buddy-17.lovable.app/" }],
  }),
  component: Index,
});

const BANNER_KEY = "vf-banner-dismissed";

function Index() {
  const { user, role, loading } = useAuth();
  const [bannerOpen, setBannerOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(BANNER_KEY) !== "1";
  });
  const [aboutOpen, setAboutOpen] = useState(false);

  const dismissBanner = () => {
    setBannerOpen(false);
    try {
      window.localStorage.setItem(BANNER_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  if (user) {
    if (role === "super_admin") return <Navigate to="/admin/applications" />;
    if (role === "trainer") return <Navigate to="/trainer" />;
    if (role === "client") return <Navigate to="/client" />;
    return <Navigate to="/pending" />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Announcement banner — personal, subtle */}
      {bannerOpen && (
        <div className="border-b bg-accent/40">
          <div className="container mx-auto px-4 py-2 flex items-center justify-center gap-3 text-sm">
            <button
              onClick={() => setAboutOpen(true)}
              className="text-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <span aria-hidden>🚀</span>{" "}
              <span className="font-medium text-foreground">Why did I build ValhallaFit?</span>{" "}
              <span className="underline underline-offset-2">Read the story →</span>
            </button>
            <button
              onClick={dismissBanner}
              aria-label="Dismiss"
              className="ml-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-primary flex items-center justify-center">
              <Swords className="size-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">ValhallaFit</span>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#coming-soon" className="hover:text-foreground transition-colors">Roadmap</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost" size="sm">Client login</Button></Link>
            <Link to="/auth"><Button size="sm">Apply as trainer</Button></Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/40 via-background to-background pointer-events-none" />
          <div className="container mx-auto px-4 pt-16 pb-20 md:pt-24 md:pb-28 relative">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground mb-6">
                <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                In active development
              </div>
              <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
                A coaching platform for personal trainers.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Help clients stay consistent, track progress, and build stronger training habits.
              </p>

              <div className="mt-8 flex flex-col items-center gap-3">
                <Link to="/auth">
                  <Button size="lg" className="gap-2">
                    Apply as trainer <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <Link
                  to="/auth"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Already a client? Sign in →
                </Link>
              </div>
            </div>
          </div>
        </section>



        {/* Two sides of the platform — trainer + client, illustrated with feature lists */}
        <section className="py-16 md:py-20 bg-muted/40 border-y">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="max-w-2xl mx-auto text-center mb-12">
              <p className="text-sm font-medium text-primary mb-3">Two sides, one platform</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Built for the trainer and the client
              </h2>
              <p className="mt-4 text-muted-foreground">
                A web workspace for the trainer. A focused mobile experience for the client.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {/* Trainer side */}
              <div className="rounded-2xl border bg-card p-6 md:p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center">
                    <LayoutDashboard className="size-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      For trainers · Web
                    </div>
                    <h3 className="font-semibold text-lg">Coach from one workspace</h3>
                  </div>
                </div>
                <ul className="space-y-3 text-sm">
                  {[
                    "Spend session time coaching, not updating spreadsheets",
                    "Build progressive workout plans with reusable exercises",
                    "Assign plans and schedule sessions per client",
                    "Review completed workouts and progress over time",
                  ].map((item) => (

                    <li key={item} className="flex items-start gap-2.5">
                      <CheckCircle2 className="size-4 text-primary mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Client side */}
              <div className="rounded-2xl border bg-card p-6 md:p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Smartphone className="size-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      For clients · Mobile
                    </div>
                    <h3 className="font-semibold text-lg">Train without the back-and-forth</h3>
                  </div>
                </div>
                <ul className="space-y-3 text-sm">
                  {[
                    "See today's workout and what's coming next",
                    "Log sets, reps, and weights from the gym floor",
                    "Look back at past sessions to remember last time's load",
                    "See progress build up over time and stay motivated",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <CheckCircle2 className="size-4 text-primary mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Progressive training callout */}
            <div className="mt-8 rounded-2xl border bg-card p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-5">
              <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Repeat className="size-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Progressive programs, not one-off workouts</h3>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  Plans are designed to evolve week after week. Each completed session feeds back
                  into the next coaching decision, so clients keep moving forward instead of
                  repeating the same routine.
                </p>
              </div>
            </div>
          </div>
        </section>


        {/* How it works */}
        <section id="how-it-works" className="py-16 md:py-20">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-10">
              <p className="text-sm font-medium text-primary mb-3">How it works</p>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
                A simple coaching loop
              </h2>
            </div>
            <ol className="grid gap-4 md:grid-cols-2">
              {[
                { title: "Plan", body: "Build a progressive program from your exercise library." },
                { title: "Assign", body: "Schedule the plan for a specific client." },
                { title: "Train", body: "The client follows it on their phone and logs each set." },
                { title: "Review", body: "Check what was completed and adjust the next block." },
              ].map((step, i) => (
                <li
                  key={step.title}
                  className="flex gap-4 items-start p-5 rounded-xl border bg-card"
                >
                  <span className="size-8 shrink-0 rounded-lg bg-primary text-primary-foreground font-semibold flex items-center justify-center text-sm">
                    {i + 1}
                  </span>
                  <div className="pt-0.5">
                    <div className="font-semibold text-sm md:text-base">{step.title}</div>
                    <p className="text-sm text-muted-foreground mt-0.5">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Roadmap */}
        <section id="coming-soon" className="py-16 md:py-20 bg-muted/40 border-y">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="max-w-2xl mx-auto text-center mb-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium mb-4">
                <Sparkles className="size-3.5" /> Roadmap
              </div>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
                What's next
              </h2>
              <p className="mt-4 text-muted-foreground">
                Helping trainers spend less time on admin and make faster coaching decisions.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {[
                { icon: LineChart, title: "Progression suggestions", body: "Surface when a client may be ready to increase weight, volume, or intensity." },
                { icon: AlertTriangle, title: "Risk signals", body: "Flag missed sessions, stalled progress, or signs a plan needs adjusting." },
                { icon: FileText, title: "Weekly summaries", body: "A short read-out of who's progressing and what changed this week." },
              ].map((f) => (
                <Card key={f.title} className="border-dashed bg-card/60">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="size-10 rounded-lg bg-accent flex items-center justify-center">
                        <f.icon className="size-5 text-primary" />
                      </div>
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Soon</span>
                    </div>
                    <h3 className="font-semibold">{f.title}</h3>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Slim CTA strip */}
        <section className="border-b">
          <div className="container mx-auto px-4 py-10 md:py-12 flex flex-col md:flex-row items-center justify-between gap-4 max-w-5xl">
            <p className="text-base md:text-lg font-medium text-foreground text-center md:text-left">
              Coaching a few clients and tired of the spreadsheets?
            </p>
            <Link to="/auth">
              <Button size="lg" className="gap-2">
                Apply as trainer <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </section>

      </main>

      <footer className="border-t">
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-md bg-primary flex items-center justify-center">
              <Swords className="size-3.5 text-primary-foreground" />
            </div>
            <span>© {new Date().getFullYear()} ValhallaFit</span>
          </div>
          <button
            onClick={() => setAboutOpen(true)}
            className="hover:text-foreground transition-colors"
          >
            Why did I build ValhallaFit?
          </button>
        </div>
      </footer>

      {/* About modal — personal story */}
      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Why did I build ValhallaFit?</DialogTitle>
            <DialogDescription className="sr-only">
              The personal story behind ValhallaFit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              ValhallaFit started because my partner began coaching people in the gym.
            </p>
            <p>
              Like many trainers, he quickly found himself managing workout plans, tracking
              progress, and updating spreadsheets instead of focusing on coaching.
            </p>
            <p>
              At the same time, I was one of his clients. I wanted an easier way to remember what
              weights I used last time, see my progress, and celebrate small wins along the way.
            </p>
            <p className="text-foreground font-medium">So I started building ValhallaFit.</p>
            <p>
              The goal is simple: help trainers spend less time managing workouts and more time
              helping people make progress.
            </p>
            <p>
              And yes, the name is a bit of an inside joke. If you've met my partner, you'll
              probably understand why Valhalla felt like the right name.
            </p>
            <p className="text-sm pt-3 border-t text-foreground">
              — <span className="font-semibold">Miglė Navickaitė</span>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
