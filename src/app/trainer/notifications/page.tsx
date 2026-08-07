import type { Metadata } from "next";
import { requireGymScope } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { getNotificationHistory } from "@/lib/data/notifications";
import { NotificationCenterPage } from "@/components/notifications/notification-center-page";
import { NotifyMemberDialog } from "@/components/notifications/notify-member-dialog";

export const metadata: Metadata = { title: "Notifications" };

export default async function TrainerNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string; q?: string; type?: string; unread?: string }>;
}) {
  const { user, gymId } = await requireGymScope("TRAINER");
  const params = await searchParams;

  const [history, assignedMembers] = await Promise.all([
    getNotificationHistory({
      userId: user.id,
      page: Number(params.page) || 1,
      type: params.type || undefined,
      search: params.q || undefined,
      unreadOnly: params.unread === "true",
    }),
    // Only currently-assigned members can be notified — mirrors the
    // trainer-side scope of notifyAssignedMemberAction.
    db.memberProfile.findMany({
      where: { gymId, assignedTrainerId: user.id },
      select: { userId: true, user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);
  const memberOptions = assignedMembers.map((profile) => ({
    value: profile.userId,
    label: profile.user.name ?? "Unknown",
  }));
  const hasFilters = !!(params.q?.trim() || params.type || params.unread === "true");

  return (
    <NotificationCenterPage
      title="Notifications"
      description="Messages and updates for you and your members."
      history={history}
      hasFilters={hasFilters}
      defaultTab={params.tab ?? "inbox"}
      actions={<NotifyMemberDialog members={memberOptions} />}
    />
  );
}
