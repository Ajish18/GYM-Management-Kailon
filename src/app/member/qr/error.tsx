"use client";

import { SegmentError } from "@/components/ui/segment-error";

export default function MemberQrErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SegmentError error={error} reset={reset} />;
}
