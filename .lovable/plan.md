## Bug: clicking a client does nothing

`src/routes/trainer.clients.tsx` is registered at `/trainer/clients` and also acts as the parent layout for `/trainer/clients/$clientId` (flat-route naming). It renders the list UI directly instead of `<Outlet />`, so navigation to a client succeeds in the URL but the child never mounts. `trainer.plans.*` does the right thing already and is the template.

## Fix

### 1. Split the clients route like plans
- Rename `src/routes/trainer.clients.tsx` → `src/routes/trainer.clients.index.tsx` (this becomes the list page at `/trainer/clients`).
- Create a new `src/routes/trainer.clients.tsx` as the layout, mirroring `trainer.plans.tsx`:
  ```tsx
  createFileRoute("/trainer/clients")({
    ssr: false,
    component: () => <RoleGuard role="trainer"><AppShell><Outlet /></AppShell></RoleGuard>,
  })
  ```
- Remove the now-duplicate `RoleGuard`/`AppShell` wrappers from `trainer.clients.index.tsx` and `trainer.clients.$clientId.tsx` (the layout supplies them).

### 2. Assign Plan UX (carry over from the prior plan)
- New `src/components/AssignPlanDialog.tsx` — one dialog used everywhere. Either `clientId` or `planId` is prefilled; the other is chosen in the dialog. Inserts into `client_programs` (`status: 'active'`, start/optional end date) then fires `onAssigned`.
- **Clients list card** (`trainer.clients.index.tsx`): add an "Assign plan" button next to "Resend invite link" → opens dialog with `clientId` prefilled.
- **Plan detail** (`trainer.plans.$planId.tsx`): add an "Assigned clients" card listing each client (name, status, dates, link to `/trainer/clients/$clientId`) + "Assign to client" button → opens dialog with `planId` prefilled.
- **Client detail** (`trainer.clients.$clientId.tsx`): replace the inline assign dialog with `AssignPlanDialog` so behavior is identical everywhere.

## Out of scope
- No DB or RLS changes — `client_programs` policies already allow trainers to insert their own rows.
- No data model changes.
