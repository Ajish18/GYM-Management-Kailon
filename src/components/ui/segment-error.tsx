"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shared error boundary for route segments (rendered by a segment's
 *  error.tsx). Shows a friendly message plus Retry; the digest is surfaced so
 *  an operator can look it up in the server logs. */
export function SegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="max-w-sm space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This section couldn&apos;t be loaded. Please try again — if it keeps
            failing, contact support.
          </p>
          {error.digest && (
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              Reference: {error.digest}
            </p>
          )}
        </div>
        <Button onClick={reset} variant="outline">
          Try again
        </Button>
      </div>
    </div>
  );
}
