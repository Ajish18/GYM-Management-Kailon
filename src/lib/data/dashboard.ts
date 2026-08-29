import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// The three dashboard-stat fetchers are wrapped in unstable_cache so the
// shared Next.js data cache serves them between requests — and, crucially,
// during client-side navigation, where every sidebar click otherwise pays
// the full multi-query render against the remote Mumbai Supabase DB (the
// "URL changes but the page sits blank" symptom).
//
// The counters only move when staff act (a check-in, a payment), and those
// actions already revalidatePath() the pages they touch, so a 30s window is
// invisible to users while it eliminates ~8 DB round-trips per dashboard
// render. Keyed by gymId so tenants never share cache entries.
const STATS_REVALIDATE = 30; // seconds

export const getOwnerDashboardStats = unstable_cache(
  async (gymId: string) => {
    const todayStart = startOfToday();
    const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // All 8 queries run in a single parallel batch — over a remote Supabase DB
    // each sequential round-trip costs 30–80ms, so keeping them concurrent is
    // the difference between ~1s and ~150ms of page latency.
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [activeMembers, todayCheckIns, expiringSoon, unpaidInvoices, totalTrainers, paidTowardUnpaid, monthRevenue] =
      await Promise.all([
        db.memberMembership.count({
          where: { gymId, status: "ACTIVE", endDate: { gte: todayStart } },
        }),
        db.attendanceRecord.count({
          where: { gymId, checkInAt: { gte: todayStart } },
        }),
        db.memberMembership.count({
          where: { gymId, status: "ACTIVE", endDate: { gte: todayStart, lte: in7Days } },
        }),
        db.invoice.aggregate({
          where: { gymId, status: { in: ["UNPAID", "PARTIALLY_PAID"] } },
          _sum: { total: true, discountAmount: true },
          _count: true,
        }),
        db.trainerProfile.count({ where: { gymId } }),
        db.payment.aggregate({
          where: { gymId, invoice: { gymId, status: { in: ["UNPAID", "PARTIALLY_PAID"] } } },
          _sum: { amount: true },
        }),
        db.payment.aggregate({
          where: { gymId, paidAt: { gte: monthStart }, isReversal: false },
          _sum: { amount: true },
        }),
      ]);

    const outstanding =
      Number(unpaidInvoices._sum.total ?? 0) - Number(paidTowardUnpaid._sum.amount ?? 0);

    return {
      activeMembers,
      todayCheckIns,
      expiringSoon,
      pendingDuesCount: unpaidInvoices._count,
      pendingDuesAmount: Math.max(0, outstanding),
      totalTrainers,
      monthRevenue: Number(monthRevenue._sum.amount ?? 0),
    };
  },
  ["dashboard-owner"],
  { revalidate: STATS_REVALIDATE },
);

export const getTrainerDashboardStats = unstable_cache(
  async (trainerId: string) => {
    const todayStart = startOfToday();
    const [assignedMembers, activeWorkoutPlans] = await Promise.all([
      db.memberProfile.count({ where: { assignedTrainerId: trainerId } }),
      db.workoutPlan.count({ where: { assignedById: trainerId, status: "ACTIVE" } }),
    ]);
    const unreadMessages = await db.message.count({
      where: {
        conversation: { trainerId },
        readAt: null,
        senderId: { not: trainerId },
      },
    });
    void todayStart;
    return { assignedMembers, activeWorkoutPlans, unreadMessages };
  },
  ["dashboard-trainer"],
  { revalidate: STATS_REVALIDATE },
);

// Cached: member dashboard is lower traffic but still benefits from avoiding
// round-trips on sidebar nav. The `plan.price` Decimal is excluded (page only
// uses `plan.name`) so the cache can serialize the result.
export const getMemberDashboardStats = unstable_cache(
  async (memberId: string) => {
    const [streak, membership, unreadMessages] = await Promise.all([
      db.memberStreak.findUnique({ where: { memberId } }),
      db.memberMembership.findFirst({
        where: { memberId, status: "ACTIVE" },
        orderBy: { endDate: "desc" },
        include: { plan: { select: { id: true, name: true } } },
      }),
      db.message.count({
        where: { conversation: { memberId }, readAt: null, senderId: { not: memberId } },
      }),
    ]);
    return { streak, membership, unreadMessages };
  },
  ["dashboard-member"],
  { revalidate: STATS_REVALIDATE },
);

