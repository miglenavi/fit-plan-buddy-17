import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { LoadView } from "@/lib/loadState";

export function LoadingText({ what }: { what: string }) {
  return <p className="text-sm text-muted-foreground" role="status">Loading {what}…</p>;
}

export function LoadError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
      <span className="text-muted-foreground">Couldn't load {what}.</span>
      <Button type="button" size="sm" variant="outline" onClick={onRetry}>Retry</Button>
    </div>
  );
}

export function StaleNotice({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
      <span className="text-muted-foreground">Couldn't refresh {what} — showing what was loaded earlier.</span>
      <Button type="button" size="sm" variant="outline" onClick={onRetry}>Retry</Button>
    </div>
  );
}

/** For a record that loaded fine but doesn't exist or isn't accessible. */
export function Unavailable({ what, backTo, backLabel, onRetry }: { what: string; backTo: string; backLabel: string; onRetry: () => void }) {
  return (
    <div className="space-y-3 max-w-md">
      <h1 className="text-xl font-semibold">This {what} isn't available</h1>
      <p className="text-sm text-muted-foreground">It may have been deleted, or you don't have access to it.</p>
      <div className="flex gap-2">
        <Button asChild size="sm" variant="outline"><Link to={backTo as any}>{backLabel}</Link></Button>
        <Button type="button" size="sm" variant="ghost" onClick={onRetry}>Retry</Button>
      </div>
    </div>
  );
}

/** Renders loading / error / content for one section. Content is kept with a notice if a refresh fails. */
export function LoadGate({ view, what, onRetry, children }: { view: LoadView; what: string; onRetry: () => void; children: ReactNode }) {
  if (view === "loading") return <LoadingText what={what} />;
  if (view === "error") return <LoadError what={what} onRetry={onRetry} />;
  return (
    <>
      {view === "content-stale" && <StaleNotice what={what} onRetry={onRetry} />}
      {children}
    </>
  );
}
