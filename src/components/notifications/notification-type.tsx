import {
  Bell,
  Cake,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Dumbbell,
  Flame,
  Megaphone,
  MessageSquareText,
  ShieldAlert,
  Target,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { NOTIFICATION_TYPES } from "@/lib/validations/notifications";

/** Shared icon + label maps for every notification type — used by the header
 *  bell, the notification-center list, and the type filter dropdown. Kept in
 *  one client-safe module so the server page and the interactive bits can't
 *  drift apart on which type maps to which visual. */
export const TYPE_ICON: Record<string, LucideIcon> = {
  EXPIRY: CalendarClock,
  FEE_DUE: CreditCard,
  ATTENDANCE_REMINDER: CalendarClock,
  WORKOUT_REMINDER: Dumbbell,
  DIET_REMINDER: Utensils,
  BIRTHDAY: Cake,
  ANNOUNCEMENT: Megaphone,
  SECURITY: ShieldAlert,
  PAYMENT_SUCCESS: CheckCircle2,
  TRAINER_MESSAGE: MessageSquareText,
  STREAK_MILESTONE: Flame,
  GOAL_ACHIEVED: Target,
};

export const TYPE_LABEL: Record<string, string> = {
  EXPIRY: "Membership expiry",
  FEE_DUE: "Fee due",
  ATTENDANCE_REMINDER: "Attendance reminder",
  WORKOUT_REMINDER: "Workout reminder",
  DIET_REMINDER: "Diet reminder",
  BIRTHDAY: "Birthday",
  ANNOUNCEMENT: "Announcement",
  SECURITY: "Security",
  PAYMENT_SUCCESS: "Payment received",
  TRAINER_MESSAGE: "Trainer message",
  STREAK_MILESTONE: "Streak milestone",
  GOAL_ACHIEVED: "Goal achieved",
};

/** Ordered option list for the type filter — stays aligned with the Prisma
 *  enum by deriving from NOTIFICATION_TYPES. */
export const TYPE_OPTIONS: { value: string; label: string }[] = NOTIFICATION_TYPES.map((type) => ({
  value: type,
  label: TYPE_LABEL[type] ?? type,
}));

export function getTypeLabel(type: string): string {
  return TYPE_LABEL[type] ?? type;
}

export function getTypeIcon(type: string): LucideIcon {
  return TYPE_ICON[type] ?? Bell;
}
