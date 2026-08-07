import { Inbox } from "lucide-react";
import { NotificationFilters } from "@/components/notifications/notification-filters";
import { NotificationRow } from "@/components/notifications/notification-row";
import { NotificationPagination } from "@/components/notifications/notification-pagination";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";
import type { NotificationListItem } from "@/lib/data/notifications";

/**
 * The Inbox tab of the notification-center page — a presentational server
 * component. The page fetches (via getNotificationHistory) and passes the
 * already-paginated data down; every control (filters, mark-read, delete,
 * pager) drives the page's own searchParams and re-renders this from the
 * server, so there's no duplicated client copy of the list state.
 *
 * `scope` controls ownership semantics:
 *  - "own" (member/reception/trainer/admin) — mark-all-read button, rows
 *    are the user's own.
 *  - "gym" (owner) — no mark-all-read (ambiguous across members), rows are
 *    gym-wide and owner may manage them.
 */
export function NotificationCenter({
  items,
  total,
  page,
  totalPages,
  unreadCount,
  scope = "own",
  hasFilters = false,
  memberOptions = [],
}: {
  items: NotificationListItem[];
  total: number;
  page: number;
  totalPages: number;
  unreadCount: number;
  scope?: "own" | "gym";
  hasFilters?: boolean;
  memberOptions?: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-4">
      <NotificationFilters memberOptions={memberOptions} />

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {total} notification{total === 1 ? "" : "s"}
          {unreadCount > 0 && ` · ${unreadCount} unread`}
        </p>
        {scope === "own" && <MarkAllReadButton unreadCount={unreadCount} />}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-16 text-center">
          <Inbox className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium">{hasFilters ? "No matching notifications" : "No notifications yet"}</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {hasFilters
              ? "Nothing matches the current filters — try widening your search."
              : "Notifications about your membership, payments, streaks and messages will appear here."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border">
          {items.map((notification) => (
            <NotificationRow key={notification.id} notification={notification} />
          ))}
        </div>
      )}

      <NotificationPagination page={page} totalPages={totalPages} />
    </div>
  );
}
