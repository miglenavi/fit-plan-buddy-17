import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Swords,
  ClipboardList,
  Dumbbell,
  Calendar,
  History,
  Smartphone,
  MessageCircle,
  ArrowLeft,
} from "lucide-react";

export const Route = createFileRoute("/clients")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "For clients — ValhallaFit" },
      {
        name: "description",
        content:
          "Train smarter with your coach: follow your plan, log workouts set-by-set, and track your progress over time.",
      },
      { property: "og:title", content: "For clients — ValhallaFit" },
      {
        property: "og:description",
        content:
          "Follow your plan, log workouts, and watch your progress stack up.",
      },
    ],
    links: [
      { rel: "canonical", href: "https://fit-plan-buddy-17.lovable.app/clients" },
    ],
  }),
  component: ClientsPage,
});

const features = [
  {
    icon: ClipboardList,
    title: "Follow your plan",
    body: "Open today's workout and see exactly what your trainer has planned — no guesswork.",
  },
  {
    icon: Dumbbell,
    title: "Log set by set",
    body: "Tap in your weights and reps as you go. Quick, simple, and built for the gym floor.",
  },
  {
    icon: Calendar,
    title: "See your week",
    body: "Know what's coming up so you can show up ready — training, rest, and everything in between.",
  },
  {
    icon: History,
    title: "Track your history",
    body: "Every session you complete is saved. Watch your numbers go up over time.",
  },
  {
    icon: Smartphone,
    title: "Works on your phone",
    body: "No app to install. Open it in your browser and it just works on any device.",
  },
  {
    icon: MessageCircle,
    title: "Stay in sync",
    body: "Your trainer sees what you've completed and can adjust your plan based on how it's going.",
  },
];

const faqs = [
  {
    q: "How do I sign up?",
    a: "Clients join by invite from their trainer. Once your trainer adds you, you'll get an email to set your password.",
  },
  {
    q: "I lost my invite email — what now?",
    a: "Ask your trainer to re-send the invite. They can do it from their dashboard in a couple of clicks.",
  },
  {
    q: "Can I use it on my phone?",
    a: "Yes. The whole app is mobile-friendly — open it in your phone's browser at the gym and log your sets as you go.",
  },
  {
    q: "How do I see my workout plan?",
    a: "Log in and you'll land on your dashboard with today's session and your weekly schedule front and center.",
  },
];

function ClientsPage() {
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
            <Button size="sm">Log in</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4">
        <section className="py-16 md:py-24 text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Train smarter with your coach.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Your plan, your sessions, your progress — all in one place. Built
            to be used at the gym, on your phone, in between sets.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link to="/auth">
              <Button size="lg">Have an invite? Log in</Button>
            </Link>
            <Link to="/trainers">
              <Button size="lg" variant="outline">
                Looking for a trainer?
              </Button>
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
            How it works
          </h2>
          <ol className="space-y-5">
            {[
              "Your trainer invites you by email.",
              "Click the link and set your password.",
              "Open the app and start your first session.",
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
          <h2 className="text-2xl md:text-3xl font-bold">Got your invite?</h2>
          <p className="mt-3 text-muted-foreground">
            Log in and pick up where your training leaves off.
          </p>
          <div className="mt-6">
            <Link to="/auth">
              <Button size="lg">Log in</Button>
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
