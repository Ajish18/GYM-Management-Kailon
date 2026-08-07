"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireGymScope } from "@/lib/auth/guards";
import {
  exerciseSchema,
  createTemplateSchema,
  updateTemplateSchema,
  assignPlanSchema,
  logWorkoutSchema,
  type ExerciseInput,
  type CreateTemplateInput,
  type UpdateTemplateInput,
  type AssignPlanInput,
  type LogWorkoutInput,
} from "@/lib/validations/workouts";
import { getNotificationPreferences } from "@/lib/data/notifications";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

function revalidateWorkoutPages() {
  revalidatePath("/owner/workouts");
  revalidatePath("/trainer/workouts");
  revalidatePath("/member/workout");
}

// ─────────────────────────────────────────────────────────────────────────
// Exercise library — Owner + Trainer, gym-scoped only (global/shared
// library exercises, gymId === null, are visible but not editable here).
// ─────────────────────────────────────────────────────────────────────────

export async function createExerciseAction(input: ExerciseInput): Promise<ActionResult<{ exerciseId: string }>> {
  const { gymId } = await requireGymScope("GYM_OWNER", "TRAINER");
  const parsed = exerciseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { name, muscleGroup, equipment, instructions, mediaUrl } = parsed.data;

  const exercise = await db.exercise.create({
    data: {
      gymId,
      name,
      muscleGroup: muscleGroup || null,
      equipment: equipment || null,
      instructions: instructions || null,
      mediaUrl: mediaUrl || null,
    },
  });

  revalidateWorkoutPages();
  return { success: true, data: { exerciseId: exercise.id } };
}

export async function updateExerciseAction(exerciseId: string, input: ExerciseInput): Promise<ActionResult> {
  const { gymId } = await requireGymScope("GYM_OWNER", "TRAINER");
  const parsed = exerciseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const exercise = await db.exercise.findFirst({ where: { id: exerciseId, gymId } });
  if (!exercise) {
    return { success: false, error: "Exercise not found, or it's a shared library exercise that can't be edited" };
  }

  const { name, muscleGroup, equipment, instructions, mediaUrl } = parsed.data;
  await db.exercise.update({
    where: { id: exerciseId },
    data: {
      name,
      muscleGroup: muscleGroup || null,
      equipment: equipment || null,
      instructions: instructions || null,
      mediaUrl: mediaUrl || null,
    },
  });

  revalidateWorkoutPages();
  return { success: true, data: undefined };
}

export async function toggleExerciseActiveAction(exerciseId: string, isActive: boolean): Promise<ActionResult> {
  const { gymId } = await requireGymScope("GYM_OWNER", "TRAINER");
  const exercise = await db.exercise.findFirst({ where: { id: exerciseId, gymId } });
  if (!exercise) {
    return { success: false, error: "Exercise not found, or it's a shared library exercise" };
  }

  await db.exercise.update({ where: { id: exerciseId }, data: { isActive } });
  revalidateWorkoutPages();
  return { success: true, data: undefined };
}

// ─────────────────────────────────────────────────────────────────────────
// Workout templates — Owner + Trainer, full C/U/D over the gym's library
// (not restricted to templates the caller personally created).
// ─────────────────────────────────────────────────────────────────────────

async function assertExercisesBelongToGym(gymId: string, exerciseIds: string[]) {
  const uniqueIds = Array.from(new Set(exerciseIds));
  const count = await db.exercise.count({ where: { id: { in: uniqueIds }, OR: [{ gymId }, { gymId: null }] } });
  return count === uniqueIds.length;
}

export async function createTemplateAction(input: CreateTemplateInput): Promise<ActionResult<{ templateId: string }>> {
  const { user, gymId } = await requireGymScope("GYM_OWNER", "TRAINER");
  const parsed = createTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { name, description, days } = parsed.data;

  const exerciseIds = days.flatMap((d) => d.exercises.map((e) => e.exerciseId));
  if (!(await assertExercisesBelongToGym(gymId, exerciseIds))) {
    return { success: false, error: "One or more selected exercises are invalid" };
  }

  const template = await db.$transaction(async (tx) => {
    const created = await tx.workoutTemplate.create({
      data: { gymId, name, description: description || null, createdById: user.id },
    });
    for (const day of days) {
      const createdDay = await tx.workoutTemplateDay.create({
        data: { gymId, templateId: created.id, dayOrder: day.dayOrder, label: day.label },
      });
      for (const ex of day.exercises) {
        await tx.workoutTemplateExercise.create({
          data: {
            gymId,
            templateDayId: createdDay.id,
            exerciseId: ex.exerciseId,
            targetSets: ex.targetSets,
            targetReps: ex.targetReps,
            targetWeight: ex.targetWeight > 0 ? ex.targetWeight : null,
            restSeconds: ex.restSeconds > 0 ? ex.restSeconds : null,
            sortOrder: ex.sortOrder,
          },
        });
      }
    }
    return created;
  });

  revalidateWorkoutPages();
  return { success: true, data: { templateId: template.id } };
}

export async function updateTemplateAction(input: UpdateTemplateInput): Promise<ActionResult> {
  const { gymId } = await requireGymScope("GYM_OWNER", "TRAINER");
  const parsed = updateTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { templateId, name, description, days } = parsed.data;

  const template = await db.workoutTemplate.findFirst({ where: { id: templateId, gymId } });
  if (!template) return { success: false, error: "Template not found" };

  const exerciseIds = days.flatMap((d) => d.exercises.map((e) => e.exerciseId));
  if (!(await assertExercisesBelongToGym(gymId, exerciseIds))) {
    return { success: false, error: "One or more selected exercises are invalid" };
  }

  await db.$transaction(async (tx) => {
    await tx.workoutTemplate.update({
      where: { id: templateId },
      data: { name, description: description || null },
    });
    // Full replace rather than diffing days/exercises — WorkoutTemplateDay
    // -> WorkoutTemplateExercise cascades on delete, so this is a clean way
    // to persist add/remove/reorder without hand-rolling a diff.
    await tx.workoutTemplateDay.deleteMany({ where: { templateId } });
    for (const day of days) {
      const createdDay = await tx.workoutTemplateDay.create({
        data: { gymId, templateId, dayOrder: day.dayOrder, label: day.label },
      });
      for (const ex of day.exercises) {
        await tx.workoutTemplateExercise.create({
          data: {
            gymId,
            templateDayId: createdDay.id,
            exerciseId: ex.exerciseId,
            targetSets: ex.targetSets,
            targetReps: ex.targetReps,
            targetWeight: ex.targetWeight > 0 ? ex.targetWeight : null,
            restSeconds: ex.restSeconds > 0 ? ex.restSeconds : null,
            sortOrder: ex.sortOrder,
          },
        });
      }
    }
  });

  revalidateWorkoutPages();
  return { success: true, data: undefined };
}

export async function toggleTemplateActiveAction(templateId: string, isActive: boolean): Promise<ActionResult> {
  const { gymId } = await requireGymScope("GYM_OWNER", "TRAINER");
  const template = await db.workoutTemplate.findFirst({ where: { id: templateId, gymId } });
  if (!template) return { success: false, error: "Template not found" };

  await db.workoutTemplate.update({ where: { id: templateId }, data: { isActive } });
  revalidateWorkoutPages();
  return { success: true, data: undefined };
}

// ─────────────────────────────────────────────────────────────────────────
// Assigning / closing plans — Owner assigns to anyone in the gym; a
// Trainer only to members currently assigned to them (checked fresh on
// every call, never trusting client input).
// ─────────────────────────────────────────────────────────────────────────

export async function assignPlanAction(input: AssignPlanInput): Promise<ActionResult<{ planId: string }>> {
  const { user, gymId } = await requireGymScope("GYM_OWNER", "TRAINER");
  const parsed = assignPlanSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { memberId, templateId, startDate } = parsed.data;

  const member = await db.user.findFirst({
    where: { id: memberId, gymId, role: "MEMBER", deletedAt: null },
    include: { memberProfile: true },
  });
  if (!member) return { success: false, error: "Member not found" };

  if (user.role === "TRAINER" && member.memberProfile?.assignedTrainerId !== user.id) {
    return { success: false, error: "You can only assign plans to your assigned members" };
  }

  const template = await db.workoutTemplate.findFirst({ where: { id: templateId, gymId, isActive: true } });
  if (!template) return { success: false, error: "Template not found" };

  const parsedStart = new Date(startDate);
  if (Number.isNaN(parsedStart.getTime())) {
    return { success: false, error: "Invalid start date" };
  }
  parsedStart.setHours(0, 0, 0, 0);

  // Only one ACTIVE plan per member at a time — auto-cancel any existing
  // active plan for this member in the same transaction as the new one.
  const plan = await db.$transaction(async (tx) => {
    await tx.workoutPlan.updateMany({
      where: { gymId, memberId, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    });
    return tx.workoutPlan.create({
      data: { gymId, memberId, templateId, assignedById: user.id, startDate: parsedStart, status: "ACTIVE" },
    });
  });

  revalidateWorkoutPages();
  return { success: true, data: { planId: plan.id } };
}

async function setPlanStatus(planId: string, status: "COMPLETED" | "CANCELLED"): Promise<ActionResult> {
  const { user, gymId } = await requireGymScope("GYM_OWNER", "TRAINER");
  const plan = await db.workoutPlan.findFirst({ where: { id: planId, gymId } });
  if (!plan) return { success: false, error: "Plan not found" };

  if (user.role === "TRAINER") {
    const profile = await db.memberProfile.findFirst({
      where: { userId: plan.memberId, gymId, assignedTrainerId: user.id },
    });
    if (!profile) return { success: false, error: "You can only manage plans for your assigned members" };
  }

  await db.workoutPlan.update({ where: { id: planId }, data: { status } });
  revalidateWorkoutPages();
  return { success: true, data: undefined };
}

export async function markPlanCompleteAction(planId: string): Promise<ActionResult> {
  return setPlanStatus(planId, "COMPLETED");
}

export async function cancelPlanAction(planId: string): Promise<ActionResult> {
  return setPlanStatus(planId, "CANCELLED");
}

// ─────────────────────────────────────────────────────────────────────────
// Logging a workout — Member logs their own; Trainer may log on behalf of
// an assigned member.
// ─────────────────────────────────────────────────────────────────────────

export async function logWorkoutAction(
  input: LogWorkoutInput,
): Promise<ActionResult<{ logId: string; newPrExerciseIds: string[] }>> {
  const { user, gymId } = await requireGymScope("MEMBER", "TRAINER");
  const parsed = logWorkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { workoutPlanId, memberId, logDate, status, notes, sets } = parsed.data;

  if (user.role === "MEMBER" && memberId !== user.id) {
    return { success: false, error: "You can only log your own workouts" };
  }
  if (user.role === "TRAINER") {
    const profile = await db.memberProfile.findFirst({
      where: { userId: memberId, gymId, assignedTrainerId: user.id },
    });
    if (!profile) return { success: false, error: "You can only log workouts for your assigned members" };
  }

  const plan = await db.workoutPlan.findFirst({ where: { id: workoutPlanId, gymId, memberId } });
  if (!plan) return { success: false, error: "Workout plan not found" };

  const day = new Date(logDate);
  if (Number.isNaN(day.getTime())) {
    return { success: false, error: "Invalid log date" };
  }
  day.setHours(0, 0, 0, 0);

  const result = await db.$transaction(async (tx) => {
    const existing = await tx.workoutLog.findFirst({
      where: { workoutPlanId, memberId, logDate: day },
    });

    let logId: string;
    if (existing) {
      await tx.workoutLogSet.deleteMany({ where: { workoutLogId: existing.id } });
      await tx.workoutLog.update({ where: { id: existing.id }, data: { status, notes: notes || null } });
      logId = existing.id;
    } else {
      const created = await tx.workoutLog.create({
        data: { gymId, workoutPlanId, memberId, logDate: day, status, notes: notes || null },
      });
      logId = created.id;
    }

    // PR detection (docs/12 §12.9): a set is a new personal record if its
    // actualWeight beats the member's current best for that exercise, or
    // matches it at a higher rep count ("that actualWeight, at that
    // actualReps or higher"). Sets with no weight entered (0, i.e. "not
    // logged") never count. Multiple sets for the same exercise within one
    // submission are compared sequentially against a running best, so a
    // later heavier set in the same log correctly beats an earlier one.
    const runningBest = new Map<string, { weight: number; reps: number }>();
    const newPrExerciseIds: string[] = [];

    for (const s of sets) {
      if (s.actualWeight <= 0) {
        await tx.workoutLogSet.create({
          data: {
            gymId,
            workoutLogId: logId,
            exerciseId: s.exerciseId,
            setNumber: s.setNumber,
            actualReps: s.actualReps > 0 ? s.actualReps : null,
            actualWeight: null,
            isPr: false,
          },
        });
        continue;
      }

      if (!runningBest.has(s.exerciseId)) {
        const record = await tx.personalRecord.findUnique({
          where: { memberId_exerciseId: { memberId, exerciseId: s.exerciseId } },
        });
        runningBest.set(
          s.exerciseId,
          record ? { weight: Number(record.bestWeight), reps: record.bestRepsAtWeight } : { weight: -1, reps: -1 },
        );
      }
      const best = runningBest.get(s.exerciseId)!;
      const reps = s.actualReps;
      const isNewPr = s.actualWeight > best.weight || (s.actualWeight === best.weight && reps > best.reps);

      const createdSet = await tx.workoutLogSet.create({
        data: {
          gymId,
          workoutLogId: logId,
          exerciseId: s.exerciseId,
          setNumber: s.setNumber,
          actualReps: reps > 0 ? reps : null,
          actualWeight: s.actualWeight,
          isPr: isNewPr,
        },
      });

      if (isNewPr) {
        runningBest.set(s.exerciseId, { weight: s.actualWeight, reps });
        await tx.personalRecord.upsert({
          where: { memberId_exerciseId: { memberId, exerciseId: s.exerciseId } },
          create: {
            gymId,
            memberId,
            exerciseId: s.exerciseId,
            bestWeight: s.actualWeight,
            bestRepsAtWeight: reps,
            achievedAt: day,
            sourceLogSetId: createdSet.id,
          },
          update: {
            bestWeight: s.actualWeight,
            bestRepsAtWeight: reps,
            achievedAt: day,
            sourceLogSetId: createdSet.id,
          },
        });
        if (!newPrExerciseIds.includes(s.exerciseId)) newPrExerciseIds.push(s.exerciseId);
      }
    }

    return { logId, newPrExerciseIds };
  });

  // GOAL_ACHIEVED in-app notification for each new personal record
  // (docs/09 §10.15) — PRs are the closest real goal event in the schema, so
  // "set a PR" is the achievement trigger. Honours the member's opt-out.
  if (result.newPrExerciseIds.length > 0) {
    const [exercises, prefs] = await Promise.all([
      db.exercise.findMany({
        where: { id: { in: result.newPrExerciseIds } },
        select: { id: true, name: true },
      }),
      getNotificationPreferences(memberId),
    ]);

    if (prefs.GOAL_ACHIEVED !== false) {
      const exerciseNameById = new Map(exercises.map((e) => [e.id, e.name]));
      await db.notification.createMany({
        data: result.newPrExerciseIds.map((exerciseId) => ({
          gymId,
          userId: memberId,
          type: "GOAL_ACHIEVED",
          title: "New personal record!",
          body: `You set a new personal record on ${
            exerciseNameById.get(exerciseId) ?? "an exercise"
          }. Great work!`,
          relatedEntityType: "PersonalRecord",
          relatedEntityId: exerciseId,
        })),
      });
    }
  }

  revalidateWorkoutPages();
  // PR notification renders in the header on every route.
  revalidatePath("/", "layout");
  return { success: true, data: result };
}
