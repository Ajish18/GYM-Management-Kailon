"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Error boundary state for every role's notification-center page — follows
 *  the app-wide pattern (dashed card, message, Try again → reset). */
export default function NotificationCenterError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
      <p className="font-medium">Something went wrong loading your notifications</p>
      <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
      <Button className="mt-4" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
