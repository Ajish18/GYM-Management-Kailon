import "server-only";
import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────
// Exercise library — gym-scoped exercises plus any gym-null "global"/shared
// library exercises are always visible together.
// ─────────────────────────────────────────────────────────────────────────

export async function listExercises(params: { gymId: string; search?: string; includeInactive?: boolean }) {
  return db.exercise.findMany({
    where: {
      AND: [
        { OR: [{ gymId: params.gymId }, { gymId: null }] },
        params.includeInactive ? {} : { isActive: true },
        params.search
          ? {
              OR: [
                { name: { contains: params.search, mode: "insensitive" as const } },
                { muscleGroup: { contains: params.search, mode: "insensitive" as const } },
              ],
            }
          : {},
      ],
    },
    orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
  });
}

/** Slim option list for template-builder exercise pickers. */
export async function listActiveExercises(gymId: string) {
  return db.exercise.findMany({
    where: { OR: [{ gymId }, { gymId: null }], isActive: true },
    orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
    select: { id: true, name: true, muscleGroup: true },
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Workout templates
// ─────────────────────────────────────────────────────────────────────────

const templateInclude = {
  days: {
    orderBy: { dayOrder: "asc" as const },
    include: {
      exercises: {
        orderBy: { sortOrder: "asc" as const },
        include: { exercise: true },
      },
    },
  },
};

export async function listTemplates(gymId: string) {
  return db.workoutTemplate.findMany({
    where: { gymId },
    include: templateInclude,
    orderBy: { createdAt: "desc" },
  });
}
export type TemplateWithDays = Awaited<ReturnType<typeof listTemplates>>[number];

export async function getTemplateWithDays(templateId: string, gymId: string) {
  return db.workoutTemplate.findFirst({
    where: { id: templateId, gymId },
    include: templateInclude,
  });
}

/** Slim option list for the assign-plan dialog. */
export async function listActiveTemplates(gymId: string) {
  return db.workoutTemplate.findMany({
    where: { gymId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Member pickers / workout plans
// ─────────────────────────────────────────────────────────────────────────

/** Owner sees every member; a trainer sees only members currently assigned
 *  to them (re-checked live via memberProfile.assignedTrainerId, never
 *  cached — a trainer's roster can change between requests). */
export async function listAssignableMembers(params: { gymId: string; trainerId?: string }) {
  return db.user.findMany({
    where: {
      gymId: params.gymId,
      role: "MEMBER",
      deletedAt: null,
      ...(params.trainerId ? { memberProfile: { assignedTrainerId: params.trainerId } } : {}),
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export type WorkoutPlanListItem = {
  id: string;
  memberId: string;
  memberName: string;
  templateName: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  startDate: Date;
  assignedByName: string;
};

export async function listWorkoutPlans(params: { gymId: string; trainerId?: string }): Promise<WorkoutPlanListItem[]> {
  const members = await listAssignableMembers(params);
  const memberIds = members.map((m) => m.id);
  if (memberIds.length === 0) return [];

  const plans = await db.workoutPlan.findMany({
    where: { gymId: params.gymId, memberId: { in: memberIds } },
    include: {
      template: { select: { name: true } },
      assignedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const nameById = new Map(members.map((m) => [m.id, m.name]));
  return plans.map((plan) => ({
    id: plan.id,
    memberId: plan.memberId,
    memberName: nameById.get(plan.memberId) ?? "Unknown member",
    templateName: plan.template?.name ?? "—",
    status: plan.status,
    startDate: plan.startDate,
    assignedByName: plan.assignedBy.name,
  }));
}

// ─────────────────────────────────────────────────────────────────────────
// Member "Today's Workout" view
// ─────────────────────────────────────────────────────────────────────────

// The raw workout plan carries Prisma Decimals on nested fields
// (WorkoutTemplateExercise.targetWeight, WorkoutLogSet.actualWeight) that
// React refuses to serialize from Server to Client ("...Decimal objects are
// not supported"). TodayWorkoutCard is a Client Component, so these queries
// flatten every Decimal to a plain number before returning.
export type ActivePlanForMember = Awaited<ReturnType<typeof fetchActivePlan>>;

async function fetchActivePlan(memberId: string) {
  return db.workoutPlan.findFirst({
    where: { memberId, status: "ACTIVE" },
    include: { template: { include: templateInclude } },
    orderBy: { startDate: "desc" },
  });
}

function serializeTemplateExercise(
  te: NonNullable<NonNullable<NonNullable<ActivePlanForMember>["template"]>["days"]>[number]["exercises"][number],
) {
  return { ...te, targetWeight: te.targetWeight != null ? Number(te.targetWeight) : null };
}

function serializeTemplateDay(
  day: NonNullable<NonNullable<NonNullable<ActivePlanForMember>["template"]>["days"]>[number],
) {
  return { ...day, exercises: day.exercises.map(serializeTemplateExercise) };
}

function serializeActivePlan(plan: NonNullable<ActivePlanForMember>): NonNullable<ActivePlanForMember> {
  if (plan.template) {
    plan.template.days = plan.template.days.map(serializeTemplateDay) as typeof plan.template.days;
  }
  return plan;
}

export async function getActivePlanForMember(memberId: string) {
  const plan = await fetchActivePlan(memberId);
  return plan ? serializeActivePlan(plan) : null;
}

/**
 * Design decision — "which template day is today?"
 *
 * The schema gives each WorkoutTemplateDay a `dayOrder` but no weekday
 * mapping (no Monday/Tuesday concept), and WorkoutPlan has no fixed
 * duration to compute a schedule against. So "today's" day is derived by
 * simply cycling through the template's days (sorted by dayOrder) one per
 * calendar day, counting from the plan's `startDate`:
 *
 *   dayIndex = (daysSinceStart mod totalTemplateDays)
 *
 * e.g. a 3-day template (Day 1/2/3) assigned with startDate = Monday shows
 * Day 1 on Monday, Day 2 Tuesday, Day 3 Wednesday, Day 1 again Thursday,
 * and so on, continuously — there's no separate "rest day" concept, every
 * calendar day maps to some template day. If `today` is before `startDate`
 * (clock skew, or a future-dated plan) the diff is clamped to 0 so it never
 * returns a negative index. Document/reuse this exact formula anywhere else
 * "today's workout day" needs to be computed, so behavior stays consistent.
 */
export function getTodayDayIndex(startDate: Date, totalDays: number): number {
  if (totalDays <= 0) return -1;
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.max(0, Math.round((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  return diffDays % totalDays;
}

export type TodayLog = Awaited<ReturnType<typeof fetchTodayLog>>;

async function fetchTodayLog(planId: string, memberId: string, logDate: Date) {
  return db.workoutLog.findFirst({
    where: { workoutPlanId: planId, memberId, logDate },
    include: { sets: true },
  });
}

// TodayWorkoutCard is a Client Component and reads todayLog.sets[].actualWeight
// (a Prisma Decimal) — flatten to plain numbers for the Server → Client hop.
export async function getTodayLogForPlan(planId: string, memberId: string, logDate: Date) {
  const log = await fetchTodayLog(planId, memberId, logDate);
  if (log) {
    log.sets = log.sets.map((s) => ({
      ...s,
      actualWeight: s.actualWeight != null ? Number(s.actualWeight) : null,
    })) as typeof log.sets;
  }
  return log;
}

export async function getWorkoutHistory(memberId: string, gymId: string, limit = 20) {
  return db.workoutLog.findMany({
    where: { memberId, gymId },
    orderBy: { logDate: "desc" },
    take: limit,
    include: { sets: { include: { exercise: { select: { name: true } } } } },
  });
}
export type WorkoutHistoryItem = Awaited<ReturnType<typeof getWorkoutHistory>>[number];

export async function getPersonalRecords(memberId: string, gymId: string) {
  return db.personalRecord.findMany({
    where: { memberId, gymId },
    include: { exercise: { select: { name: true } } },
    orderBy: { achievedAt: "desc" },
  });
}
export type PersonalRecordItem = Awaited<ReturnType<typeof getPersonalRecords>>[number];
