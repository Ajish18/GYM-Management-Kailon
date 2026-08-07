"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildNotificationQuery } from "@/components/notifications/notification-query";

/** Prev/next pager for the notification list — preserves every active filter
 *  (search, type, unread, member) while flipping only the page param. */
export function NotificationPagination({ page, totalPages }: { page: number; totalPages: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goTo(nextPage: number) {
    router.push(`${pathname}?${buildNotificationQuery(searchParams, { page: nextPage })}`);
  }

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => goTo(page - 1)}
        >
          <ChevronLeft />
          Previous
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => goTo(page + 1)}
        >
          Next
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
