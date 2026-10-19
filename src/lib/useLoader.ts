import { useEffect, useRef, useState } from "react";
import { createLoadRunner, viewFor, type LoadSnapshot } from "@/lib/loadState";

/** React wrapper around createLoadRunner. `view` drives Loading / Error / content rendering. */
export function useLoader() {
  const [snap, setSnap] = useState<LoadSnapshot>({ status: "loading", loaded: false });
  const runner = useRef<ReturnType<typeof createLoadRunner> | null>(null);
  if (!runner.current) runner.current = createLoadRunner(setSnap);
  useEffect(() => () => runner.current?.cancel(), []);
  return {
    ...snap,
    view: viewFor(snap.status, snap.loaded),
    run: runner.current.run,
  };
}
