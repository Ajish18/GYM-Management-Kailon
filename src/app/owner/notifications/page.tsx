import type { Metadata } from "next";
import { requireGymScope } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { getNotificationHistory } from "@/lib/data/notifications";
import { NotificationCenterPage } from "@/components/notifications/notification-center-page";
import { AnnouncementComposer } from "@/components/notifications/announcement-composer";
import { NotifyMemberDialog } from "@/components/notifications/notify-member-dialog";

export const metadata: Metadata = { title: "Notifications" };

export default async function OwnerNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    page?: string;
    q?: string;
    type?: string;
    unread?: string;
    memberId?: string;
  }>;
}) {
  const { gymId } = await requireGymScope("GYM_OWNER");
  const params = await searchParams;

  const [history, members] = await Promise.all([
    getNotificationHistory({
      gymId,
      memberId: params.memberId || undefined,
      page: Number(params.page) || 1,
      type: params.type || undefined,
      search: params.q || undefined,
      unreadOnly: params.unread === "true",
    }),
    db.user.findMany({
      where: { gymId, role: "MEMBER", deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const memberOptions = members.map((member) => ({
    value: member.id,
    label: member.name ?? "Unknown",
  }));
  const hasFilters = !!(
    params.q?.trim() ||
    params.type ||
    params.unread === "true" ||
    params.memberId
  );

  return (
    <NotificationCenterPage
      title="Notifications"
      description="Every notification in your gym — filter by member or type, or broadcast to everyone."
      history={history}
      hasFilters={hasFilters}
      scope="gym"
      memberOptions={memberOptions}
      defaultTab={params.tab ?? "inbox"}
      actions={
        <>
          <NotifyMemberDialog members={memberOptions} />
          <AnnouncementComposer />
        </>
      }
    />
  );
}
