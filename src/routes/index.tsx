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
  Rocket,
  X,
  ArrowRight,
} from "lucide-react";
import trainerDashboardImg from "@/assets/screenshot-trainer-dashboard.jpg";
import planBuilderImg from "@/assets/screenshot-plan-builder.jpg";
import clientMobileImg from "@/assets/screenshot-client-mobile.jpg";

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
      {/* Announcement banner */}
      {bannerOpen && (
        <div className="bg-foreground text-background">
          <div className="container mx-auto px-4 py-2.5 flex items-center justify-center gap-3 text-sm">
            <Rocket className="size-4 shrink-0 text-primary" />
            <p className="text-center">
              Built as an AI-assisted product experiment using Lovable and Supabase.{" "}
              <button
                onClick={() => setAboutOpen(true)}
                className="underline underline-offset-2 font-medium hover:text-primary transition-colors"
              >
                Learn more →
              </button>
            </p>
            <button
              onClick={dismissBanner}
              aria-label="Dismiss announcement"
              className="ml-2 opacity-70 hover:opacity-100 transition-opacity shrink-0"
            >
              <X className="size-4" />
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
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
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
          <div className="container mx-auto px-4 pt-16 pb-12 md:pt-24 md:pb-20 relative">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground mb-6">
                <span className="size-1.5 rounded-full bg-primary" />
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
            </div>

            {/* Product screenshot showcase */}
            <div className="mt-14 md:mt-20 max-w-6xl mx-auto">
              <div className="relative rounded-2xl border bg-card shadow-2xl overflow-hidden">
                <div className="flex items-center gap-1.5 px-4 py-3 border-b bg-muted/50">
                  <span className="size-2.5 rounded-full bg-destructive/60" />
                  <span className="size-2.5 rounded-full bg-chart-3/60" />
                  <span className="size-2.5 rounded-full bg-primary/60" />
                  <span className="ml-3 text-xs text-muted-foreground">app.valhallafit.com / trainer</span>
                </div>
                <img
                  src={trainerDashboardImg}
                  alt="ValhallaFit trainer dashboard showing today's sessions, weekly schedule, and client stats"
                  width={1600}
                  height={1024}
                  className="w-full h-auto block"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20 md:py-28">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center mb-14">
              <p className="text-sm font-medium text-primary mb-3">Features</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Everything trainers need in one platform
              </h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
              {[
                { icon: Users, title: "Client Management", body: "Manage your client roster and coaching relationships in one place." },
                { icon: Dumbbell, title: "Progressive Workout Planning", body: "Build structured programs designed for long-term progress." },
                { icon: Smartphone, title: "Mobile Experience", body: "Clients access workouts, complete sessions, and track progress from their phone." },
                { icon: LineChart, title: "Progress Tracking", body: "Monitor completed workouts and performance over time." },
                { icon: Library, title: "Exercise Library", body: "Create and organize workouts faster." },
                { icon: ShieldCheck, title: "Role-Based Access", body: "Dedicated experiences for trainers, clients, and administrators." },
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
                Build progressive programs in minutes
              </h3>
              <p className="mt-4 text-muted-foreground">
                Drag exercises from your library, set targets per week, and assign plans to one
                client or many. Programs are structured so progression isn't an afterthought.
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
                Clients train from their phone
              </h3>
              <p className="mt-4 text-muted-foreground">
                A focused workout screen with sets, reps, and progress tracking — designed for the
                gym floor, not the boardroom. Clients tick off exercises and the trainer sees it
                immediately.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-20 md:py-28">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-14">
              <p className="text-sm font-medium text-primary mb-3">How it works</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                A simple coaching loop
              </h2>
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
                We're building tools that help trainers identify opportunities, risks, and coaching
                actions faster.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: LineChart, title: "Progression Recommendations", body: "Suggest when clients may be ready to increase weight, volume, intensity, or training frequency." },
                { icon: Activity, title: "Client Analytics", body: "Automatically surface trends in performance, consistency, and adherence." },
                { icon: AlertTriangle, title: "Risk Detection", body: "Highlight potential issues such as missed sessions, insufficient recovery, lack of mobility work, or declining performance patterns." },
                { icon: FileText, title: "Weekly Coach Summaries", body: "Provide a simple overview of client progress and areas that may need attention." },
                { icon: Bell, title: "Motivation & Accountability", body: "Help clients stay consistent through reminders, milestones, and coaching nudges." },
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
              into a single platform. Our goal is to simplify coaching today while building
              intelligent tools that help trainers make better decisions tomorrow.
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
            About this project
          </button>
        </div>
      </footer>

      {/* About modal */}
      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">About this project</DialogTitle>
            <DialogDescription className="sr-only">
              Background on ValhallaFit and what it does today.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm leading-relaxed">
            <p className="text-muted-foreground">
              ValhallaFit was created to explore how modern AI-assisted development tools can
              accelerate product creation and validation.
            </p>
            <div>
              <p className="font-semibold mb-2">Current functionality includes:</p>
              <ul className="space-y-1.5 text-muted-foreground">
                {[
                  "Trainer dashboard",
                  "Client management",
                  "Workout planning",
                  "Progressive training programs",
                  "Exercise library",
                  "Progress tracking",
                  "Mobile workout experience for clients",
                  "Role-based permissions",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 rounded-full bg-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-muted-foreground">
              The long-term vision is to help trainers spend less time on administration and more
              time coaching through intelligent automation and coaching insights.
            </p>
            <p className="text-sm pt-2 border-t">
              Built by <span className="font-semibold text-foreground">Miglė Navickaitė</span>.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
