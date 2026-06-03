## Plan

1. **Keep the database insert as-is**
   - The request is succeeding: the backend returned `201` and created training `c9bb8870-d8ce-4569-a3c5-7b4f839965cc`.
   - So this is not a permission/database failure; it is a UI/navigation feedback problem.

2. **Fix the Add training UX on the plan page**
   - Add a local loading state so repeated clicks are blocked while the new training is being created.
   - Show immediate feedback on the button, e.g. `Creating…` with a spinner.
   - After creation, show a success toast like `Training added`.

3. **Make the result obvious even if navigation does not visually feel like a jump**
   - After insert, update the local `trainings` list immediately with the new row.
   - Then navigate to the new training editor using the existing typed route.
   - If navigation fails or feels imperceptible, the user will still see the new training appear in the list.

4. **Add safer error handling**
   - Wrap the create flow in `try/finally` so the button never gets stuck.
   - Keep the existing error toast, but make the message clearer: `Could not add training`.

## Technical details

- Primary file: `src/routes/trainer.plans.$planId.tsx`
- The current insert works, but `navigate(...)` does not produce enough visible confirmation for the user.
- I will not change the workout architecture or database schema for this fix.