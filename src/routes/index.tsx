import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Swords, Users, Dumbbell, ClipboardList } from "lucide-react";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ValhallaFit — Train like a Viking" },
      { name: "description", content: "Coaching platform for trainers and clients: build plans, schedule sessions, track progress." },
      { property: "og:title", content: "ValhallaFit — Train like a Viking" },
      { property: "og:description", content: "Coaching platform for trainers and clients: build plans, schedule sessions, track progress." },
      { property: "og:url", content: "https://fit-plan-buddy-17.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://fit-plan-buddy-17.lovable.app/" }],
  }),
  component: Index,
});

function Index() {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (user) {
    if (role === "super_admin") return <Navigate to="/admin/applications" />;
    if (role === "trainer") return <Navigate to="/trainer" />;
    if (role === "client") return <Navigate to="/client" />;
    return <Navigate to="/pending" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/30">
      <header className="container mx-auto flex items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-xl bg-primary flex items-center justify-center">
            <Swords className="size-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">ValhallaFit</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/auth"><Button variant="ghost" size="sm">Log in</Button></Link>
          <Link to="/auth"><Button size="sm">Apply as trainer</Button></Link>
        </div>
      </header>

      <main className="container mx-auto px-4">
        <section className="py-16 md:py-24 text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">Train like a Viking.</h1>
          <p className="mt-5 text-lg text-muted-foreground">
            A simple coaching platform where trainers build workout plans and clients crush them — together.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link to="/auth"><Button size="lg">Apply as trainer</Button></Link>
            <Link to="/auth"><Button size="lg" variant="outline">Client log in</Button></Link>
          </div>
        </section>

        <section className="py-12 grid gap-5 md:grid-cols-3">
          {[
            { icon: Users, title: "For trainers", body: "Manage clients, build workout plans, schedule sessions in one place." },
            { icon: Dumbbell, title: "For clients", body: "Follow your plan, log workouts, and watch your progress stack up." },
            { icon: ClipboardList, title: "All in one place", body: "Exercise library, weekly schedule, and full training history." },
          ].map((f) => (
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
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">How it works</h2>
          <ol className="space-y-5">
            {[
              "Trainers apply and get approved by a super-admin.",
              "Approved trainers invite their clients by email.",
              "Clients set a password, log in, and start training.",
            ].map((step, i) => (
              <li key={i} className="flex gap-4 items-start">
                <span className="size-8 shrink-0 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center">{i + 1}</span>
                <p className="pt-1">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold">Ready to get started?</h2>
          <p className="mt-3 text-muted-foreground">Join as a trainer or log in as a client.</p>
          <div className="mt-6"><Link to="/auth"><Button size="lg">Get started</Button></Link></div>
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
