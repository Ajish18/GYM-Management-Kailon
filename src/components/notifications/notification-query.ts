/** URL search-param helper shared by the filter bar and pagination controls
 *  on the notification-center page. Pure + client-safe: given the current
 *  params and a partial patch, returns the new query string. A key whose
 *  patch value is empty/undefined/false (or page ≤ 1) is removed so the URL
 *  never accumulates stale filters. */
export type NotificationQueryPatch = {
  q?: string;
  type?: string;
  unread?: boolean;
  page?: number;
  memberId?: string;
};

export function buildNotificationQuery(
  current: URLSearchParams,
  patch: NotificationQueryPatch,
): string {
  const next = new URLSearchParams(current);

  (Object.keys(patch) as (keyof NotificationQueryPatch)[]).forEach((key) => {
    const value = patch[key];
    if (
      value == null ||
      value === "" ||
      value === false ||
      (typeof value === "number" && value <= 1)
    ) {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }
  });

  return next.toString();
}
