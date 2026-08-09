import "server-only";
import { unstable_cache } from "next/cache";
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

// The members page is the single most-visited screen, and every sidebar
// click to it otherwise re-runs the full 3-round-trip render against the
// remote Supabase DB. Wrapping it in unstable_cache lets the shared data
// cache serve repeat visits instantly. A 15s window keeps registrations/
// renewals fresh enough on their own, and the member mutations already call
// revalidatePath("/owner/members" | "/reception/members"), which clears the
// cached entries the moment someone registers, renews, or deletes a member.
export const listMembers = unstable_cache(
  async (params: {
    gymId: string;
    search?: string;
    trainerId?: string;
    page?: number;
  }): Promise<{ items: MemberListItem[]; total: number; page: number; totalPages: number }> => {
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
  },
  ["members-list"],
  { revalidate: 15 },
);

export const listTrainersForGym = unstable_cache(
  async (gymId: string) => {
    return db.user.findMany({
      where: { gymId, role: "TRAINER", deletedAt: null, status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  },
  ["members-trainers"],
  { revalidate: 60 },
);

export type ActivePlan = {
  id: string;
  name: string;
  price: number;
  durationDays: number;
};

// Returns plain, serializable objects — NOT raw Prisma models. The raw
// model carries a `Decimal` price object, which React throws on when it's
// passed from a Server Component to a Client Component ("Only plain objects
// can be passed to Client Components... Decimal objects are not supported").
// Plans change rarely (memberships.actions revalidates /owner/memberships),
// so 60s caching removes a round-trip from every members/staff page render.
export const listActivePlans = unstable_cache(
  async (gymId: string): Promise<ActivePlan[]> => {
    const plans = await db.membershipPlan.findMany({
      where: { gymId, isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return plans.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price.toNumber(),
      durationDays: p.durationDays,
    }));
  },
  ["plans-active"],
  { revalidate: 60 },
);

