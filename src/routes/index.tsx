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
  Users,
  Dumbbell,
  Smartphone,
  LineChart,
  Library,
  ShieldCheck,
  Sparkles,
  Activity,
  AlertTriangle,
  FileText,
  Bell,
  X,
  ArrowRight,
  ArrowDown,
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
            <a href="#today" className="hover:text-foreground transition-colors">What exists</a>
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
        {/* Hero — tightened spacing */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/40 via-background to-background pointer-events-none" />
          <div className="container mx-auto px-4 pt-10 pb-8 md:pt-14 md:pb-12 relative">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground mb-6">
                <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                In active development · v1.0
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
                Coach clients. Track progress.{" "}
                <span className="text-primary">Build stronger training habits.</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
                ValhallaFit helps personal trainers manage clients, create progressive workout
                plans, and track performance from one platform.
              </p>
              <div className="mt-8 flex flex-wrap gap-3 justify-center">
                <Link to="/auth">
                  <Button size="lg" className="gap-2">
                    Apply as trainer <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="lg" variant="outline">Client login</Button>
                </Link>
              </div>
              <p className="mt-5 text-xs md:text-sm text-muted-foreground">
                Trainer dashboard <span className="mx-2 opacity-50">•</span> Client mobile app <span className="mx-2 opacity-50">•</span> Progressive workout planning
              </p>
            </div>

            {/* Coaching workflow — simple illustrated steps, no fake dashboards */}
            <div className="mt-12 md:mt-16 max-w-5xl mx-auto">
              <div className="grid gap-3 md:gap-4 md:grid-cols-4 relative">
                {[
                  { icon: Users, label: "Manage clients", body: "One roster, real notes, no spreadsheets." },
                  { icon: ClipboardList, label: "Build plans", body: "Reusable programs with sets, reps, and progression." },
                  { icon: Smartphone, label: "Clients train", body: "Workouts delivered to the client's phone." },
                  { icon: LineChart, label: "Track progress", body: "See what changed and adjust the next block." },
                ].map((s, i) => (
                  <div key={s.label} className="relative">
                    <div className="h-full rounded-xl border bg-card p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="size-9 rounded-lg bg-accent flex items-center justify-center">
                          <s.icon className="size-5 text-primary" />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">Step {i + 1}</span>
                      </div>
                      <div className="font-semibold">{s.label}</div>
                      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{s.body}</p>
                    </div>
                    {i < 3 && (
                      <>
                        <ArrowRight className="hidden md:block size-4 text-muted-foreground absolute top-1/2 -right-3 -translate-y-1/2" />
                        <ArrowDown className="md:hidden size-4 text-muted-foreground mx-auto my-1" />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* What exists today */}
        <section id="today" className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center mb-12">
              <p className="text-sm font-medium text-primary mb-3">Available now</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                What exists today
              </h2>
              <p className="mt-4 text-muted-foreground">
                Everything needed to run and deliver coaching in one place.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
              {[
                { icon: LayoutDashboard, title: "Trainer dashboard", body: "One home base for clients, plans, exercises, and today's sessions — less spreadsheet juggling, more coaching." },
                { icon: Smartphone, title: "Client mobile app", body: "Clients always know what to do next and can log sets from the gym floor without messaging back and forth." },
                { icon: ClipboardList, title: "Program builder", body: "Build structured programs that help clients improve week after week, then reuse or tailor them per client." },
                { icon: LineChart, title: "Progress tracking", body: "See how each client is progressing over time and know when a plan needs adjusting." },
                { icon: Library, title: "Exercise library", body: "A reusable catalogue so building the next plan takes minutes, not an afternoon." },
                { icon: ShieldCheck, title: "Role-based access", body: "Dedicated experiences for trainers and clients, with the right permissions out of the box." },
              ].map((f) => (
                <Card key={f.title} className="border bg-card hover:border-primary/40 transition-colors">
                  <CardContent className="p-6">
                    <div className="size-10 rounded-lg bg-accent flex items-center justify-center mb-4">
                      <f.icon className="size-5 text-primary" />
                    </div>
                    <h3 className="font-semibold">{f.title}</h3>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Product showcase strip: plan builder + mobile */}
        <section className="py-16 md:py-24 bg-muted/40 border-y">
          <div className="container mx-auto px-4 grid gap-10 lg:grid-cols-2 items-center max-w-6xl">
            <div>
              <p className="text-sm font-medium text-primary mb-3">Workout plan builder</p>
              <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
                Programs that drive real progression
              </h3>
              <p className="mt-4 text-muted-foreground">
                Create structured progressive programs that help clients improve week after week.
                Reuse them across your roster or tailor them to a single client — without rebuilding
                from scratch every time.
              </p>
            </div>
            <div className="rounded-xl border bg-card shadow-lg overflow-hidden">
              <img
                src={planBuilderImg}
                alt="ValhallaFit workout plan builder with exercise library and sets/reps panel"
                width={1600}
                height={1024}
                loading="lazy"
                className="w-full h-auto block"
              />
            </div>
          </div>

          <div className="container mx-auto px-4 grid gap-10 lg:grid-cols-2 items-center max-w-6xl mt-20">
            <div className="order-2 lg:order-1 flex justify-center">
              <img
                src={clientMobileImg}
                alt="ValhallaFit client mobile workout screen showing exercises and progress"
                width={420}
                height={560}
                loading="lazy"
                className="w-full max-w-xs h-auto rounded-2xl"
              />
            </div>
            <div className="order-1 lg:order-2">
              <p className="text-sm font-medium text-primary mb-3">Client mobile experience</p>
              <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
                Coaching that travels to the gym floor
              </h3>
              <p className="mt-4 text-muted-foreground">
                Clients always know what to do next and trainers can track progress without chasing
                updates. Each completed set syncs back so the next coaching decision is grounded in
                real data.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-20 md:py-28">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-12">
              <p className="text-sm font-medium text-primary mb-3">How it works</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                A simple coaching loop
              </h2>
              <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
                ValhallaFit supports the entire coaching journey, from program creation to
                long-term client progress.
              </p>
            </div>
            <ol className="grid gap-4 md:grid-cols-2">
              {[
                "Trainer joins ValhallaFit",
                "Creates workout programs",
                "Assigns plans to clients",
                "Clients complete workouts in the mobile app",
                "Progress is tracked and reviewed",
                "Programs are continuously improved based on results",
              ].map((step, i) => (
                <li
                  key={i}
                  className="flex gap-4 items-start p-5 rounded-xl border bg-card"
                >
                  <span className="size-8 shrink-0 rounded-lg bg-primary text-primary-foreground font-bold flex items-center justify-center text-sm">
                    {i + 1}
                  </span>
                  <p className="pt-1 text-sm md:text-base">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Coming soon */}
        <section id="coming-soon" className="py-20 md:py-28 bg-muted/40 border-y">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="max-w-2xl mx-auto text-center mb-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium mb-4">
                <Sparkles className="size-3.5" /> Roadmap
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Smarter coaching is coming
              </h2>
              <p className="mt-4 text-muted-foreground">
                ValhallaFit is evolving from workout management software into a coaching assistant
                that helps trainers identify opportunities, risks, and next actions faster.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: LineChart, title: "Progression Recommendations", body: "Suggest when clients may be ready to increase weight, volume, intensity, or training frequency." },
                { icon: Activity, title: "Client Analytics", body: "Automatically surface trends in performance, consistency, and adherence." },
                { icon: AlertTriangle, title: "Risk Detection", body: "Highlight potential issues such as missed sessions, insufficient recovery, or declining performance patterns." },
                { icon: FileText, title: "Weekly Coach Summaries", body: "A simple overview of who is progressing, who may need support, and what changed this week." },
                { icon: Bell, title: "Client Motivation & Accountability", body: "Automated reminders and coaching nudges that help clients stay consistent between sessions." },
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

        {/* Built for modern coaching */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Built for modern coaching
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              ValhallaFit combines workout planning, client management, and performance tracking
              into a single platform.
            </p>
            <p className="mt-4 text-muted-foreground">
              Today it helps trainers manage coaching more efficiently. Tomorrow it will help
              trainers make better decisions through automation, progression insights, and
              proactive coaching recommendations.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <Link to="/auth">
                <Button size="lg" className="gap-2">
                  Apply as trainer <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline">Client login</Button>
              </Link>
            </div>
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
