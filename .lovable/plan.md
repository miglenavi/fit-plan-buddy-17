# Mobile-first client experience

Make the client side feel like a simple phone app: a compact top header, a vertical scroll of cards, and rich per-exercise detail (description, target, and inline logging) — all tuned for one-thumb use on a phone.

Scope: only `/client/*` routes. Trainer and admin stay as they are.

## What changes

### 1. Client shell (mobile-first)
- For client role, replace the desktop sidebar with a slim sticky top header: logo + page title on the left, sign-out icon on the right.
- Constrain the content to a centered phone-width column (`max-w-md mx-auto`) on all viewports so it looks intentional on desktop too.
- No bottom tab bar. Navigation lives in the header and inline links ("History", back arrows).

### 2. Today screen (`/client`)
- Greeting + today's date at the top.
- "Today" card: if a workout is scheduled today, big primary "Start workout" CTA showing plan name and exercise count.
- "Upcoming" list: next few scheduled workouts as light cards (date chip + plan name).
- Empty state with a friendly message when nothing is scheduled.

### 3. Workout detail (`/client/workouts/$assignedId`)
Rework into a clean mobile flow:
- Sticky header with back arrow, plan name, and progress (e.g. "2 / 6").
- One card per exercise, expandable. Collapsed shows: number, name, muscle group chip, target (sets × reps @ weight), and a Done checkbox.
- Expanded reveals:
  - Image/video if the exercise has media (YouTube embed or `<video>` for direct URLs, `<img>` for image).
  - Description / coach cues from `exercises.description`.
  - Inline log inputs: actual sets, reps, weight, notes. Auto-save on blur (current behavior).
- Sticky "Finish workout" button at the bottom of the viewport.

### 4. History screen (`/client/history`)
- Mobile-friendly list grouped by month, each row showing date, plan name, completion status badge. Tapping opens the workout detail (read-only view of previously logged values is already covered by the same screen).

## Technical notes

- New component `ClientShell` in `src/components/ClientShell.tsx` (or branch inside `AppShell` based on `isClient`) to render the mobile header + centered column. Keep `AppShell` untouched for trainer/admin.
- Workout detail uses a controlled `expandedId` state; default-expand the first not-yet-completed exercise.
- Reuse the existing YouTube-id parser pattern from `trainer.exercises.$exerciseId.tsx` for video embeds.
- Pull `exercises.description`, `image_url`, `video_url` in the existing `workout_plan_exercises` join (already select `exercises(name, muscle_group)` — add the new fields). Client SELECT policy on `exercises` already allows assigned exercises.
- No DB or RLS changes needed.

## Out of scope
- Trainer/admin redesign.
- New bottom tab bar / PWA install.
- Schema or RLS changes.
