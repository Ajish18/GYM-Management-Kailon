import type { Metadata } from "next";
import { requireGymScope } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { GymCodeCard } from "@/components/settings/gym-code-card";
import { ChangePasswordForm } from "@/components/settings/change-password-form";

export const metadata: Metadata = { title: "Settings" };

export default async function ReceptionSettingsPage() {
  const { user, gymId } = await requireGymScope("RECEPTIONIST");

  const [gym, dbUser] = await Promise.all([
    db.gym.findUniqueOrThrow({ where: { id: gymId }, select: { name: true, gymCode: true } }),
    db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Your gym’s ID and your own account security.</p>
      </div>

      <GymCodeCard gymCode={gym.gymCode} gymName={gym.name} />
      <ChangePasswordForm hasPassword={!!dbUser.passwordHash} />
    </div>
  );
}
