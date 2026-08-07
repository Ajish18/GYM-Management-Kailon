"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireGymScope } from "@/lib/auth/guards";
import type { UserRole } from "@prisma/client";
import {
  getDietPlanById,
  listDietNotesForPlan,
  listSupplementsForMember,
} from "@/lib/data/diet";
import {
  createTemplateSchema,
  updateTemplateSchema,
  assignPlanSchema,
  updatePlanStatusSchema,
  addDietNoteSchema,
  addSupplementSchema,
  logWaterSchema,
  type CreateTemplateInput,
  type UpdateTemplateInput,
  type AssignPlanInput,
  type UpdatePlanStatusInput,
  type AddDietNoteInput,
  type AddSupplementInput,
  type LogWaterInput,
} from "@/lib/validations/diet";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function revalidateDietPaths() {
  revalidatePath("/owner/diet");
  revalidatePath("/trainer/diet");
  revalidatePath("/member/diet");
}

/** Trainers may only act on members assigned to them (docs/09 §10.10);
 *  Owner has no such restriction. */
async function assertMemberAccessible(
  gymId: string,
  memberId: string,
  actor: { id: string; role: UserRole },
) {
  const member = await db.user.findFirst({
    where: { id: memberId, gymId, role: "MEMBER", deletedAt: null },
    include: { memberProfile: true },
  });
  if (!member) return { ok: false as const, error: "Member not found" };
  if (actor.role === "TRAINER" && member.memberProfile?.assignedTrainerId !== actor.id) {
    return { ok: false as const, error: "You can only manage members assigned to you" };
  }
  return { ok: true as const, member };
}

export async function createTemplateAction(input: CreateTemplateInput): Promise<ActionResult> {
  const { user, gymId } = await requireGymScope("GYM_OWNER", "TRAINER");
  const parsed = createTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { name, description, meals } = parsed.data;

  await db.dietTemplate.create({
    data: {
      gymId,
      name,
      description: description ?? null,
      createdById: user.id,
      meals: {
        create: meals.map((m, i) => ({
          gymId,
          mealName: m.mealName,
          timeSlot: m.timeSlot ?? null,
          calories: m.calories ?? null,
          proteinG: m.proteinG ?? null,
          carbsG: m.carbsG ?? null,
          fatG: m.fatG ?? null,
          sortOrder: i,
        })),
      },
    },
  });

  revalidatePath("/owner/diet");
  revalidatePath("/trainer/diet");
  return { success: true, data: undefined };
}

/** Editing a template's meals must NOT retroactively change any member's
 *  already-assigned DietPlanMeal rows (docs/12 §12.10) — those are a
 *  separate table, snapshotted at assignment time, so replacing the
 *  template's own meals here has no effect on them. */
export async function updateTemplateAction(input: UpdateTemplateInput): Promise<ActionResult> {
  const { gymId } = await requireGymScope("GYM_OWNER", "TRAINER");
  const parsed = updateTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { templateId, name, description, meals } = parsed.data;

  const template = await db.dietTemplate.findFirst({ where: { id: templateId, gymId } });
  if (!template) return { success: false, error: "Template not found" };

  await db.$transaction(async (tx) => {
    await tx.dietTemplate.update({
      where: { id: templateId },
      data: { name, description: description ?? null },
    });
    await tx.dietTemplateMeal.deleteMany({ where: { templateId } });
    await tx.dietTemplateMeal.createMany({
      data: meals.map((m, i) => ({
        gymId,
        templateId,
        mealName: m.mealName,
        timeSlot: m.timeSlot ?? null,
        calories: m.calories ?? null,
        proteinG: m.proteinG ?? null,
        carbsG: m.carbsG ?? null,
        fatG: m.fatG ?? null,
        sortOrder: i,
      })),
    });
  });

  revalidatePath("/owner/diet");
  revalidatePath("/trainer/diet");
  return { success: true, data: undefined };
}

export async function toggleTemplateActiveAction(
  templateId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const { gymId } = await requireGymScope("GYM_OWNER", "TRAINER");
  const template = await db.dietTemplate.findFirst({ where: { id: templateId, gymId } });
  if (!template) return { success: false, error: "Template not found" };

  await db.dietTemplate.update({ where: { id: templateId }, data: { isActive } });
  revalidatePath("/owner/diet");
  revalidatePath("/trainer/diet");
  return { success: true, data: undefined };
}

/** Assigns a template's current meals as a snapshot to a member's new plan.
 *  Only one ACTIVE diet plan per member — the prior active plan (if any) is
 *  auto-cancelled in the same transaction (mirrors the workout plan rule,
 *  keeps "today's diet" unambiguous). */
export async function assignPlanAction(input: AssignPlanInput): Promise<ActionResult> {
  const { user, gymId } = await requireGymScope("GYM_OWNER", "TRAINER");
  const parsed = assignPlanSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { memberId, templateId, startDate } = parsed.data;

  const memberCheck = await assertMemberAccessible(gymId, memberId, user);
  if (!memberCheck.ok) return { success: false, error: memberCheck.error };

  const template = await db.dietTemplate.findFirst({
    where: { id: templateId, gymId, isActive: true },
    include: { meals: { orderBy: { sortOrder: "asc" } } },
  });
  if (!template) return { success: false, error: "Diet template not found" };

  await db.$transaction(async (tx) => {
    const currentActive = await tx.dietPlan.findFirst({
      where: { gymId, memberId, status: "ACTIVE" },
    });
    if (currentActive) {
      await tx.dietPlan.update({ where: { id: currentActive.id }, data: { status: "CANCELLED" } });
    }

    const plan = await tx.dietPlan.create({
      data: {
        gymId,
        memberId,
        templateId,
        assignedById: user.id,
        startDate: new Date(startDate),
        status: "ACTIVE",
      },
    });

    if (template.meals.length > 0) {
      await tx.dietPlanMeal.createMany({
        data: template.meals.map((m) => ({
          gymId,
          dietPlanId: plan.id,
          mealName: m.mealName,
          timeSlot: m.timeSlot,
          calories: m.calories,
          proteinG: m.proteinG,
          carbsG: m.carbsG,
          fatG: m.fatG,
          sortOrder: m.sortOrder,
        })),
      });
    }
  });

  revalidateDietPaths();
  return { success: true, data: undefined };
}

export async function updatePlanStatusAction(input: UpdatePlanStatusInput): Promise<ActionResult> {
  const { user, gymId } = await requireGymScope("GYM_OWNER", "TRAINER");
  const parsed = updatePlanStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { planId, status } = parsed.data;

  const plan = await db.dietPlan.findFirst({ where: { id: planId, gymId } });
  if (!plan) return { success: false, error: "Plan not found" };

  const memberCheck = await assertMemberAccessible(gymId, plan.memberId, user);
  if (!memberCheck.ok) return { success: false, error: memberCheck.error };

  await db.dietPlan.update({ where: { id: planId }, data: { status } });
  revalidateDietPaths();
  return { success: true, data: undefined };
}

export async function addDietNoteAction(input: AddDietNoteInput): Promise<ActionResult> {
  const { user, gymId } = await requireGymScope("GYM_OWNER", "TRAINER");
  const parsed = addDietNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { dietPlanId, noteDate, note } = parsed.data;

  const plan = await db.dietPlan.findFirst({ where: { id: dietPlanId, gymId } });
  if (!plan) return { success: false, error: "Plan not found" };

  const memberCheck = await assertMemberAccessible(gymId, plan.memberId, user);
  if (!memberCheck.ok) return { success: false, error: memberCheck.error };

  await db.dietNote.create({
    data: {
      gymId,
      memberId: plan.memberId,
      dietPlanId,
      noteDate: new Date(noteDate),
      note,
      createdById: user.id,
    },
  });

  revalidateDietPaths();
  return { success: true, data: undefined };
}

export async function addSupplementAction(input: AddSupplementInput): Promise<ActionResult> {
  const { user, gymId } = await requireGymScope("GYM_OWNER", "TRAINER");
  const parsed = addSupplementSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { memberId, dietPlanId, name, dosage, timingNote } = parsed.data;

  const memberCheck = await assertMemberAccessible(gymId, memberId, user);
  if (!memberCheck.ok) return { success: false, error: memberCheck.error };

  if (dietPlanId) {
    const plan = await db.dietPlan.findFirst({ where: { id: dietPlanId, gymId, memberId } });
    if (!plan) return { success: false, error: "Diet plan not found for this member" };
  }

  await db.supplementRecommendation.create({
    data: {
      gymId,
      memberId,
      dietPlanId: dietPlanId ?? null,
      name,
      dosage: dosage ?? null,
      timingNote: timingNote ?? null,
      recommendedById: user.id,
    },
  });

  revalidateDietPaths();
  return { success: true, data: undefined };
}

export async function deleteSupplementAction(supplementId: string): Promise<ActionResult> {
  const { user, gymId } = await requireGymScope("GYM_OWNER", "TRAINER");
  const supplement = await db.supplementRecommendation.findFirst({
    where: { id: supplementId, gymId },
  });
  if (!supplement) return { success: false, error: "Supplement not found" };

  const memberCheck = await assertMemberAccessible(gymId, supplement.memberId, user);
  if (!memberCheck.ok) return { success: false, error: memberCheck.error };

  await db.supplementRecommendation.delete({ where: { id: supplementId } });
  revalidateDietPaths();
  return { success: true, data: undefined };
}

/** Members log their own water intake for today; repeated calls add to the
 *  running total for the day rather than replacing it. */
export async function logWaterAction(input: LogWaterInput): Promise<ActionResult<{ totalMl: number }>> {
  const { user, gymId } = await requireGymScope("MEMBER");
  const parsed = logWaterSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const log = await db.waterIntakeLog.upsert({
    where: { memberId_logDate: { memberId: user.id, logDate: startOfToday() } },
    update: { amountMl: { increment: parsed.data.amountMl } },
    create: {
      gymId,
      memberId: user.id,
      logDate: startOfToday(),
      amountMl: parsed.data.amountMl,
    },
  });

  revalidatePath("/member/diet");
  return { success: true, data: { totalMl: log.amountMl } };
}

/** Lazily loads one plan's meals/notes/supplements for the detail sheet on
 *  the Plans overview table — a read, but shaped as an ActionResult like
 *  everything else here since it's invoked from a Client Component. */
export async function getDietPlanDetailAction(planId: string): Promise<
  ActionResult<{
    plan: NonNullable<Awaited<ReturnType<typeof getDietPlanById>>>;
    notes: Awaited<ReturnType<typeof listDietNotesForPlan>>;
    supplements: Awaited<ReturnType<typeof listSupplementsForMember>>;
  }>
> {
  const { user, gymId } = await requireGymScope("GYM_OWNER", "TRAINER");
  const plan = await getDietPlanById(gymId, planId);
  if (!plan) return { success: false, error: "Plan not found" };

  const memberCheck = await assertMemberAccessible(gymId, plan.memberId, user);
  if (!memberCheck.ok) return { success: false, error: memberCheck.error };

  const [notes, supplements] = await Promise.all([
    listDietNotesForPlan(planId),
    listSupplementsForMember(gymId, plan.memberId),
  ]);

  return { success: true, data: { plan, notes, supplements } };
}
