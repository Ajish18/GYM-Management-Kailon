"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireGymScope } from "@/lib/auth/guards";
import {
  createMemberSchema,
  assignTrainerSchema,
  type CreateMemberInput,
  type AssignTrainerInput,
} from "@/lib/validations/members";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createMemberAction(
  input: CreateMemberInput,
): Promise<ActionResult<{ memberId: string }>> {
  const { gymId } = await requireGymScope("GYM_OWNER", "RECEPTIONIST");
  const parsed = createMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const existingPhone = await db.user.findFirst({
    where: { gymId, phone: data.phone, deletedAt: null },
    select: { id: true },
  });
  if (existingPhone) {
    return { success: false, error: "A member with this phone number already exists" };
  }

  const member = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        gymId,
        role: "MEMBER",
        status: "ACTIVE",
        name: data.name,
        phone: data.phone,
        email: data.email || null,
      },
    });
    await tx.memberProfile.create({
      data: {
        userId: created.id,
        gymId,
        gender: data.gender,
        dob: data.dob ? new Date(data.dob) : null,
        emergencyContactName: data.emergencyContactName || null,
        emergencyContactPhone: data.emergencyContactPhone || null,
        healthNotes: data.healthNotes || null,
      },
    });
    await tx.memberStreak.create({ data: { memberId: created.id, gymId } });
    return created;
  });

  revalidatePath("/owner/members");
  revalidatePath("/reception/members");
  return { success: true, data: { memberId: member.id } };
}

export async function assignTrainerAction(input: AssignTrainerInput): Promise<ActionResult> {
  const { gymId } = await requireGymScope("GYM_OWNER", "RECEPTIONIST");
  const parsed = assignTrainerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const member = await db.user.findFirst({
    where: { id: parsed.data.memberId, gymId, role: "MEMBER" },
  });
  if (!member) return { success: false, error: "Member not found" };

  if (parsed.data.trainerId) {
    const trainer = await db.user.findFirst({
      where: { id: parsed.data.trainerId, gymId, role: "TRAINER" },
    });
    if (!trainer) return { success: false, error: "Trainer not found" };
  }

  await db.memberProfile.update({
    where: { userId: parsed.data.memberId },
    data: { assignedTrainerId: parsed.data.trainerId },
  });

  revalidatePath("/owner/members");
  revalidatePath("/reception/members");
  return { success: true, data: undefined };
}

export async function deleteMemberAction(memberId: string): Promise<ActionResult> {
  const { gymId } = await requireGymScope("GYM_OWNER");
  const member = await db.user.findFirst({ where: { id: memberId, gymId, role: "MEMBER" } });
  if (!member) return { success: false, error: "Member not found" };

  await db.user.update({ where: { id: memberId }, data: { deletedAt: new Date(), status: "INACTIVE" } });

  revalidatePath("/owner/members");
  revalidatePath("/reception/members");
  return { success: true, data: undefined };
}
