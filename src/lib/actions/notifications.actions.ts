"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole, requireUser, requireGymScope } from "@/lib/auth/guards";
import {
  createAnnouncementSchema,
  notificationIdSchema,
  notifyMemberSchema,
  updateNotificationPreferencesSchema,
  type CreateAnnouncementInput,
  type NotificationIdInput,
  type NotifyMemberInput,
  type UpdateNotificationPreferencesInput,
} from "@/lib/validations/notifications";
import {
  getRecentNotifications,
  getNotificationPreferences,
  type NotificationListItem,
  type PreferenceMap,
} from "@/lib/data/notifications";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

/** Bell dropdown calls this on mount/poll instead of a route handler — lets
 *  it reuse requireUser() session resolution and the same read helper the
 *  server-rendered initial paint uses. */
export async function getMyNotificationsAction(): Promise<
  ActionResult<{ items: NotificationListItem[]; unreadCount: number }>
> {
  const user = await requireUser();
  const data = await getRecentNotifications(user.id);
  return { success: true, data };
}

export async function markNotificationReadAction(input: NotificationIdInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = notificationIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Everyone scopes to their own rows; a GYM_OWNER may additionally manage
  // any notification inside their own gym (gym-wide notification-center).
  const where =
    user.role === "GYM_OWNER" && user.gymId
      ? { id: parsed.data.notificationId, gymId: user.gymId }
      : { id: parsed.data.notificationId, userId: user.id };

  const notification = await db.notification.findFirst({ where });
  if (!notification) return { success: false, error: "Notification not found" };
  if (!notification.readAt) {
    await db.notification.update({ where: { id: notification.id }, data: { readAt: new Date() } });
  }

  // Notifications render in the header on every route, so there's no single
  // page path to target — revalidate the whole tree's layout segment.
  revalidatePath("/", "layout");
  return { success: true, data: undefined };
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const user = await requireUser();
  await db.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/", "layout");
  return { success: true, data: undefined };
}

/** Owner-only gym-wide broadcast (docs/09 §10.15) — fans out one
 *  Notification row per active user in the owner's own gym. Members with
 *  status !== ACTIVE (invited/inactive/soft-deleted) are excluded since
 *  they can't sign in to read it anyway. */
export async function createAnnouncementAction(input: CreateAnnouncementInput): Promise<ActionResult> {
  const { user, gymId } = await requireGymScope("GYM_OWNER");
  const parsed = createAnnouncementSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const recipients = await db.user.findMany({
    where: { gymId, status: "ACTIVE", deletedAt: null },
    select: { id: true },
  });
  if (recipients.length === 0) {
    return { success: false, error: "No active users to notify" };
  }

  await db.notification.createMany({
    data: recipients.map((recipient) => ({
      gymId,
      userId: recipient.id,
      type: "ANNOUNCEMENT" as const,
      title: parsed.data.title,
      body: parsed.data.body,
      relatedEntityType: "ANNOUNCEMENT",
      relatedEntityId: user.id,
    })),
  });

  revalidatePath("/", "layout");
  return { success: true, data: undefined };
}

/** Deletes one notification — own rows only, except a GYM_OWNER who may
 *  delete any notification in their own gym (same authority as mark-read). */
export async function deleteNotificationAction(input: NotificationIdInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = notificationIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const where =
    user.role === "GYM_OWNER" && user.gymId
      ? { id: parsed.data.notificationId, gymId: user.gymId }
      : { id: parsed.data.notificationId, userId: user.id };

  const existing = await db.notification.findFirst({ where, select: { id: true } });
  if (!existing) return { success: false, error: "Notification not found" };

  await db.notification.delete({ where: { id: existing.id } });
  revalidatePath("/", "layout");
  return { success: true, data: undefined };
}

/** Targeted one-off notification from staff to a single member — the
 *  "trainer messages" trigger (docs/09 §10.15). Owners/reception can notify
 *  any member in the gym; trainers only members currently assigned to them
 *  (mirrors `canSendMessage` in messaging.actions.ts). The member's
 *  TRAINER_MESSAGE preference is honored — an explicit opt-out drops the
 *  row, which is the point of the toggle. */
export async function notifyAssignedMemberAction(input: NotifyMemberInput): Promise<ActionResult> {
  const { user, gymId } = await requireGymScope("GYM_OWNER", "RECEPTIONIST", "TRAINER");
  const parsed = notifyMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { memberId, title, body } = parsed.data;

  const member = await db.user.findFirst({
    where: { id: memberId, gymId, role: "MEMBER" },
    select: { id: true, deletedAt: true },
  });
  if (!member || member.deletedAt) return { success: false, error: "Member not found" };

  if (user.role === "TRAINER") {
    const profile = await db.memberProfile.findFirst({
      where: { userId: memberId, gymId, assignedTrainerId: user.id },
      select: { userId: true },
    });
    if (!profile) return { success: false, error: "You can only notify your assigned members" };
  }

  const prefs = await getNotificationPreferences(memberId);
  if (prefs.TRAINER_MESSAGE === false) return { success: true, data: undefined };

  await db.notification.create({
    data: {
      gymId,
      userId: memberId,
      type: "TRAINER_MESSAGE",
      title,
      body,
      relatedEntityType: "USER",
      relatedEntityId: user.id,
    },
  });

  revalidatePath("/", "layout");
  return { success: true, data: undefined };
}

/** Platform-super-admin broadcast — creates a PlatformAnnouncement record
 *  and fans out one in-app Notification row per active, gym-scoped user
 *  (same ANNOUNCEMENT type the owner-wide composer uses; the platform admin
 *  themselves have no gymId so they're naturally excluded from the fan-out).
 *  Kept separate from createAnnouncementAction (which is owner-gym-scoped)
 *  because there's no gym scope for a PLATFORM_SUPER_ADMIN. */
export async function createPlatformAnnouncementAction(
  input: CreateAnnouncementInput,
): Promise<ActionResult> {
  const user = await requireRole("PLATFORM_SUPER_ADMIN");
  const parsed = createAnnouncementSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await db.platformAnnouncement.create({
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      audience: "all",
      createdBy: user.id,
      publishedAt: new Date(),
    },
  });

  const recipients = await db.user.findMany({
    where: { status: "ACTIVE", deletedAt: null, gymId: { not: null } },
    select: { id: true, gymId: true },
  });
  if (recipients.length > 0) {
    await db.notification.createMany({
      data: recipients.map((recipient) => ({
        gymId: recipient.gymId!,
        userId: recipient.id,
        type: "ANNOUNCEMENT" as const,
        title: parsed.data.title,
        body: parsed.data.body,
        relatedEntityType: "PLATFORM_ANNOUNCEMENT",
        relatedEntityId: user.id,
      })),
    });
  }

  revalidatePath("/", "layout");
  return { success: true, data: undefined };
}

export async function getMyNotificationPreferencesAction(): Promise<ActionResult<PreferenceMap>> {
  const user = await requireUser();
  const preferences = await getNotificationPreferences(user.id);
  return { success: true, data: preferences };
}

export async function updateNotificationPreferencesAction(
  input: UpdateNotificationPreferencesInput,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!user.gymId) return { success: false, error: "User has no gym scope" };
  const parsed = updateNotificationPreferencesSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await getNotificationPreferences(user.id);
  const merged = { ...existing, ...parsed.data.preferences };

  await db.notificationPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, gymId: user.gymId, preferences: merged },
    update: { preferences: merged },
  });

  revalidatePath("/", "layout");
  return { success: true, data: undefined };
}
