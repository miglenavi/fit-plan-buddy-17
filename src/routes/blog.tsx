import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Swords } from "lucide-react";

export const Route = createFileRoute("/blog")({
  component: BlogLayout,
});

function BlogLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-primary flex items-center justify-center">
              <Swords className="size-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">ValhallaFit</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link to="/blog" className="hover:text-foreground transition-colors">
              Blog
            </Link>
            <Link to="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Apply as trainer
            </Link>
          </nav>
        </div>
      </header>
      <Outlet />
      <footer className="border-t">
        <div className="container mx-auto px-4 py-8 flex items-center gap-2 text-sm text-muted-foreground">
          <div className="size-6 rounded-md bg-primary flex items-center justify-center">
            <Swords className="size-3.5 text-primary-foreground" />
          </div>
          <span>© {new Date().getFullYear()} ValhallaFit</span>
        </div>
      </footer>
    </div>
  );
}
