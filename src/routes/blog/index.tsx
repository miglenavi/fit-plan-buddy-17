import { createFileRoute, Link } from "@tanstack/react-router";
import { articles } from "@/lib/articles";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog — ValhallaFit" },
      {
        name: "description",
        content:
          "Guides and resources for personal trainers on building workout plans, managing clients, and coaching more effectively.",
      },
      { property: "og:title", content: "Blog — ValhallaFit" },
      {
        property: "og:description",
        content:
          "Guides and resources for personal trainers on building workout plans, managing clients, and coaching more effectively.",
      },
      { property: "og:url", content: "https://valhallafit.app/blog" },
    ],
    links: [{ rel: "canonical", href: "https://valhallafit.app/blog" }],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  return (
    <main className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
        ValhallaFit Blog
      </h1>
      <p className="mt-3 text-muted-foreground text-lg">
        Practical guides for personal trainers on building workout plans and
        coaching clients.
      </p>

      <div className="mt-10 space-y-6">
        {articles.map((article) => (
          <Link
            key={article.slug}
            to="/blog/$slug"
            params={{ slug: article.slug }}
            className="block rounded-2xl border bg-card p-6 transition-colors hover:border-primary/40"
          >
            <p className="text-xs font-medium text-primary mb-2">
              {new Date(article.publishedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            <h2 className="text-xl font-semibold tracking-tight">
              {article.title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {article.description}
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
              {`Read "${article.title}"`} <ArrowRight className="size-3.5" />
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
