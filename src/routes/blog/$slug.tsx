import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { articles, getArticle } from "@/lib/articles";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/blog/$slug")({
  head: ({ params }) => {
    const article = getArticle(params.slug);
    if (!article) {
      return {
        meta: [{ title: "Article not found — ValhallaFit" }],
      };
    }
    const url = `https://valhallafit.app/blog/${article.slug}`;
    return {
      meta: [
        { title: `${article.title} — ValhallaFit` },
        { name: "description", content: article.description },
        { property: "og:title", content: `${article.title} — ValhallaFit` },
        { property: "og:description", content: article.description },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: `${article.title} — ValhallaFit` },
        { name: "twitter:description", content: article.description },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: article.title,
            description: article.description,
            datePublished: article.publishedAt,
            dateModified: article.updatedAt,
            author: { "@type": "Organization", name: "ValhallaFit" },
            publisher: {
              "@type": "Organization",
              name: "ValhallaFit",
              url: "https://valhallafit.app",
            },
            mainEntityOfPage: url,
            keywords: article.keywords.join(", "),
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Blog",
                item: "https://valhallafit.app/blog",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: article.title,
                item: url,
              },
            ],
          }),
        },
        ...(article.faqs && article.faqs.length > 0
          ? [
              {
                type: "application/ld+json",
                children: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: article.faqs.map((f) => ({
                    "@type": "Question",
                    name: f.question,
                    acceptedAnswer: { "@type": "Answer", text: f.answer },
                  })),
                }),
              },
            ]
          : []),
      ],

    };
  },
  component: ArticlePage,
});

function ArticlePage() {
  const { slug } = Route.useParams();
  const article = getArticle(slug);
  if (!article) throw notFound();

  return (
    <main className="container mx-auto px-4 py-16 max-w-3xl">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link to="/blog" className="hover:text-foreground transition-colors">
          Blog
        </Link>
        <span>/</span>
        <span className="text-foreground truncate">{article.title}</span>
      </nav>

      <article>
        <p className="text-xs font-medium text-primary mb-3">
          {new Date(article.publishedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
          {article.title}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          {article.description}
        </p>

        <div className="mt-10 space-y-8">
          {article.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl font-semibold tracking-tight mb-3">
                {section.heading}
              </h2>
              {section.paragraphs.map((para, i) => (
                <p
                  key={i}
                  className="text-muted-foreground leading-relaxed mb-3"
                >
                  {para}
                </p>
              ))}
            </section>
          ))}
        </div>
      </article>

      <div className="mt-12 rounded-2xl border bg-card p-6 text-center">
        <h2 className="text-lg font-semibold">
          Ready to build your first plan?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          ValhallaFit gives personal trainers a workout plan builder, client
          management, and session tracking in one platform.
        </p>
        <Link
          to="/auth"
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Apply as trainer <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {articles
          .filter((a) => a.slug !== article.slug)
          .map((a) => (
            <Link
              key={a.slug}
              to="/blog/$slug"
              params={{ slug: a.slug }}
              className="text-sm text-primary hover:underline"
            >
              {a.title}
            </Link>
          ))}
      </div>
    </main>
  );
}
