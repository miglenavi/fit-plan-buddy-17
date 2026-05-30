
## Hero copy rewrite

In `src/routes/index.tsx`, replace the hero headline and sub:

- H1: **A coaching platform for personal trainers.**
- Sub: **Help clients stay consistent, track progress, and build stronger training habits.**

Keep the "In active development" chip, primary CTA, and "Already a client? Sign in →" link unchanged.

## Remove "What exists today" section

Delete the entire `#today` section (the six feature cards: Trainer dashboard, Client mobile app, Program builder, Progress tracking, Exercise library, Role-based access). It restates what the trainer/client split section directly below already shows.

Update the header nav: remove the "What exists" link, keep "How it works" and "Roadmap".

## Light value nudges in the trainer/client split

In the same file, soften 1–2 feature-y bullets so each side leads with payoff:

Trainer side:
- "Manage clients and keep notes in one place" → **"Spend session time coaching, not updating spreadsheets"**

Client side:
- "Track personal progress as plans evolve" → **"See progress build up over time and stay motivated"**

Other bullets, the progressive-programs callout, How it works, Roadmap, and slim CTA strip stay as-is.

## Cleanup

Remove now-unused icon imports left over from the deleted section: `Library`, `ShieldCheck`, `LayoutDashboard` (if no longer referenced — `LayoutDashboard` is still used in the trainer-side card header, so it stays; `Library` and `ShieldCheck` go).

No new sections, no new visuals, no copy added beyond the hero rewrite and the two bullet tweaks. All edits confined to `src/routes/index.tsx`.
