# Smoother workout plan creation

Today, clicking "New plan" opens a dialog asking for name + description, then drops you back on the plans list. You then have to click into the new plan to actually add exercises. Two extra steps for what should be one flow.

## Proposed change

Skip the dialog entirely. "New plan" immediately creates a draft plan with a default name ("Untitled plan") and navigates straight to its detail page (`/trainer/plans/$planId`), where:

- The plan name is editable inline at the top (click the title to rename). Autosaves on blur, like the exercise page.
- Description can be edited inline below the title (optional, autosaves).
- You can add exercises right away — no extra dialog, no extra navigation.

The current dialog component and its state are removed from `trainer.plans.index.tsx`.

## Why this shape

- One click to start building, matching how the exercise detail page already works (debounced autosave, no Save button).
- No empty/abandoned plans problem worth solving here — trainer can delete from the list, and the cost of a stray "Untitled plan" row is low.
- Consistent with the rest of the app's autosave behavior.

## Files touched

- `src/routes/trainer.plans.index.tsx` — remove dialog, change "New plan" to insert a row then `navigate({ to: '/trainer/plans/$planId', params: { planId } })`.
- `src/routes/trainer.plans.$planId.tsx` — make name + description inline-editable with debounced autosave (same pattern as `trainer.exercises.$exerciseId.tsx`).

## Alternative considered

Keep the dialog but redirect to the new plan's detail page on submit. Simpler change, but still one unnecessary modal. Going straight in is cleaner — happy to do the dialog+redirect version instead if you'd prefer.
