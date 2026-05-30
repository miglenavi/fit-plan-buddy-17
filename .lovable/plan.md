## Quick pass: sidebar polish + trainer dashboard rebuild

Two files, no schema/token/dependency changes.

### 1. `src/components/AppShell.tsx` — sidebar polish

- Add **section labels** above nav groups (uppercase muted text: "Admin", "Coaching", "Client")
- Refine active state: 3px primary left-edge bar + bolder text (instead of only bg fill); icons go primary on hover
- Tighten padding, slightly larger logo tile with soft glow
- Bottom user block: avatar circle with initials + name + email
- Mobile bottom nav: primary dot indicator under active item

### 2. `src/routes/trainer.index.tsx` — dashboard rebuild

Layout matching the mockup's rhythm:

**Header**
- Greeting + today's date
- Right-aligned quick actions: New plan, Add exercise, Invite client

**Stat tiles (4-up, lg:grid-cols-4)**
- Same 4 metrics (clients, exercises, plans, today's sessions)
- Richer cards: large number, label, icon in primary-tinted rounded square, "View all →" footer
- `shadow-sm` → hover `shadow-md`, subtle border

**Main grid (lg:grid-cols-3)**
- **Today's sessions** (col-span-2): card list with initial-avatar circles, client name, plan name, color-coded status pills. Empty state with icon + "No sessions today" + "Schedule one →"
- **This week** (col-span-1): completion rate with thin progress bar + recent 5-item activity feed from `assigned_workouts` ordered by `updated_at`

**Empty states**
- Each card gets a real empty state: tinted icon square + one-line message + CTA

### Data
- Same `useEffect` `Promise.all`, plus two extra queries:
  - Weekly aggregate from `assigned_workouts` (last 7 days grouped by status)
  - Recent 5 `assigned_workouts` ordered `updated_at desc`

### Out of scope
- Plan builder restyle, client mobile restyle, replacing landing screenshots, new deps, token changes, schema changes

### Files
- edit `src/components/AppShell.tsx`
- edit `src/routes/trainer.index.tsx`
