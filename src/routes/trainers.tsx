import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Swords,
  Users,
  ClipboardList,
  Dumbbell,
  Calendar,
  History,
  LayoutDashboard,
  ArrowLeft,
} from "lucide-react";

export const Route = createFileRoute("/trainers")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "For trainers — ValhallaFit" },
      {
        name: "description",
        content:
          "Grow your coaching business: manage clients, build workout plans, schedule sessions, and track progress — all in one place.",
      },
      { property: "og:title", content: "For trainers — ValhallaFit" },
      {
        property: "og:description",
        content:
          "Manage clients, build workout plans, schedule sessions, and track progress.",
      },
    ],
    links: [
      { rel: "canonical", href: "https://fit-plan-buddy-17.lovable.app/trainers" },
    ],
  }),
  component: TrainersPage,
});

const features = [
  {
    icon: Users,
    title: "Client management",
    body: "Invite clients by email, see their profile, and keep everything they're working on in one view.",
  },
  {
    icon: ClipboardList,
    title: "Workout plan builder",
    body: "Build reusable plans with sets, reps, and notes. Assign them in a couple of clicks.",
  },
  {
    icon: Dumbbell,
    title: "Exercise library",
    body: "Your own exercises plus a shared library. Add demos, cues, and categories.",
  },
  {
    icon: Calendar,
    title: "Weekly schedule",
    body: "Drag plans onto the right day. Clients see exactly what's coming up.",
  },
  {
    icon: History,
    title: "Session history",
    body: "See what each client completed, when, and how it went — without chasing screenshots.",
  },
  {
    icon: LayoutDashboard,
    title: "One dashboard",
    body: "Today's sessions, clients, plans, and exercises — all on a single home screen.",
  },
];

const faqs = [
  {
    q: "Is it free?",
    a: "Yes, while we're in early access. We'll let you know well in advance if anything changes.",
  },
  {
    q: "How do I get approved?",
    a: "Apply with your name and email. A super-admin reviews applications and approves trainers manually to keep quality high.",
  },
  {
    q: "Can I bring my existing clients?",
    a: "Absolutely. Once approved, invite each client by email — they'll set a password and be ready to train.",
  },
  {
    q: "How do clients log in?",
    a: "They get an invite email from you, set their password, and use the client log-in page on any device.",
  },
];

function TrainersPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/30">
      <header className="container mx-auto flex items-center justify-between px-4 py-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-9 rounded-xl bg-primary flex items-center justify-center">
            <Swords className="size-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">ValhallaFit</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="size-4 mr-1" /> Home
            </Button>
          </Link>
          <Link to="/auth">
            <Button variant="ghost" size="sm">Log in</Button>
          </Link>
          <Link to="/auth">
            <Button size="sm">Apply as trainer</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4">
        <section className="py-16 md:py-24 text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Grow your coaching business.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Everything you need to run your training — clients, plans,
            schedule, and history — without juggling spreadsheets and chat
            screenshots.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link to="/auth">
              <Button size="lg">Apply as trainer</Button>
            </Link>
            <Link to="/">
              <Button size="lg" variant="outline">Back to home</Button>
            </Link>
          </div>
        </section>

        <section className="py-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title}>
              <CardContent className="p-6">
                <f.icon className="size-8 text-primary mb-4" />
                <h3 className="font-semibold text-lg">{f.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="py-16 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
            How onboarding works
          </h2>
          <ol className="space-y-5">
            {[
              "Apply with your name and email.",
              "A super-admin reviews and approves your account.",
              "Invite your first client by email and start training.",
            ].map((step, i) => (
              <li key={i} className="flex gap-4 items-start">
                <span className="size-8 shrink-0 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <p className="pt-1">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="py-12 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
            Frequently asked
          </h2>
          <div className="space-y-4">
            {faqs.map((f) => (
              <Card key={f.q}>
                <CardContent className="p-6">
                  <h3 className="font-semibold">{f.q}</h3>
                  <p className="text-sm text-muted-foreground mt-2">{f.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold">Ready to coach?</h2>
          <p className="mt-3 text-muted-foreground">
            Apply now and we'll get back to you shortly.
          </p>
          <div className="mt-6">
            <Link to="/auth">
              <Button size="lg">Apply as trainer</Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t mt-10">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} ValhallaFit
        </div>
      </footer>
    </div>
  );
}
