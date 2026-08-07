import "server-only";
import { db } from "@/lib/db";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getOwnerDashboardStats(gymId: string) {
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
}

export async function getTrainerDashboardStats(trainerId: string) {
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
}

export async function getMemberDashboardStats(memberId: string) {
  const [streak, membership, unreadMessages] = await Promise.all([
    db.memberStreak.findUnique({ where: { memberId } }),
    db.memberMembership.findFirst({
      where: { memberId, status: "ACTIVE" },
      orderBy: { endDate: "desc" },
      include: { plan: true },
    }),
    db.message.count({
      where: { conversation: { memberId }, readAt: null, senderId: { not: memberId } },
    }),
  ]);
  return { streak, membership, unreadMessages };
}

