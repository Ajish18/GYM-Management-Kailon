import { z } from "zod";

/** Mirrors Prisma's NotificationType enum — kept as a literal list here
 *  (rather than importing from @prisma/client) so this file stays a plain
 *  Zod schema module usable from client components without pulling in
 *  Prisma's generated client on the client bundle. */
export const NOTIFICATION_TYPES = [
  "EXPIRY",
  "FEE_DUE",
  "ATTENDANCE_REMINDER",
  "WORKOUT_REMINDER",
  "DIET_REMINDER",
  "BIRTHDAY",
  "ANNOUNCEMENT",
  "SECURITY",
  "PAYMENT_SUCCESS",
  "TRAINER_MESSAGE",
  "STREAK_MILESTONE",
  "GOAL_ACHIEVED",
] as const;
export type NotificationTypeLiteral = (typeof NOTIFICATION_TYPES)[number];

/** Preference toggles are only meaningful for notification types the member
 *  can actually opt out of — ANNOUNCEMENT (owner broadcast) and SECURITY
 *  (session/security alerts) are always delivered regardless of prefs. */
export const TOGGLEABLE_NOTIFICATION_TYPES = [
  "EXPIRY",
  "FEE_DUE",
  "ATTENDANCE_REMINDER",
  "WORKOUT_REMINDER",
  "DIET_REMINDER",
  "BIRTHDAY",
  "PAYMENT_SUCCESS",
  "TRAINER_MESSAGE",
  "STREAK_MILESTONE",
  "GOAL_ACHIEVED",
] as const;
export type ToggleableNotificationType = (typeof TOGGLEABLE_NOTIFICATION_TYPES)[number];

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(120),
  body: z.string().trim().min(2, "Message is required").max(2000),
});
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

export const notificationIdSchema = z.object({
  notificationId: z.string().min(1),
});
export type NotificationIdInput = z.infer<typeof notificationIdSchema>;

/** Targeted one-off notification from staff (trainer/owner/reception) to a
 *  single member — the trainer side of "trainer messages". Deduplicated by
 *  relatedEntityId = the notification row's own id at creation time, so
 *  repeated sends always land. */
export const notifyMemberSchema = z.object({
  memberId: z.string().min(1, "Select a member"),
  title: z.string().trim().min(2, "Title is required").max(120),
  body: z.string().trim().min(2, "Message is required").max(500),
});
export type NotifyMemberInput = z.infer<typeof notifyMemberSchema>;

/** Free-form JSON on NotificationPreference.preferences — validated as a
 *  partial map of type -> enabled (callers typically flip one type at a
 *  time) so the action can merge it onto whatever's already stored. */
export const updateNotificationPreferencesSchema = z.object({
  preferences: z
    .object({
      EXPIRY: z.boolean(),
      FEE_DUE: z.boolean(),
      ATTENDANCE_REMINDER: z.boolean(),
      WORKOUT_REMINDER: z.boolean(),
      DIET_REMINDER: z.boolean(),
      BIRTHDAY: z.boolean(),
      PAYMENT_SUCCESS: z.boolean(),
      TRAINER_MESSAGE: z.boolean(),
      STREAK_MILESTONE: z.boolean(),
      GOAL_ACHIEVED: z.boolean(),
    })
    .partial(),
});
export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>;
