import "server-only";
import { db } from "@/lib/db";
import { deriveMemberStatus, type DerivedMemberStatus } from "@/lib/member-status";
import type {
  CheckMethod,
  LogStatus,
  MembershipStatus,
  PaymentMethod,
  WorkoutPlanStatus,
} from "@prisma/client";

/** Reports fed by a table another workstream still writes to (attendance,
 *  workouts, diet, streaks) will legitimately return `[]` on a fresh gym —
 *  that's expected, not a bug; the UI layer is responsible for a clean empty
 *  state rather than treating it as an error. */

// ─────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────

/** On-screen + CSV export both cap at this many rows for the handful of
 *  transaction-grain reports (attendance, payments, expenses, pending
 *  dues) that can otherwise grow unbounded. True pagination / an async
 *  export job for larger datasets is out of scope for this pass — see the
 *  final report for the fast-follow note. */
const MAX_ROWS = 2000;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function monthBounds(month?: string, year?: string) {
  const now = new Date();
  const y = Number(year) || now.getFullYear();
  const m = (Number(month) || now.getMonth() + 1) - 1; // 0-indexed for Date()
  const start = new Date(y, m, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(y, m + 1, 1);
  end.setHours(0, 0, 0, 0);
  return { start, end, month: m + 1, year: y };
}

function monthLabel(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
}

/** Parses an optional from/to pair of yyyy-mm-dd strings into a date range.
 *  Falls back to a trailing window when neither is supplied so every report
 *  has a sane default instead of scanning all-time data. */
function parseDateRange(from?: string, to?: string, fallbackDays = 30) {
  const now = new Date();
  const gte = from ? startOfDay(new Date(from)) : startOfDay(new Date(now.getTime() - fallbackDays * 86400000));
  const lte = to ? endOfDay(new Date(to)) : endOfDay(now);
  return { gte, lte };
}

async function latestMembershipsByMember(gymId: string, memberIds: string[]) {
  type Row = Awaited<ReturnType<typeof db.memberMembership.findMany<{
    where: { gymId: string; memberId: { in: string[] } };
    orderBy: { endDate: "desc" };
    include: { plan: { select: { name: true; id: true } } };
  }>>>[number];
  const map = new Map<string, Row>();
  if (memberIds.length === 0) return map;
  const memberships = await db.memberMembership.findMany({
    where: { gymId, memberId: { in: memberIds } },
    orderBy: { endDate: "desc" },
    include: { plan: { select: { name: true, id: true } } },
  });
  for (const m of memberships) {
    if (!map.has(m.memberId)) map.set(m.memberId, m);
  }
  return map;
}

function lastNMonths(n: number) {
  const now = new Date();
  const results: { start: Date; end: Date; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    results.push({ start, end, label: start.toLocaleString("en-IN", { month: "short", year: "2-digit" }) });
  }
  return results;
}

export const REPORT_TYPES = [
  "owner-summary",
  "trainer-performance",
  "member-report",
  "attendance-report",
  "revenue-report",
  "expense-report",
  "workout-report",
  "diet-report",
  "membership-report",
  "renewal-report",
  "inactive-members",
  "streak-report",
  "leaderboard",
  "pending-dues",
  "profit-loss",
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

/** Populates the trainer/plan/expense-category dropdowns shared across
 *  several report filter bars. */
export async function getReportFilterOptions(gymId: string) {
  const [trainers, plans, categories] = await Promise.all([
    db.user.findMany({
      where: { gymId, role: "TRAINER", deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.membershipPlan.findMany({
      where: { gymId },
      select: { id: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.expenseCategory.findMany({
      where: { OR: [{ gymId }, { gymId: null }] },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return { trainers, plans, categories };
}

// ─────────────────────────────────────────────────────────────────────────
// 1. Owner Summary
// ─────────────────────────────────────────────────────────────────────────

export type OwnerSummaryFilters = { month?: string; year?: string };
export type OwnerSummaryRow = {
  period: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  newMembers: number;
  churnedMembers: number;
  avgAttendancePercent: number;
};

export async function getOwnerSummaryReport(
  gymId: string,
  filters: OwnerSummaryFilters,
): Promise<OwnerSummaryRow[]> {
  const { start, end, month, year } = monthBounds(filters.month, filters.year);
  const today = new Date();
  const churnCutoff = end < today ? end : today;

  const [revenueAgg, expenseAgg, newMembers, activeMembers, attendance, churnedLapsed, churnedCancelled] =
    await Promise.all([
      db.payment.aggregate({
        where: { gymId, isReversal: false, paidAt: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
      db.expense.aggregate({ where: { gymId, expenseDate: { gte: start, lt: end } }, _sum: { amount: true } }),
      db.memberProfile.count({ where: { gymId, joinDate: { gte: start, lt: end } } }),
      db.memberMembership.count({ where: { gymId, status: "ACTIVE", endDate: { gte: today } } }),
      db.attendanceRecord.findMany({
        where: { gymId, checkInAt: { gte: start, lt: end } },
        select: { memberId: true, checkInAt: true },
      }),
      // A membership that stayed status "ACTIVE" forever but whose window
      // already lapsed without a renewal is churn: assignMembershipAction
      // always flips the predecessor to UPGRADED the moment a renewal
      // happens (lib/actions/memberships.actions.ts), so "still ACTIVE past
      // its end date" reliably means "never renewed."
      db.memberMembership.count({
        where: { gymId, status: "ACTIVE", endDate: { gte: start, lt: churnCutoff } },
      }),
      db.memberMembership.count({
        where: { gymId, status: "CANCELLED", updatedAt: { gte: start, lt: end } },
      }),
    ]);

  const daysInMonth = Math.round((end.getTime() - start.getTime()) / 86400000);
  // Simplification: "avg attendance %" = distinct member-days checked in,
  // divided by (currently-active members × days in month). Doesn't account
  // for members who joined/left mid-month shrinking the true denominator.
  const distinctMemberDays = new Set(
    attendance.map((a) => `${a.memberId}_${a.checkInAt.toISOString().slice(0, 10)}`),
  ).size;
  const avgAttendancePercent =
    activeMembers > 0 && daysInMonth > 0
      ? Math.round((distinctMemberDays / (activeMembers * daysInMonth)) * 1000) / 10
      : 0;

  const revenue = Number(revenueAgg._sum.amount ?? 0);
  const expenses = Number(expenseAgg._sum.amount ?? 0);

  return [
    {
      period: monthLabel(month, year),
      revenue,
      expenses,
      netProfit: revenue - expenses,
      newMembers,
      churnedMembers: churnedLapsed + churnedCancelled,
      avgAttendancePercent,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────
// 15. Profit & Loss Summary
// ─────────────────────────────────────────────────────────────────────────

export type ProfitLossFilters = { month?: string; year?: string; comparePriorPeriod?: string };
export type ProfitLossRow = {
  period: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  marginPercent: number;
  priorRevenue?: number;
  priorExpenses?: number;
  priorNetProfit?: number;
  priorMarginPercent?: number;
};

async function revenueAndExpenseForRange(gymId: string, start: Date, end: Date) {
  const [revenueAgg, expenseAgg] = await Promise.all([
    db.payment.aggregate({ where: { gymId, isReversal: false, paidAt: { gte: start, lt: end } }, _sum: { amount: true } }),
    db.expense.aggregate({ where: { gymId, expenseDate: { gte: start, lt: end } }, _sum: { amount: true } }),
  ]);
  const revenue = Number(revenueAgg._sum.amount ?? 0);
  const expenses = Number(expenseAgg._sum.amount ?? 0);
  return { revenue, expenses };
}

export async function getProfitLossReport(gymId: string, filters: ProfitLossFilters): Promise<ProfitLossRow[]> {
  const { start, end, month, year } = monthBounds(filters.month, filters.year);
  const { revenue, expenses } = await revenueAndExpenseForRange(gymId, start, end);
  const netProfit = revenue - expenses;
  const marginPercent = revenue > 0 ? Math.round((netProfit / revenue) * 1000) / 10 : 0;

  const row: ProfitLossRow = { period: monthLabel(month, year), revenue, expenses, netProfit, marginPercent };

  if (filters.comparePriorPeriod === "true") {
    const priorAnchor = new Date(year, month - 2, 1); // month is 1-indexed; -2 = previous month
    const prior = monthBounds(String(priorAnchor.getMonth() + 1), String(priorAnchor.getFullYear()));
    const priorTotals = await revenueAndExpenseForRange(gymId, prior.start, prior.end);
    const priorNetProfit = priorTotals.revenue - priorTotals.expenses;
    row.priorRevenue = priorTotals.revenue;
    row.priorExpenses = priorTotals.expenses;
    row.priorNetProfit = priorNetProfit;
    row.priorMarginPercent = priorTotals.revenue > 0 ? Math.round((priorNetProfit / priorTotals.revenue) * 1000) / 10 : 0;
  }

  return [row];
}

// ─────────────────────────────────────────────────────────────────────────
// 2. Trainer Performance
// ─────────────────────────────────────────────────────────────────────────

export type TrainerPerformanceFilters = { trainerId?: string; from?: string; to?: string };
export type TrainerPerformanceRow = {
  trainerId: string;
  trainerName: string;
  assignedMembers: number;
  retentionPercent: number;
  avgAttendance: number;
  workoutAdherencePercent: number;
  prsLogged: number;
};

export async function getTrainerPerformanceReport(
  gymId: string,
  filters: TrainerPerformanceFilters,
): Promise<TrainerPerformanceRow[]> {
  const { gte, lte } = parseDateRange(filters.from, filters.to, 30);
  const today = new Date();

  const trainers = await db.user.findMany({
    where: { gymId, role: "TRAINER", deletedAt: null, ...(filters.trainerId ? { id: filters.trainerId } : {}) },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  if (trainers.length === 0) return [];

  return Promise.all(
    trainers.map(async (trainer): Promise<TrainerPerformanceRow> => {
      const assigned = await db.memberProfile.findMany({
        where: { gymId, assignedTrainerId: trainer.id },
        select: { userId: true },
      });
      const memberIds = assigned.map((m) => m.userId);
      if (memberIds.length === 0) {
        return {
          trainerId: trainer.id,
          trainerName: trainer.name,
          assignedMembers: 0,
          retentionPercent: 0,
          avgAttendance: 0,
          workoutAdherencePercent: 0,
          prsLogged: 0,
        };
      }

      const [activeMemberships, attendanceCount, logGroups, prsLogged] = await Promise.all([
        db.memberMembership.findMany({
          where: { gymId, memberId: { in: memberIds }, status: "ACTIVE", endDate: { gte: today } },
          select: { memberId: true },
          distinct: ["memberId"],
        }),
        db.attendanceRecord.count({ where: { gymId, memberId: { in: memberIds }, checkInAt: { gte, lte } } }),
        db.workoutLog.groupBy({
          by: ["status"],
          where: { gymId, memberId: { in: memberIds }, logDate: { gte, lte } },
          _count: true,
        }),
        db.personalRecord.count({ where: { gymId, memberId: { in: memberIds }, achievedAt: { gte, lte } } }),
      ]);

      const logCounts = Object.fromEntries(logGroups.map((g) => [g.status, g._count])) as Partial<
        Record<LogStatus, number>
      >;
      const totalLogs = (logCounts.COMPLETED ?? 0) + (logCounts.SKIPPED ?? 0) + (logCounts.PARTIAL ?? 0);

      return {
        trainerId: trainer.id,
        trainerName: trainer.name,
        assignedMembers: memberIds.length,
        // Simplification: "retention" here = share of assigned members
        // currently holding an active membership, not a true cohort-based
        // retention-rate calculation (spec explicitly allows this proxy).
        retentionPercent: Math.round((activeMemberships.length / memberIds.length) * 1000) / 10,
        avgAttendance: Math.round((attendanceCount / memberIds.length) * 10) / 10,
        workoutAdherencePercent:
          totalLogs > 0 ? Math.round(((logCounts.COMPLETED ?? 0) / totalLogs) * 1000) / 10 : 0,
        prsLogged,
      };
    }),
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 3. Member Report
// ─────────────────────────────────────────────────────────────────────────

export type MemberReportFilters = {
  status?: DerivedMemberStatus | string;
  trainerId?: string;
  planId?: string;
  joinFrom?: string;
  joinTo?: string;
};
export type MemberReportRow = {
  memberId: string;
  name: string;
  status: DerivedMemberStatus;
  planId: string | null;
  planName: string | null;
  joinDate: Date;
  expiryDate: Date | null;
  trainerName: string | null;
  lastAttendance: Date | null;
  duesAmount: number;
};

export async function getMemberReport(gymId: string, filters: MemberReportFilters): Promise<MemberReportRow[]> {
  const members = await db.user.findMany({
    where: {
      gymId,
      role: "MEMBER",
      deletedAt: null,
      ...(filters.trainerId || filters.joinFrom || filters.joinTo
        ? {
            memberProfile: {
              ...(filters.trainerId ? { assignedTrainerId: filters.trainerId } : {}),
              ...(filters.joinFrom || filters.joinTo
                ? {
                    joinDate: {
                      ...(filters.joinFrom ? { gte: startOfDay(new Date(filters.joinFrom)) } : {}),
                      ...(filters.joinTo ? { lte: endOfDay(new Date(filters.joinTo)) } : {}),
                    },
                  }
                : {}),
            },
          }
        : {}),
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  if (members.length === 0) return [];
  const memberIds = members.map((m) => m.id);

  const [profiles, membershipMap, lastAttendanceGroups, unpaidInvoices] = await Promise.all([
    db.memberProfile.findMany({
      where: { gymId, userId: { in: memberIds } },
      include: { assignedTrainer: { select: { name: true } } },
    }),
    latestMembershipsByMember(gymId, memberIds),
    db.attendanceRecord.groupBy({
      by: ["memberId"],
      where: { gymId, memberId: { in: memberIds } },
      _max: { checkInAt: true },
    }),
    db.invoice.findMany({
      where: { gymId, memberId: { in: memberIds }, status: { in: ["UNPAID", "PARTIALLY_PAID"] } },
      select: { id: true, memberId: true, total: true },
    }),
  ]);

  const invoiceIds = unpaidInvoices.map((i) => i.id);
  const payments =
    invoiceIds.length > 0
      ? await db.payment.findMany({
          where: { gymId, invoiceId: { in: invoiceIds }, isReversal: false },
          select: { invoiceId: true, amount: true },
        })
      : [];
  const paidByInvoice = new Map<string, number>();
  for (const p of payments) paidByInvoice.set(p.invoiceId, (paidByInvoice.get(p.invoiceId) ?? 0) + Number(p.amount));
  const duesByMember = new Map<string, number>();
  for (const inv of unpaidInvoices) {
    const due = Number(inv.total) - (paidByInvoice.get(inv.id) ?? 0);
    duesByMember.set(inv.memberId, (duesByMember.get(inv.memberId) ?? 0) + Math.max(0, due));
  }

  const profileMap = new Map(profiles.map((p) => [p.userId, p]));
  const lastAttMap = new Map(lastAttendanceGroups.map((a) => [a.memberId, a._max.checkInAt]));

  let rows: MemberReportRow[] = members.map((m) => {
    const profile = profileMap.get(m.id) ?? null;
    const latest = membershipMap.get(m.id) ?? null;
    return {
      memberId: m.id,
      name: m.name,
      status: deriveMemberStatus(latest ?? null),
      planId: latest?.planId ?? null,
      planName: latest?.plan.name ?? null,
      joinDate: profile?.joinDate ?? new Date(0),
      expiryDate: latest?.endDate ?? null,
      trainerName: profile?.assignedTrainer?.name ?? null,
      lastAttendance: lastAttMap.get(m.id) ?? null,
      duesAmount: duesByMember.get(m.id) ?? 0,
    };
  });

  if (filters.status) rows = rows.filter((r) => r.status === filters.status);
  if (filters.planId) rows = rows.filter((r) => r.planId === filters.planId);

  return rows;
}

// ─────────────────────────────────────────────────────────────────────────
// 4. Attendance Report
// ─────────────────────────────────────────────────────────────────────────

export type AttendanceReportFilters = {
  memberId?: string;
  trainerId?: string;
  from?: string;
  to?: string;
  method?: string;
};
export type AttendanceReportRow = {
  memberId: string;
  memberName: string;
  checkInAt: Date;
  checkOutAt: Date | null;
  durationMinutes: number | null;
  method: CheckMethod;
};

export async function getAttendanceReport(
  gymId: string,
  filters: AttendanceReportFilters,
): Promise<AttendanceReportRow[]> {
  const { gte, lte } = parseDateRange(filters.from, filters.to, 7);

  let memberIdFilter: string[] | undefined;
  if (filters.trainerId && !filters.memberId) {
    const assigned = await db.memberProfile.findMany({
      where: { gymId, assignedTrainerId: filters.trainerId },
      select: { userId: true },
    });
    memberIdFilter = assigned.map((m) => m.userId);
    if (memberIdFilter.length === 0) return [];
  }

  const records = await db.attendanceRecord.findMany({
    where: {
      gymId,
      checkInAt: { gte, lte },
      ...(filters.memberId
        ? { memberId: filters.memberId }
        : memberIdFilter
          ? { memberId: { in: memberIdFilter } }
          : {}),
      ...(filters.method ? { checkInMethod: filters.method as CheckMethod } : {}),
    },
    orderBy: { checkInAt: "desc" },
    take: MAX_ROWS,
  });
  if (records.length === 0) return [];

  const memberIds = [...new Set(records.map((r) => r.memberId))];
  const members = await db.user.findMany({ where: { id: { in: memberIds } }, select: { id: true, name: true } });
  const nameMap = new Map(members.map((m) => [m.id, m.name]));

  return records.map((r) => ({
    memberId: r.memberId,
    memberName: nameMap.get(r.memberId) ?? "Unknown",
    checkInAt: r.checkInAt,
    checkOutAt: r.checkOutAt,
    durationMinutes: r.sessionDurationMinutes,
    method: r.checkInMethod,
  }));
}

// ─────────────────────────────────────────────────────────────────────────
// 5. Revenue Report
// ─────────────────────────────────────────────────────────────────────────

export type RevenueReportFilters = { from?: string; to?: string; planId?: string; paymentMethod?: string };
export type RevenueReportRow = {
  paymentId: string;
  invoiceNumber: string;
  memberName: string;
  planName: string | null;
  amount: number;
  method: PaymentMethod;
  discount: number;
  date: Date;
};

export async function getRevenueReport(gymId: string, filters: RevenueReportFilters): Promise<RevenueReportRow[]> {
  const { gte, lte } = parseDateRange(filters.from, filters.to, 30);

  const payments = await db.payment.findMany({
    where: {
      gymId,
      isReversal: false,
      paidAt: { gte, lte },
      ...(filters.paymentMethod ? { method: filters.paymentMethod as PaymentMethod } : {}),
      ...(filters.planId ? { invoice: { relatedMembership: { planId: filters.planId } } } : {}),
    },
    include: {
      invoice: {
        select: {
          invoiceNumber: true,
          discountAmount: true,
          relatedMembership: { select: { plan: { select: { name: true } } } },
        },
      },
    },
    orderBy: { paidAt: "desc" },
    take: MAX_ROWS,
  });
  if (payments.length === 0) return [];

  const memberIds = [...new Set(payments.map((p) => p.memberId))];
  const members = await db.user.findMany({ where: { id: { in: memberIds } }, select: { id: true, name: true } });
  const nameMap = new Map(members.map((m) => [m.id, m.name]));

  return payments.map((p) => ({
    paymentId: p.id,
    invoiceNumber: p.invoice.invoiceNumber,
    memberName: nameMap.get(p.memberId) ?? "Unknown",
    planName: p.invoice.relatedMembership?.plan.name ?? null,
    amount: Number(p.amount),
    method: p.method,
    discount: Number(p.invoice.discountAmount),
    date: p.paidAt,
  }));
}

// ─────────────────────────────────────────────────────────────────────────
// 6. Expense Report
// ─────────────────────────────────────────────────────────────────────────

export type ExpenseReportFilters = { from?: string; to?: string; categoryId?: string };
export type ExpenseReportRow = { expenseId: string; category: string; amount: number; date: Date; vendorNote: string | null };

export async function getExpenseReport(gymId: string, filters: ExpenseReportFilters): Promise<ExpenseReportRow[]> {
  const { gte, lte } = parseDateRange(filters.from, filters.to, 30);
  const expenses = await db.expense.findMany({
    where: { gymId, expenseDate: { gte, lte }, ...(filters.categoryId ? { categoryId: filters.categoryId } : {}) },
    include: { category: { select: { name: true } } },
    orderBy: { expenseDate: "desc" },
    take: MAX_ROWS,
  });
  return expenses.map((e) => ({
    expenseId: e.id,
    category: e.category.name,
    amount: Number(e.amount),
    date: e.expenseDate,
    vendorNote: e.vendorNote,
  }));
}

// ─────────────────────────────────────────────────────────────────────────
// 7. Workout Report
// ─────────────────────────────────────────────────────────────────────────

export type WorkoutReportFilters = {
  memberId?: string;
  trainerId?: string;
  planStatus?: string;
  from?: string;
  to?: string;
};
export type WorkoutReportRow = {
  planId: string;
  memberName: string;
  planName: string;
  status: WorkoutPlanStatus;
  adherencePercent: number;
  prCount: number;
};

export async function getWorkoutReport(gymId: string, filters: WorkoutReportFilters): Promise<WorkoutReportRow[]> {
  // dateRange bounds which logs/PRs count toward adherence — it does not
  // restrict which plans are listed, so a long-running plan with recent
  // activity still shows up even if it started outside the window.
  const { gte, lte } = parseDateRange(filters.from, filters.to, 90);

  let memberIds: string[] | undefined;
  if (filters.trainerId && !filters.memberId) {
    const assigned = await db.memberProfile.findMany({
      where: { gymId, assignedTrainerId: filters.trainerId },
      select: { userId: true },
    });
    memberIds = assigned.map((m) => m.userId);
    if (memberIds.length === 0) return [];
  }

  const plans = await db.workoutPlan.findMany({
    where: {
      gymId,
      ...(filters.memberId ? { memberId: filters.memberId } : memberIds ? { memberId: { in: memberIds } } : {}),
      ...(filters.planStatus ? { status: filters.planStatus as WorkoutPlanStatus } : {}),
    },
    include: { template: { select: { name: true } } },
    orderBy: { startDate: "desc" },
    take: MAX_ROWS,
  });
  if (plans.length === 0) return [];

  const planIds = plans.map((p) => p.id);
  const memberIdsForPlans = [...new Set(plans.map((p) => p.memberId))];

  const [members, logGroups, prRows] = await Promise.all([
    db.user.findMany({ where: { id: { in: memberIdsForPlans } }, select: { id: true, name: true } }),
    db.workoutLog.groupBy({
      by: ["workoutPlanId", "status"],
      where: { gymId, workoutPlanId: { in: planIds }, logDate: { gte, lte } },
      _count: true,
    }),
    // PRs aren't linked to a specific plan (PersonalRecord tracks the
    // member's single current-best lift per exercise), so a PR achieved
    // within the window is attributed to any of that member's plans as a
    // simple proxy for "PRs logged while this plan was active."
    db.personalRecord.findMany({
      where: { gymId, memberId: { in: memberIdsForPlans }, achievedAt: { gte, lte } },
      select: { memberId: true },
    }),
  ]);

  const nameMap = new Map(members.map((m) => [m.id, m.name]));
  const logsByPlan = new Map<string, Partial<Record<LogStatus, number>>>();
  for (const g of logGroups) {
    const entry = logsByPlan.get(g.workoutPlanId) ?? {};
    entry[g.status] = g._count;
    logsByPlan.set(g.workoutPlanId, entry);
  }
  const prCountByMember = new Map<string, number>();
  for (const pr of prRows) prCountByMember.set(pr.memberId, (prCountByMember.get(pr.memberId) ?? 0) + 1);

  return plans.map((p) => {
    const counts = logsByPlan.get(p.id) ?? {};
    const completed = counts.COMPLETED ?? 0;
    const skipped = counts.SKIPPED ?? 0;
    const partial = counts.PARTIAL ?? 0;
    const total = completed + skipped + partial;
    return {
      planId: p.id,
      memberName: nameMap.get(p.memberId) ?? "Unknown",
      planName: p.template?.name ?? "Custom plan",
      status: p.status,
      adherencePercent: total > 0 ? Math.round((completed / total) * 1000) / 10 : 0,
      prCount: prCountByMember.get(p.memberId) ?? 0,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────
// 8. Diet Report
// ─────────────────────────────────────────────────────────────────────────

export type DietReportFilters = { memberId?: string; trainerId?: string; from?: string; to?: string };
export type DietReportRow = {
  planId: string;
  memberName: string;
  planName: string;
  status: WorkoutPlanStatus;
  noteCount: number;
  avgWaterMl: number;
};

export async function getDietReport(gymId: string, filters: DietReportFilters): Promise<DietReportRow[]> {
  const { gte, lte } = parseDateRange(filters.from, filters.to, 90);

  let memberIds: string[] | undefined;
  if (filters.trainerId && !filters.memberId) {
    const assigned = await db.memberProfile.findMany({
      where: { gymId, assignedTrainerId: filters.trainerId },
      select: { userId: true },
    });
    memberIds = assigned.map((m) => m.userId);
    if (memberIds.length === 0) return [];
  }

  const plans = await db.dietPlan.findMany({
    where: {
      gymId,
      ...(filters.memberId ? { memberId: filters.memberId } : memberIds ? { memberId: { in: memberIds } } : {}),
    },
    include: { template: { select: { name: true } } },
    orderBy: { startDate: "desc" },
    take: MAX_ROWS,
  });
  if (plans.length === 0) return [];

  const planIds = plans.map((p) => p.id);
  const memberIdsForPlans = [...new Set(plans.map((p) => p.memberId))];

  const [members, noteGroups, waterLogs] = await Promise.all([
    db.user.findMany({ where: { id: { in: memberIdsForPlans } }, select: { id: true, name: true } }),
    db.dietNote.groupBy({
      by: ["dietPlanId"],
      where: { gymId, dietPlanId: { in: planIds }, noteDate: { gte, lte } },
      _count: true,
    }),
    db.waterIntakeLog.findMany({
      where: { gymId, memberId: { in: memberIdsForPlans }, logDate: { gte, lte } },
      select: { memberId: true, amountMl: true },
    }),
  ]);

  const nameMap = new Map(members.map((m) => [m.id, m.name]));
  const noteCountByPlan = new Map(noteGroups.map((g) => [g.dietPlanId, g._count]));
  const waterByMember = new Map<string, number[]>();
  for (const w of waterLogs) {
    const arr = waterByMember.get(w.memberId) ?? [];
    arr.push(w.amountMl);
    waterByMember.set(w.memberId, arr);
  }

  return plans.map((p) => {
    const waters = waterByMember.get(p.memberId) ?? [];
    const avgWaterMl = waters.length > 0 ? Math.round(waters.reduce((a, b) => a + b, 0) / waters.length) : 0;
    return {
      planId: p.id,
      memberName: nameMap.get(p.memberId) ?? "Unknown",
      planName: p.template?.name ?? "Custom plan",
      status: p.status,
      noteCount: noteCountByPlan.get(p.id) ?? 0,
      avgWaterMl,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────
// 9. Membership Report
// ─────────────────────────────────────────────────────────────────────────

export type MembershipReportFilters = { planId?: string; status?: string };
export type MembershipReportRow = {
  planId: string;
  planName: string;
  activeCount: number;
  revenue: number;
  avgTenureDays: number;
};

export async function getMembershipReport(
  gymId: string,
  filters: MembershipReportFilters,
): Promise<MembershipReportRow[]> {
  const plans = await db.membershipPlan.findMany({
    where: { gymId, ...(filters.planId ? { id: filters.planId } : {}) },
    orderBy: { sortOrder: "asc" },
  });
  if (plans.length === 0) return [];
  const today = new Date();

  return Promise.all(
    plans.map(async (plan): Promise<MembershipReportRow> => {
      const memberships = await db.memberMembership.findMany({
        where: { gymId, planId: plan.id, ...(filters.status ? { status: filters.status as MembershipStatus } : {}) },
        select: { status: true, startDate: true, endDate: true, pricePaid: true },
      });
      const activeCount = memberships.filter((m) => m.status === "ACTIVE" && m.endDate >= today).length;
      // "Revenue by plan" uses the price locked in on the membership at
      // signup (pricePaid) rather than actual cash collected — close enough
      // for a v1 report, but will read slightly high vs. the Revenue Report
      // if a membership is only partially paid.
      const revenue = memberships.reduce((sum, m) => sum + Number(m.pricePaid), 0);
      const avgTenureDays =
        memberships.length > 0
          ? Math.round(
              memberships.reduce((sum, m) => sum + (m.endDate.getTime() - m.startDate.getTime()) / 86400000, 0) /
                memberships.length,
            )
          : 0;
      return { planId: plan.id, planName: plan.name, activeCount, revenue, avgTenureDays };
    }),
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 10. Renewal Report
// ─────────────────────────────────────────────────────────────────────────

export type RenewalReportFilters = { expiryWindow?: string; status?: string };
export type RenewalReportRow = {
  memberId: string;
  memberName: string;
  planName: string | null;
  expiryDate: Date;
  daysUntilExpiry: number;
  renewalStatus: "Renewed" | "Pending" | "Lapsed";
};

export async function getRenewalReport(gymId: string, filters: RenewalReportFilters): Promise<RenewalReportRow[]> {
  const windowDays = Number(filters.expiryWindow) || 30;
  const today = startOfDay(new Date());
  const windowEnd = new Date(today.getTime() + windowDays * 86400000);
  // Symmetric window: covers memberships expiring soon (upcoming renewals)
  // as well as ones that recently lapsed, so "renewed vs lapsed" has
  // something to compare against.
  const rangeStart = new Date(today.getTime() - windowDays * 86400000);

  const memberships = await db.memberMembership.findMany({
    where: { gymId, status: "ACTIVE", endDate: { gte: rangeStart, lte: windowEnd } },
    include: { plan: { select: { name: true } } },
    orderBy: { endDate: "asc" },
  });
  if (memberships.length === 0) return [];

  const memberIds = [...new Set(memberships.map((m) => m.memberId))];
  const [members, allMemberships] = await Promise.all([
    db.user.findMany({ where: { id: { in: memberIds } }, select: { id: true, name: true } }),
    db.memberMembership.findMany({
      where: { gymId, memberId: { in: memberIds } },
      select: { memberId: true, startDate: true },
    }),
  ]);
  const nameMap = new Map(members.map((m) => [m.id, m.name]));

  const rows: RenewalReportRow[] = memberships.map((m) => {
    const hasNewer = allMemberships.some((x) => x.memberId === m.memberId && x.startDate > m.endDate);
    const daysUntilExpiry = Math.round((m.endDate.getTime() - today.getTime()) / 86400000);
    const renewalStatus: RenewalReportRow["renewalStatus"] = hasNewer
      ? "Renewed"
      : daysUntilExpiry < 0
        ? "Lapsed"
        : "Pending";
    return {
      memberId: m.memberId,
      memberName: nameMap.get(m.memberId) ?? "Unknown",
      planName: m.plan.name,
      expiryDate: m.endDate,
      daysUntilExpiry,
      renewalStatus,
    };
  });

  return filters.status
    ? rows.filter((r) => r.renewalStatus.toLowerCase() === filters.status?.toLowerCase())
    : rows;
}

// ─────────────────────────────────────────────────────────────────────────
// 11. Inactive Member Report
// ─────────────────────────────────────────────────────────────────────────

export type InactiveMemberReportFilters = { attendanceThreshold?: string; trailingDays?: string };
export type InactiveMemberReportRow = {
  memberId: string;
  memberName: string;
  planName: string | null;
  expiryDate: Date | null;
  visitsInWindow: number;
  threshold: number;
  trailingDays: number;
};

// No gym-level setting exists for this yet — hardcoded default, noted as a
// fast-follow (add an `inactivityThreshold`/`inactivityTrailingDays` pair to
// GymSettings) rather than something to invent here.
const DEFAULT_INACTIVE_THRESHOLD = 3;
const DEFAULT_INACTIVE_TRAILING_DAYS = 14;

export async function getInactiveMemberReport(
  gymId: string,
  filters: InactiveMemberReportFilters,
): Promise<InactiveMemberReportRow[]> {
  const threshold = Number(filters.attendanceThreshold) || DEFAULT_INACTIVE_THRESHOLD;
  const trailingDays = Number(filters.trailingDays) || DEFAULT_INACTIVE_TRAILING_DAYS;
  const today = new Date();
  const windowStart = new Date(today.getTime() - trailingDays * 86400000);

  const activeMemberships = await db.memberMembership.findMany({
    where: { gymId, status: "ACTIVE", endDate: { gte: today } },
    include: { plan: { select: { name: true } } },
  });
  if (activeMemberships.length === 0) return [];
  const memberIds = activeMemberships.map((m) => m.memberId);

  const [members, attendance] = await Promise.all([
    db.user.findMany({ where: { id: { in: memberIds } }, select: { id: true, name: true } }),
    db.attendanceRecord.groupBy({
      by: ["memberId"],
      where: { gymId, memberId: { in: memberIds }, checkInAt: { gte: windowStart } },
      _count: true,
    }),
  ]);
  const nameMap = new Map(members.map((m) => [m.id, m.name]));
  const visitMap = new Map(attendance.map((a) => [a.memberId, a._count]));

  return activeMemberships
    .filter((m) => (visitMap.get(m.memberId) ?? 0) < threshold)
    .map((m) => ({
      memberId: m.memberId,
      memberName: nameMap.get(m.memberId) ?? "Unknown",
      planName: m.plan.name,
      expiryDate: m.endDate,
      visitsInWindow: visitMap.get(m.memberId) ?? 0,
      threshold,
      trailingDays,
    }));
}

// ─────────────────────────────────────────────────────────────────────────
// 12. Streak Report
// ─────────────────────────────────────────────────────────────────────────

export type StreakReportFilters = { trainerId?: string; minStreak?: string };
export type StreakReportRow = {
  memberId: string;
  memberName: string;
  currentStreak: number;
  longestStreak: number;
  freezesUsed: number;
  badgesEarned: number;
};

export async function getStreakReport(gymId: string, filters: StreakReportFilters): Promise<StreakReportRow[]> {
  let memberIds: string[] | undefined;
  if (filters.trainerId) {
    const assigned = await db.memberProfile.findMany({
      where: { gymId, assignedTrainerId: filters.trainerId },
      select: { userId: true },
    });
    memberIds = assigned.map((m) => m.userId);
    if (memberIds.length === 0) return [];
  }

  const minStreak = Number(filters.minStreak) || 0;
  const streaks = await db.memberStreak.findMany({
    where: { gymId, ...(memberIds ? { memberId: { in: memberIds } } : {}), currentStreak: { gte: minStreak } },
    orderBy: { currentStreak: "desc" },
  });
  if (streaks.length === 0) return [];

  const ids = streaks.map((s) => s.memberId);
  const [members, freezeUsages, badges] = await Promise.all([
    db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
    db.streakFreezeUsage.groupBy({ by: ["memberId"], where: { gymId, memberId: { in: ids } }, _count: true }),
    db.memberBadge.groupBy({ by: ["memberId"], where: { gymId, memberId: { in: ids } }, _count: true }),
  ]);
  const nameMap = new Map(members.map((m) => [m.id, m.name]));
  const freezeMap = new Map(freezeUsages.map((f) => [f.memberId, f._count]));
  const badgeMap = new Map(badges.map((b) => [b.memberId, b._count]));

  return streaks.map((s) => ({
    memberId: s.memberId,
    memberName: nameMap.get(s.memberId) ?? "Unknown",
    currentStreak: s.currentStreak,
    longestStreak: s.longestStreak,
    freezesUsed: freezeMap.get(s.memberId) ?? 0,
    badgesEarned: badgeMap.get(s.memberId) ?? 0,
  }));
}

// ─────────────────────────────────────────────────────────────────────────
// 13. Leaderboard Report
// ─────────────────────────────────────────────────────────────────────────

export type LeaderboardRow = {
  rank: number;
  memberId: string;
  memberName: string;
  currentStreak: number;
  longestStreak: number;
};

export async function getLeaderboardReport(gymId: string): Promise<LeaderboardRow[]> {
  const optedIn = await db.memberProfile.findMany({ where: { gymId, leaderboardOptIn: true }, select: { userId: true } });
  const memberIds = optedIn.map((m) => m.userId);
  if (memberIds.length === 0) return [];

  const streaks = await db.memberStreak.findMany({
    where: { gymId, memberId: { in: memberIds } },
    orderBy: [{ currentStreak: "desc" }, { longestStreak: "desc" }],
  });
  if (streaks.length === 0) return [];

  const members = await db.user.findMany({
    where: { id: { in: streaks.map((s) => s.memberId) } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(members.map((m) => [m.id, m.name]));

  return streaks.map((s, i) => ({
    rank: i + 1,
    memberId: s.memberId,
    memberName: nameMap.get(s.memberId) ?? "Unknown",
    currentStreak: s.currentStreak,
    longestStreak: s.longestStreak,
  }));
}

// ─────────────────────────────────────────────────────────────────────────
// 14. Pending Dues Report
// ─────────────────────────────────────────────────────────────────────────

export type PendingDuesFilters = { daysOverdueMin?: string };
export type PendingDuesRow = {
  invoiceId: string;
  invoiceNumber: string;
  memberName: string;
  amountDue: number;
  daysOverdue: number;
  issuedAt: Date;
  dueDate: Date | null;
};

export async function getPendingDuesReport(gymId: string, filters: PendingDuesFilters): Promise<PendingDuesRow[]> {
  const minDays = Number(filters.daysOverdueMin) || 0;
  const invoices = await db.invoice.findMany({
    where: { gymId, status: { in: ["UNPAID", "PARTIALLY_PAID"] } },
    orderBy: { dueDate: { sort: "asc", nulls: "last" } },
    take: MAX_ROWS,
  });
  if (invoices.length === 0) return [];

  const invoiceIds = invoices.map((i) => i.id);
  const [payments, members] = await Promise.all([
    db.payment.findMany({
      where: { gymId, invoiceId: { in: invoiceIds }, isReversal: false },
      select: { invoiceId: true, amount: true },
    }),
    db.user.findMany({
      where: { id: { in: [...new Set(invoices.map((i) => i.memberId))] } },
      select: { id: true, name: true },
    }),
  ]);
  const nameMap = new Map(members.map((m) => [m.id, m.name]));
  const paidByInvoice = new Map<string, number>();
  for (const p of payments) paidByInvoice.set(p.invoiceId, (paidByInvoice.get(p.invoiceId) ?? 0) + Number(p.amount));

  const today = new Date();
  const rows = invoices.map((inv) => {
    const paid = paidByInvoice.get(inv.id) ?? 0;
    const amountDue = Math.max(0, Number(inv.total) - paid);
    // Overdue is measured against the true due date (falls back to the issue
    // date for legacy rows created before due-date tracking existed).
    const dueRef = inv.dueDate ?? inv.issuedAt;
    const daysOverdue = Math.max(0, Math.round((today.getTime() - dueRef.getTime()) / 86400000));
    return {
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      memberName: nameMap.get(inv.memberId) ?? "Unknown",
      amountDue,
      daysOverdue,
      issuedAt: inv.issuedAt,
      dueDate: inv.dueDate,
    };
  });

  return rows.filter((r) => r.amountDue > 0 && r.daysOverdue >= minDays);
}

// ─────────────────────────────────────────────────────────────────────────
// Analytics / Trends (Overview tab)
// ─────────────────────────────────────────────────────────────────────────

export type MonthlyPoint = { month: string; value: number };

/** Last 6 months of collected revenue (non-reversal payments), bucketed in
 *  JS from a single query rather than 6 separate aggregate round-trips. */
export async function getRevenueTrend(gymId: string): Promise<MonthlyPoint[]> {
  const months = lastNMonths(6);
  const payments = await db.payment.findMany({
    where: { gymId, isReversal: false, paidAt: { gte: months[0].start } },
    select: { amount: true, paidAt: true },
  });
  return months.map(({ start, end, label }) => ({
    month: label,
    value: payments
      .filter((p) => p.paidAt >= start && p.paidAt < end)
      .reduce((sum, p) => sum + Number(p.amount), 0),
  }));
}

export async function getMembershipGrowthTrend(gymId: string): Promise<MonthlyPoint[]> {
  const months = lastNMonths(6);
  const profiles = await db.memberProfile.findMany({
    where: { gymId, joinDate: { gte: months[0].start } },
    select: { joinDate: true },
  });
  return months.map(({ start, end, label }) => ({
    month: label,
    value: profiles.filter((p) => p.joinDate >= start && p.joinDate < end).length,
  }));
}

export type DailyPoint = { date: string; value: number };

/** Last 30 days of check-ins, bucketed by day. */
export async function getAttendanceTrend(gymId: string): Promise<DailyPoint[]> {
  const days = 30;
  const start = startOfDay(new Date(Date.now() - days * 86400000));
  const records = await db.attendanceRecord.findMany({
    where: { gymId, checkInAt: { gte: start } },
    select: { checkInAt: true },
  });

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const r of records) {
    const key = r.checkInAt.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return [...buckets.entries()].map(([date, value]) => ({ date, value }));
}

export type TopTrainerRow = { trainerId: string; name: string; assignedMembers: number };

/** Top 5 trainers by assigned-member count — a simple proxy for "retention
 *  leaderboard" (a true retention-rate ranking is out of scope here; see
 *  getTrainerPerformanceReport for the fuller per-trainer metrics). */
export async function getTopTrainers(gymId: string): Promise<TopTrainerRow[]> {
  const trainers = await db.user.findMany({
    where: { gymId, role: "TRAINER", deletedAt: null },
    select: { id: true, name: true },
  });
  if (trainers.length === 0) return [];
  const counts = await db.memberProfile.groupBy({
    by: ["assignedTrainerId"],
    where: { gymId, assignedTrainerId: { not: null } },
    _count: true,
  });
  const countMap = new Map(counts.map((c) => [c.assignedTrainerId, c._count]));
  return trainers
    .map((t) => ({ trainerId: t.id, name: t.name, assignedMembers: countMap.get(t.id) ?? 0 }))
    .sort((a, b) => b.assignedMembers - a.assignedMembers)
    .slice(0, 5);
}

export type TopMemberStreakRow = { memberId: string; name: string; currentStreak: number };

export async function getTopMembersByStreak(gymId: string): Promise<TopMemberStreakRow[]> {
  const streaks = await db.memberStreak.findMany({
    where: { gymId },
    orderBy: { currentStreak: "desc" },
    take: 5,
  });
  if (streaks.length === 0) return [];
  const members = await db.user.findMany({
    where: { id: { in: streaks.map((s) => s.memberId) } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(members.map((m) => [m.id, m.name]));
  return streaks.map((s) => ({
    memberId: s.memberId,
    name: nameMap.get(s.memberId) ?? "Unknown",
    currentStreak: s.currentStreak,
  }));
}
