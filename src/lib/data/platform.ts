import { db } from "@/lib/db";

export type GymAnalyticsRow = {
  gymId: string;
  gymName: string;
  status: string;
  planName: string;
  members: number;
  trainers: number;
  mrr: number;
};

export type PlatformAnalytics = {
  totals: {
    gyms: number;
    members: number;
    trainers: number;
    monthlyRevenue: number;
    activeSubscriptions: number;
  };
  gyms: GymAnalyticsRow[];
  statusBreakdown: { status: string; count: number }[];
  gymsPerMonth: { label: string; count: number }[];
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Platform-level rollup for the super-admin analytics view.
 *
 *  Deliberately cheap: a handful of aggregate queries (groupBy for the
 *  per-gym user counts) plus one fetch of gym metadata, then JS-side
 *  aggregation for the monthly growth curve — plenty fast at the tens-of-
 *  thousands scale a platform dashboard sees, and avoids string-date SQL
 *  that would tie us to one database flavor.
 */
export async function getPlatformAnalytics(): Promise<PlatformAnalytics> {
  const [gyms, members, trainers, activeSubscriptions, userRows, subRows] = await Promise.all([
    db.gym.findMany({
      select: { id: true, name: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    db.user.count({ where: { role: "MEMBER", deletedAt: null } }),
    db.user.count({ where: { role: "TRAINER", deletedAt: null } }),
    db.gymSubscription.count({ where: { status: "ACTIVE" } }),
    db.user.groupBy({
      by: ["gymId", "role"],
      where: { role: { in: ["MEMBER", "TRAINER"] }, deletedAt: null },
      _count: { _all: true },
    }),
    db.gymSubscription.findMany({
      where: { status: "ACTIVE" },
      select: {
        gymId: true,
        plan: { select: { name: true, priceMonthly: true } },
      },
    }),
  ]);

  const memberCount = new Map<string, number>();
  const trainerCount = new Map<string, number>();
  for (const row of userRows) {
    if (!row.gymId) continue;
    const target = row.role === "MEMBER" ? memberCount : trainerCount;
    target.set(row.gymId, row._count._all);
  }

  const subByGym = new Map<string, { planName: string; mrr: number }>();
  let monthlyRevenue = 0;
  for (const s of subRows) {
    const mrr = Number(s.plan.priceMonthly);
    subByGym.set(s.gymId, { planName: s.plan.name, mrr });
    monthlyRevenue += mrr;
  }

  const statusBreakdown = new Map<string, number>();
  for (const g of gyms) {
    statusBreakdown.set(g.status, (statusBreakdown.get(g.status) ?? 0) + 1);
  }

  // Last 6 calendar months of gym signups.
  const now = new Date();
  const buckets: { label: string; key: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, key: `${d.getFullYear()}-${d.getMonth()}`, count: 0 });
  }
  for (const g of gyms) {
    const d = g.createdAt;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = buckets.find((b) => b.key === key);
    if (bucket) bucket.count += 1;
  }
  const gymsPerMonth = buckets.map(({ label, count }) => ({ label, count }));

  const statusLabels: Record<string, string> = {
    TRIAL: "Trial",
    ACTIVE: "Active",
    SUSPENDED: "Suspended",
    CLOSED: "Closed",
  };

  return {
    totals: {
      gyms: gyms.length,
      members,
      trainers,
      monthlyRevenue,
      activeSubscriptions,
    },
    gyms: gyms.map((g) => ({
      gymId: g.id,
      gymName: g.name,
      status: statusLabels[g.status] ?? g.status,
      planName: subByGym.get(g.id)?.planName ?? "—",
      members: memberCount.get(g.id) ?? 0,
      trainers: trainerCount.get(g.id) ?? 0,
      mrr: subByGym.get(g.id)?.mrr ?? 0,
    })),
    statusBreakdown: [...statusBreakdown.entries()].map(([status, count]) => ({
      status: statusLabels[status] ?? status,
      count,
    })),
    gymsPerMonth,
  };
}
