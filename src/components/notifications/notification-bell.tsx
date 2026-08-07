import { requireUser } from "@/lib/auth/guards";
import { getRecentNotifications } from "@/lib/data/notifications";
import { NotificationBellClient } from "@/components/notifications/notification-bell-client";

/**
 * Self-contained header bell — a Server Component wrapper that resolves the
 * session and does the initial data fetch, then hands off to the client
 * dropdown for interactivity (polling, mark-as-read). Drop it in next to
 * `<UserMenu />` with no props:
 *
 *   <NotificationBell />
 *
 * It derives the current user from the session itself (same
 * `requireUser()` guard every other server-rendered piece of the app uses),
 * so the integrating page/layout doesn't need to pass a userId or session
 * data down.
 */
export async function NotificationBell() {
  const user = await requireUser();
  const { items, unreadCount } = await getRecentNotifications(user.id);

  return <NotificationBellClient initialItems={items} initialUnreadCount={unreadCount} />;
}
