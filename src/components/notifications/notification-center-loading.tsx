import { Skeleton } from "@/components/ui/skeleton";

/** Loading skeleton for every role's notification-center page — mirrors the
 *  layout of the Inbox tab (header, filter bar, summary row, list). */
export function NotificationCenterLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-10 w-full max-w-xl rounded-lg" />
      <Skeleton className="h-8 w-72 rounded-lg" />
      <div className="space-y-0 overflow-hidden rounded-2xl border">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
            <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
