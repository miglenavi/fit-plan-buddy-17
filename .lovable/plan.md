## Goal
Restore visibility of the existing plan **Liūtuks** by fixing the database access rule causing: “Infinite recursion detected in policy of relation plans”.

## What I found
- The plan row still exists.
- The recursive loop is between these access rules:
  - `plans`: “Client views assigned plans” checks `client_programs`
  - `client_programs`: “Trainer manages own client programs” checks `plans`
- When the app loads plans, the database can evaluate `plans -> client_programs -> plans`, which triggers the recursion error and prevents the trainer from seeing the plan.

## Implementation plan
1. Add two `SECURITY DEFINER` helper functions that bypass RLS internally:
   - one to check whether a client is assigned to a plan
   - one to check whether a plan belongs to a trainer
2. Replace the recursive policies with policies that call those helper functions instead of querying tables directly inside RLS.
3. Keep the same intended permissions:
   - trainers manage only their own plans and programs
   - clients can view only plans assigned to them
4. Verify the affected policies and confirm the `plans` read no longer errors.

## Technical details
- Update policy on `public.plans`:
  - replace `EXISTS (SELECT 1 FROM public.client_programs ...)` with a definer function.
- Update policy on `public.client_programs`:
  - replace `EXISTS (SELECT 1 FROM public.plans ...)` with a definer function.
- No UI changes are needed.