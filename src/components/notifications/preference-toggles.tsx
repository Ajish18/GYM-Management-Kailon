"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  TOGGLEABLE_NOTIFICATION_TYPES,
  type ToggleableNotificationType,
} from "@/lib/validations/notifications";
import {
  getMyNotificationPreferencesAction,
  updateNotificationPreferencesAction,
} from "@/lib/actions/notifications.actions";

const LABELS: Record<ToggleableNotificationType, { title: string; description: string }> = {
  EXPIRY: {
    title: "Membership expiry",
    description: "Reminders before your membership runs out",
  },
  FEE_DUE: {
    title: "Fee due",
    description: "Alerts when an invoice is unpaid or partially paid",
  },
  ATTENDANCE_REMINDER: {
    title: "Attendance reminders",
    description: "Nudges to check in and keep your streak",
  },
  WORKOUT_REMINDER: {
    title: "Workout reminders",
    description: "Reminders for your scheduled workout plan",
  },
  DIET_REMINDER: {
    title: "Diet reminders",
    description: "Reminders to log meals against your diet plan",
  },
  BIRTHDAY: {
    title: "Birthday wishes",
    description: "A little birthday greeting from the gym",
  },
  PAYMENT_SUCCESS: {
    title: "Payment received",
    description: "Confirmations when your payments go through",
  },
  TRAINER_MESSAGE: {
    title: "Trainer messages",
    description: "New messages from your trainer",
  },
  STREAK_MILESTONE: {
    title: "Streak milestones",
    description: "Celebrations when you hit a streak badge",
  },
  GOAL_ACHIEVED: {
    title: "Personal records",
    description: "Alerts when you set a new personal best",
  },
};

/**
 * Minimal per-type notification preference toggles, backed by
 * NotificationPreference.preferences (free-form JSON — undefined key means
 * "on"). Self-contained, not wired into any settings page. Suggested spot:
 * a "Notifications" tab/section on each role's own settings/profile page
 * (e.g. src/app/owner/settings, src/app/member/settings, if/when those
 * exist) — anywhere a user manages their own account preferences.
 */
export function PreferenceToggles() {
  const [prefs, setPrefs] = useState<Partial<Record<ToggleableNotificationType, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [pendingType, setPendingType] = useState<ToggleableNotificationType | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getMyNotificationPreferencesAction().then((result) => {
      if (cancelled) return;
      if (result.success) setPrefs(result.data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleToggle(type: ToggleableNotificationType, checked: boolean) {
    const previous = prefs;
    setPrefs((prev) => ({ ...prev, [type]: checked }));
    setPendingType(type);
    const result = await updateNotificationPreferencesAction({ preferences: { [type]: checked } });
    setPendingType(null);
    if (!result.success) {
      setPrefs(previous);
      toast.error(result.error);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {TOGGLEABLE_NOTIFICATION_TYPES.map((type) => (
          <Skeleton key={type} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {TOGGLEABLE_NOTIFICATION_TYPES.map((type) => {
        const enabled = prefs[type] ?? true;
        return (
          <div
            key={type}
            className="flex items-center justify-between gap-4 rounded-lg border p-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{LABELS[type].title}</p>
              <p className="text-xs text-muted-foreground">{LABELS[type].description}</p>
            </div>
            <Switch
              checked={enabled}
              disabled={pendingType === type}
              onCheckedChange={(checked) => handleToggle(type, checked)}
            />
          </div>
        );
      })}
    </div>
  );
}
