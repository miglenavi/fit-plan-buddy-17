# Smoother assign-workout flow

After a trainer successfully assigns a plan to a client from the plan detail page, the app should confirm the action and take them back to the plans list instead of leaving them stuck on the same page.

## Changes

- On successful `assigned_workouts` insert in `src/routes/trainer.plans.$planId.tsx`:
  - Keep the success toast ("Workout assigned to {client name} on {date}").
  - Navigate back to `/trainer/plans` automatically.
- Reset the local client / date selection state before navigating so a quick "Back" returns to a clean form.
- Leave the existing "Back to plans" button in the header in place for users who want to leave without assigning.

## Out of scope

- Stepper / multi-step layout for plan creation.
- Breadcrumbs across the trainer area.
- Bulk-assign to multiple clients at once.
