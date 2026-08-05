# SEO & AI Search Visibility Plan for ValhallaFit

## Current state (verified)

- **One public page**: the marketing landing page at `/`. Everything else (`/auth`, `/trainer`, `/client`, `/admin`) is app-only and blocked in robots.txt.
- **Landing page is `ssr: false`** — it renders client-side only, so crawlers and AI engines may see an empty shell instead of content. This is the single biggest SEO blocker.
- **Sitemap** lists only `/`. No content routes exist.
- **robots.txt** blocks app routes, allows `/`, and references the sitemap. Good.
- **llms.txt** exists but only lists the home page.
- **Head metadata** on `/` and `__root` is solid: title, description, OG tags, Twitter card, WebSite + Organization JSON-LD.
- **Google Search Console is not connected** — no indexing data, no sitemap submission, no query/position tracking.
- **No keyword-targeted content** — no blog, guides, or resource pages. The site has essentially one indexable page.
- **Stale SEO scan** flags: GSC not set up; a suggested content guide on "fitness challenges for trainers."

## The plan

The work splits into three phases. Phase 1 is the foundation — without it, the rest doesn't help. Phase 2 grows organic + AI visibility. Phase 3 measures and iterates.

---

### Phase 1 — Technical foundation (make the site actually crawlable)

**1.1 Enable SSR on the landing page**
- Change `/` from `ssr: false` to default SSR so crawlers and AI engines receive full server-rendered HTML. This is the highest-impact single fix.

**1.2 Connect Google Search Console**
- Connect the GSC connector (OAuth) and verify `https://valhallafit.app/`.
- Submit `https://valhallafit.app/sitemap.xml`.
- This gives us real indexing status, query data, click-through rates, and crawl errors.

**1.3 Verify and fix remaining on-page SEO findings**
- Run a fresh SEO review scan and address anything it flags (meta tags, structured data, etc.).
- Mark resolved findings as fixed.

---

### Phase 2 — Content + AI visibility (get found)

**2.1 Keyword research (Semrush)**
- Research the real search landscape for personal-trainer software: terms like "personal trainer software," "workout plan builder," "online coaching platform," "client management for trainers," "fitness challenges for trainers."
- Compare candidate keywords (volume, difficulty, CPC) to pick 2-3 realistic targets for a new site — long-tail and specific over broad and competitive.
- Identify the terms AI assistants are most likely to cite when asked "what tool should a personal trainer use."

**2.2 Build a content hub with keyword-targeted guides**
- Create a `/blog` or `/guides` section with 2-3 starter articles, each a dedicated route with its own head metadata, canonical, and Article JSON-LD:
  - A guide targeting the chosen primary keyword (e.g. "Best workout plan builder for personal trainers").
  - A guide on fitness challenges / client engagement (the flagged content finding).
  - A "How ValhallaFit works" explainer that doubles as an AI-citable reference.
- Each article links to the landing page CTA and to the other articles (internal linking).
- Add these routes to the sitemap and llms.txt.

**2.3 Enhance llms.txt for AI engines**
- Expand `public/llms.txt` from a single-line pointer to a structured summary: product description, key features, audience, and links to each guide. This is the file AI crawlers read to understand what the product is and what to cite.

**2.4 Add FAQ + HowTo structured data**
- Add an FAQ section to the landing page (or a dedicated `/faq` route) with question/answer pairs matching how people ask AI assistants about trainer tools. Wrap these in `FAQPage` JSON-LD so Google and AI engines can pull direct answers.
- Add `HowTo` schema to the "How it works" coaching loop (Plan → Assign → Train → Review).

**2.5 Strengthen the landing page for AI citability**
- Add a concise, factual product summary block near the top (what it is, who it's for, what it does) phrased in the third person — the kind of text AI engines lift verbatim.
- Keep the personal story but move the factual product description above it.

---

### Phase 3 — Measure & iterate (ongoing)

**3.1 Track performance via GSC**
- After connecting, monitor impressions, clicks, average position, and top queries in Search Console.
- Resubmit the sitemap when new content routes are added.

**3.2 Optional: Semrush connector for in-app tracking**
- If you want ongoing rank tracking, alerts, or an SEO dashboard built into the app, connect the Semrush connector (uses your Semrush subscription). Not needed for one-off research — the built-in Semrush tools handle that.

**3.3 Backlink awareness**
- Run a backlink analysis on `valhallafit.app` to see current link profile and authority score, and identify easy referring-domain opportunities (trainer directories, fitness forums, local business listings).

---

## What I'll do first (after approval)

1. Enable SSR on the landing page.
2. Connect Google Search Console and submit the sitemap.
3. Run Semrush keyword research to pick the 2-3 starter article topics.
4. Write the first guide route + expand llms.txt.
5. Add FAQ + HowTo structured data.
6. Run a fresh SEO scan and clear remaining findings.

## Notes

- Semrush data is available for keyword research and competitor analysis — I'll use it to ground article topics in real search demand rather than guessing.
- Google Search Console connection requires you to approve the OAuth flow when prompted; verification of `valhallafit.app` may need a meta tag added to the site root.
- All content will be factual and grounded — no invented testimonials or fabricated statistics.
