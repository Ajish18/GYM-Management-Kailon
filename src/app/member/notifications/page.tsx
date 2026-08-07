import type { Metadata } from "next";
import { requireGymScope } from "@/lib/auth/guards";
import { getNotificationHistory } from "@/lib/data/notifications";
import { NotificationCenterPage } from "@/components/notifications/notification-center-page";

export const metadata: Metadata = { title: "Notifications" };

export default async function MemberNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string; q?: string; type?: string; unread?: string }>;
}) {
  const { user } = await requireGymScope("MEMBER");
  const params = await searchParams;

  const history = await getNotificationHistory({
    userId: user.id,
    page: Number(params.page) || 1,
    type: params.type || undefined,
    search: params.q || undefined,
    unreadOnly: params.unread === "true",
  });
  const hasFilters = !!(params.q?.trim() || params.type || params.unread === "true");

  return (
    <NotificationCenterPage
      title="Notifications"
      description="Membership updates, reminders, and messages from your trainer."
      history={history}
      hasFilters={hasFilters}
      defaultTab={params.tab ?? "inbox"}
    />
  );
}
