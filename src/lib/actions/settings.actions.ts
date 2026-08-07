"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { requireGymScope, requireUser } from "@/lib/auth/guards";
import { hashPassword, verifyPassword } from "@/lib/auth/security";
import {
  changePasswordSchema,
  updateGymSettingsSchema,
  updateGymProfileSchema,
  type ChangePasswordInput,
  type UpdateGymSettingsInput,
  type UpdateGymProfileInput,
} from "@/lib/validations/settings";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

/** Works for any authenticated user. If they don't have a password yet
 *  (Google-only Trainer/Member), this sets one instead of requiring a
 *  current password — the active session is already proof of identity. */
export async function changePasswordAction(input: ChangePasswordInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const dbUser = await db.user.findUniqueOrThrow({ where: { id: user.id } });

  if (dbUser.passwordHash) {
    const valid = await verifyPassword(parsed.data.currentPassword, dbUser.passwordHash);
    if (!valid) {
      return { success: false, error: "Current password is incorrect" };
    }
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  const session = await auth();

  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });
    // Signing in from a new device with a changed password shouldn't leave
    // old sessions (e.g. a lost phone) valid — revoke everything except the
    // session making this change.
    await tx.userSession.updateMany({
      where: {
        userId: user.id,
        revokedAt: null,
        ...(session?.sessionId ? { jti: { not: session.sessionId } } : {}),
      },
      data: { revokedAt: new Date() },
    });
  });

  return { success: true, data: undefined };
}

export async function getGymSettings(gymId: string) {
  return db.gymSettings.findUniqueOrThrow({ where: { gymId } });
}

export async function updateGymSettingsAction(input: UpdateGymSettingsInput): Promise<ActionResult> {
  const { gymId } = await requireGymScope("GYM_OWNER");
  const parsed = updateGymSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await db.gymSettings.update({ where: { gymId }, data: parsed.data });
  revalidatePath("/owner/settings");
  return { success: true, data: undefined };
}

export async function updateGymProfileAction(input: UpdateGymProfileInput): Promise<ActionResult> {
  const { gymId } = await requireGymScope("GYM_OWNER");
  const parsed = updateGymProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { name, timezone, currency, brandColor, addressLine, city } = parsed.data;

  await db.gym.update({
    where: { id: gymId },
    data: {
      name,
      timezone,
      currency: currency.toUpperCase(),
      brandColor: brandColor || null,
      address: addressLine || city ? { line: addressLine || undefined, city: city || undefined } : undefined,
    },
  });

  revalidatePath("/owner/settings");
  return { success: true, data: undefined };
}
