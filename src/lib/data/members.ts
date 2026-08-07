import "server-only";
import { db } from "@/lib/db";
import { deriveMemberStatus, type DerivedMemberStatus } from "@/lib/member-status";

const PAGE_SIZE = 25;

export type MemberListItem = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  image: string | null;
  status: DerivedMemberStatus;
  planName: string | null;
  expiresAt: Date | null;
  trainerName: string | null;
};

export async function listMembers(params: {
  gymId: string;
  search?: string;
  trainerId?: string;
  page?: number;
}): Promise<{ items: MemberListItem[]; total: number; page: number; totalPages: number }> {
  const page = Math.max(1, params.page ?? 1);
  const where = {
    gymId: params.gymId,
    role: "MEMBER" as const,
    deletedAt: null,
    ...(params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: "insensitive" as const } },
            { phone: { contains: params.search } },
            { email: { contains: params.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(params.trainerId ? { memberProfile: { assignedTrainerId: params.trainerId } } : {}),
  };

  // OPTIMIZATION: Run count in parallel with user query
  const [rows, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        memberProfile: { include: { assignedTrainer: { select: { name: true } } } },
      },
    }),
    db.user.count({ where }),
  ]);

  // Fetch all memberships for users on this page in a single query
  const userIds = rows.map((r) => r.id);
  const memberships = userIds.length > 0
    ? await db.memberMembership.findMany({
        where: { gymId: params.gymId, memberId: { in: userIds } },
        orderBy: { endDate: "desc" },
        include: { plan: { select: { name: true } } },
      })
    : [];

  // Map first (latest) membership for each member
  const latestByMember = new Map<string, (typeof memberships)[number]>();
  for (const m of memberships) {
    if (!latestByMember.has(m.memberId)) latestByMember.set(m.memberId, m);
  }

  const items: MemberListItem[] = rows.map((row) => {
    const latest = latestByMember.get(row.id) ?? null;
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      image: row.image,
      status: deriveMemberStatus(latest),
      planName: latest?.plan.name ?? null,
      expiresAt: latest?.endDate ?? null,
      trainerName: row.memberProfile?.assignedTrainer?.name ?? null,
    };
  });

  return { items, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function listTrainersForGym(gymId: string) {
  return db.user.findMany({
    where: { gymId, role: "TRAINER", deletedAt: null, status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function listActivePlans(gymId: string) {
  return db.membershipPlan.findMany({
    where: { gymId, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

