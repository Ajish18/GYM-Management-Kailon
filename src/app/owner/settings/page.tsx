import type { Metadata } from "next";
import { requireGymScope } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { GymCodeCard } from "@/components/settings/gym-code-card";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { GymSettingsForm } from "@/components/settings/gym-settings-form";
import { GymProfileForm } from "@/components/settings/gym-profile-form";

export const metadata: Metadata = { title: "Settings" };

type GymAddress = { line?: string; city?: string };

export default async function OwnerSettingsPage() {
  const { user, gymId } = await requireGymScope("GYM_OWNER");

  const [gym, settings, dbUser] = await Promise.all([
    db.gym.findUniqueOrThrow({
      where: { id: gymId },
      select: { name: true, gymCode: true, timezone: true, currency: true, brandColor: true, address: true },
    }),
    db.gymSettings.findUniqueOrThrow({ where: { gymId } }),
    db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } }),
  ]);

  const address = (gym.address as GymAddress | null) ?? {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Your Gym ID, account security, and gym-wide defaults.</p>
      </div>

      <GymCodeCard gymCode={gym.gymCode} gymName={gym.name} />
      <GymProfileForm
        initial={{
          name: gym.name,
          timezone: gym.timezone,
          currency: gym.currency,
          brandColor: gym.brandColor ?? "",
          addressLine: address.line ?? "",
          city: address.city ?? "",
        }}
      />
      <GymSettingsForm
        initial={{
          attendanceGraceMinutes: settings.attendanceGraceMinutes,
          maxSessionHours: settings.maxSessionHours,
          selfCheckinEnabled: settings.selfCheckinEnabled,
          streakRequiresCheckin: settings.streakRequiresCheckin,
          streakRequiresWorkoutLog: settings.streakRequiresWorkoutLog,
          streakRequiresCheckout: settings.streakRequiresCheckout,
          streakFreezesPerMonth: settings.streakFreezesPerMonth,
          invoicePrefix: settings.invoicePrefix,
          defaultTaxPercent: settings.defaultTaxPercent.toString(),
          paymentDueInDays: settings.paymentDueInDays,
        }}
      />
      <ChangePasswordForm hasPassword={!!dbUser.passwordHash} />
    </div>
  );
}
