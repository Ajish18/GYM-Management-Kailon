"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function MemberAttendanceError({
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
      <p className="font-medium">Something went wrong loading this page</p>
      <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
      <Button className="mt-4" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
