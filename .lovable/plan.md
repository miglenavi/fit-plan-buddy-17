# Auto-save exercise detail page

Replace the manual "Save changes" button on the trainer exercise detail page with debounced auto-save, and add a small status indicator so the trainer knows their edits are persisted.

## Behavior

On `src/routes/trainer.exercises.$exerciseId.tsx`:

- Remove the "Save changes" button entirely.
- Watch the editable fields: **name**, **category**, **description**, **video URL**.
- ~800ms after the user stops editing any of these, write the change to the `exercises` row.
- Show a small inline status next to the page title:
  - "Saving…" while a write is in flight
  - "Saved" (with a subtle check, fades after ~2s) after success
  - "Couldn't save — retry" on failure, with a manual retry link
- Skip the first save on initial load (don't write back the values we just fetched).
- Don't auto-save an empty name (name is required) — show "Name is required" in the status area instead.

Image and video file uploads already save immediately on upload — that behavior stays.

## Notes

- Auto-save makes a top-of-page Save button unnecessary, so we don't move it — we drop it.
- The status indicator goes in the existing header row, to the right of the exercise name (left of the Delete button).

## Technical details

- Use a `useEffect` with a `setTimeout` keyed off the four watched values; clear on each change for debounce.
- Track a `hasLoaded` ref so the effect doesn't fire on hydration.
- Single `update` call per debounce window with all four fields.
- Status state: `"idle" | "saving" | "saved" | "error"`.
- Keep `load()` for the initial fetch; no need to re-fetch after auto-save since we already hold the latest values locally.
