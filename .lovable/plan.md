
## Audit

**What works**
- Clear product name, green/black/white system, sticky header with the right two CTAs (Apply as trainer / Client login).
- Honest "In active development" chip and personal founder story modal.
- Six-card "What exists today" grid is benefit-led and credible.

**What creates confusion (redundancy)**
The page tells the same story three times:
1. Hero "Manage clients → Build plans → Clients train → Track progress" (4 cards)
2. "How it works — A simple coaching loop" (6 numbered steps)
3. "Built for the trainer and the client" trainer/client checklists

By the time a visitor reaches "How it works", they've already read the loop twice.

**What reduces credibility**
- Hero subheadline "Build stronger training habits." is generic and the only line in green — pulls the eye away from the actual value prop.
- "v1.0" in the active-development chip implies a release that doesn't exist yet.
- Closing "Built for modern coaching" section is pure restatement plus future tense ("Tomorrow it will help…") — feels like pitch-deck filler right before the CTA.
- Roadmap has 5 cards including overlapping ones ("Progression Recommendations" + "Client Analytics" + "Weekly Coach Summaries" cover similar ground).
- Duplicate CTA pair appears 3x (header, hero, footer-section) which is fine, but the third one sits under generic copy that weakens it.

**What should be removed**
- The hero 4-step workflow cards (covered by "How it works" and the trainer/client split).
- The "Built for modern coaching" closing section in its current form — replace with a tight single-line CTA band (no new content, less visual weight).
- "v1.0" from the dev chip.
- Roadmap trimmed from 5 to 3 cards: keep Progression Recommendations, Risk Detection, Weekly Coach Summaries. Drop Client Analytics (overlaps Progression) and Client Motivation (off-thesis — leans toward marketing automation).
- Hero trust line ("Trainer dashboard • Client mobile app • Progressive workout planning") — redundant with the section right below.

**What should be improved**
- Hero headline: tighten to one idea, not two sentences. Drop the green-highlighted second clause; let the primary CTA carry the color emphasis.
- Section rhythm: page currently alternates white / muted / white / muted / white. Reduce vertical padding on mid sections (py-16 instead of py-24) so the page feels less like a deck.
- "How it works" 6 steps → 4 steps mirroring the real loop (Plan → Assign → Train → Review). Removes restating "Trainer joins ValhallaFit" and "Programs are continuously improved" which are filler.
- Typography: hero h1 currently `text-4xl md:text-6xl` with two color treatments — switch to a single-color h1 and a shorter supporting paragraph. Increase paragraph max-width contrast (smaller measure) for readability.
- CTA visibility: keep header CTA always visible (already sticky ✓). In the hero, make "Apply as trainer" the only primary button and demote "Client login" to a quiet text link beneath ("Already a client? Sign in →"). This is the conversion path — trainer apply is the real funnel.
- Information architecture: collapse to four sections after hero — *What exists today* → *Trainer + Client split* → *How it works (4 steps)* → *Roadmap (3 cards)*. End with a slim CTA strip, not a section.

## Proposed changes (removal-first)

```text
Header                                  keep
Announcement banner (founder story)     keep
Hero
  - chip "In active development"        keep (drop "· v1.0")
  - h1                                  tighten, single color
  - paragraph                           shorten
  - CTAs                                primary "Apply as trainer" + text link "Already a client? Sign in"
  - trust line                          REMOVE
  - 4-step workflow cards               REMOVE
What exists today (6 cards)             keep, reduce top padding
Trainer + Client split + progressive    keep, reduce padding
How it works                            trim 6 → 4 steps
Roadmap                                 trim 5 → 3 cards
"Built for modern coaching" section     REMOVE
Slim CTA strip (1 line + button)        replaces it, in footer border area
Footer                                  keep
About modal                             keep
```

Estimated removed: ~120 lines of JSX, one full section, two roadmap cards, one hero block. No new sections, no new copy beyond rewording the hero h1/sub and the slim CTA line.

## Technical notes

- All edits are confined to `src/routes/index.tsx`.
- No new dependencies, no asset additions, no route/auth/data changes.
- Removes unused icon imports left behind by deletions (e.g. `Bell`, possibly `Activity` depending on which roadmap cards stay).
- Keeps `ssr: false`, banner `localStorage` logic, and the About modal untouched.
