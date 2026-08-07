"use client";

import { SegmentError } from "@/components/ui/segment-error";

/** App-wide error boundary (catches any uncaught error in a route segment
 *  that doesn't have its own error.tsx). Renders in place of the whole app —
 *  same friendly message + Retry as the per-segment boundaries. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SegmentError error={error} reset={reset} />;
}
