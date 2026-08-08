import "server-only";
import { db } from "@/lib/db";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function listDietTemplates(gymId: string) {
  return db.dietTemplate.findMany({
    where: { gymId },
    orderBy: { name: "asc" },
    include: { meals: { orderBy: { sortOrder: "asc" } } },
  });
}

export type DietTemplateWithMeals = Awaited<ReturnType<typeof listDietTemplates>>[number];

/** Members eligible for diet assignment/management — Owner sees everyone,
 *  a Trainer only their own assigned roster (docs/09 §10.10). */
export async function listMembersForDiet(gymId: string, trainerId?: string) {
  return db.user.findMany({
    where: {
      gymId,
      role: "MEMBER",
      deletedAt: null,
      ...(trainerId ? { memberProfile: { assignedTrainerId: trainerId } } : {}),
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export type DietPlanListItem = {
  id: string;
  memberId: string;
  memberName: string;
  templateName: string | null;
  startDate: Date;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
};

/** Plans overview — Owner sees all, Trainer only plans for assigned members.
 *  DietPlan has no Prisma relation back to User for memberId (scalar-only
 *  in the schema), so member names are joined manually. */
export async function listDietPlans(params: {
  gymId: string;
  trainerId?: string;
}): Promise<DietPlanListItem[]> {
  let memberIdFilter: string[] | undefined;
  if (params.trainerId) {
    const assigned = await listMembersForDiet(params.gymId, params.trainerId);
    memberIdFilter = assigned.map((m) => m.id);
  }

  const plans = await db.dietPlan.findMany({
    where: {
      gymId: params.gymId,
      ...(memberIdFilter ? { memberId: { in: memberIdFilter } } : {}),
    },
    orderBy: { startDate: "desc" },
    include: { template: { select: { name: true } } },
  });

  if (plans.length === 0) return [];

  const members = await db.user.findMany({
    where: { id: { in: [...new Set(plans.map((p) => p.memberId))] } },
    select: { id: true, name: true },
  });
  const nameByMemberId = new Map(members.map((m) => [m.id, m.name]));

  return plans.map((p) => ({
    id: p.id,
    memberId: p.memberId,
    memberName: nameByMemberId.get(p.memberId) ?? "Unknown member",
    templateName: p.template?.name ?? null,
    startDate: p.startDate,
    status: p.status,
  }));
}

// DietPlanMeal macro fields (proteinG/carbsG/fatG) are Prisma Decimals.
// Decimal objects can't be serialized across the Server → Client boundary
// ("Only plain objects can be passed to Client Components... Decimal objects
// are not supported"), so meal macros are flattened to plain numbers here.
// The `meals` array is shared by server-rendered cards AND client-fetched
// detail sheets — keeping the conversion in the data layer fixes both.
type DietPlanResult = Awaited<ReturnType<typeof fetchDietPlan>>;

function normalizeMealMacros(plan: DietPlanResult): DietPlanResult {
  if (plan) {
    plan.meals = plan.meals.map((m) => ({
      ...m,
      proteinG: m.proteinG != null ? Number(m.proteinG) : null,
      carbsG: m.carbsG != null ? Number(m.carbsG) : null,
      fatG: m.fatG != null ? Number(m.fatG) : null,
    })) as NonNullable<DietPlanResult>["meals"];
  }
  return plan;
}

async function fetchDietPlan(gymId: string, planId: string) {
  return db.dietPlan.findFirst({
    where: { id: planId, gymId },
    include: { meals: { orderBy: { sortOrder: "asc" } }, template: { select: { name: true } } },
  });
}

export async function getDietPlanById(gymId: string, planId: string) {
  const plan = await fetchDietPlan(gymId, planId);
  return normalizeMealMacros(plan);
}

export async function getActiveDietPlanForMember(gymId: string, memberId: string) {
  const plan = await db.dietPlan.findFirst({
    where: { gymId, memberId, status: "ACTIVE" },
    orderBy: { startDate: "desc" },
    include: { meals: { orderBy: { sortOrder: "asc" } }, template: { select: { name: true } } },
  });
  return normalizeMealMacros(plan);
}

export async function listDietNotesForPlan(dietPlanId: string) {
  return db.dietNote.findMany({
    where: { dietPlanId },
    orderBy: { noteDate: "desc" },
    include: { createdBy: { select: { name: true } } },
  });
}

export async function listSupplementsForMember(gymId: string, memberId: string) {
  return db.supplementRecommendation.findMany({
    where: { gymId, memberId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTodayWaterIntakeMl(memberId: string) {
  const log = await db.waterIntakeLog.findUnique({
    where: { memberId_logDate: { memberId, logDate: startOfToday() } },
  });
  return log?.amountMl ?? 0;
}
