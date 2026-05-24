# Basic Landing Page for ValhallaFit

Add a clean, simple public landing page at `/` that introduces the app and its services, with a clear call-to-action to the existing `/auth` page.

## Routing change

Currently `src/routes/index.tsx` redirects every visitor straight to `/auth` (or their dashboard if logged in). I'll change it so:
- **Logged-out visitors** → see the new landing page
- **Logged-in users** → still auto-redirect to their dashboard (`/admin/applications`, `/trainer`, `/client`, or `/pending`)

This keeps the app flow intact for existing users while giving new visitors something to read first.

## Page structure

One single route file (`src/routes/index.tsx`) — no extra sub-routes, since you asked for very basic.

Sections, top to bottom:

1. **Header** — ValhallaFit logo (the Swords icon already used in `/auth`) + "Log in" and "Apply as trainer" buttons (both link to `/auth`).
2. **Hero** — Big headline ("Train like a Viking."), one-line subhead about coaching + workout tracking, primary CTA "Apply as trainer", secondary "Client log in".
3. **Services / What you get** — 3 simple feature cards:
   - **For trainers** — Manage clients, build workout plans, schedule sessions.
   - **For clients** — Follow your plan, log workouts, track progress.
   - **All in one place** — Exercise library, weekly schedule, history.
4. **How it works** — 3 short numbered steps (Trainer applies → Super-admin approves → Trainer onboards clients via email invite).
5. **Footer CTA + copyright** — One more "Get started" button and a small "© ValhallaFit" line.

## Styling

- Reuse existing semantic tokens from `src/styles.css` (primary green, background, muted, accent). No new colors.
- Same gradient background style already used on `/auth` (`bg-gradient-to-br from-background to-accent/30`) for visual consistency.
- shadcn `Button` and `Card` components.
- Responsive: single column on mobile, 3-column grid for the services section on `md:` and up.
- Add proper `head()` metadata: title, description, og:title, og:description.

## Files touched

- **edit** `src/routes/index.tsx` — replace redirect-only logic with the landing page + keep authed-user redirect.

That's it — no DB changes, no new dependencies, no auth changes.

---

Want me to go ahead with this, or would you like to tweak the sections / copy / add more (pricing, testimonials, FAQ) first?
