import { Loader2 } from "lucide-react";

/** Minimal segment loading state (rendered by a route segment's loading.tsx).
 *  A centered spinner — matches the app-shell loading style without adding
 *  weight to the shell. */
export function SegmentLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    </div>
  );
}
