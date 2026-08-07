import { handle, paginatedOk, parsePagination } from "@/lib/api/response";
import { requireApiGymScope } from "@/lib/api/guard";
import { db } from "@/lib/db";
import { deriveMemberStatus, type DerivedMemberStatus } from "@/lib/member-status";
import type { UserRole } from "@prisma/client";

/** Member list. Roles: owner/reception/trainer may list all; trainers only
 *  see members assigned to them (assignment scope — see permission matrix).
 *  Search matches name/phone/email. The derived status filter is applied
 *  after fetching since status isn't stored (it's computed from the latest
 *  membership row) — fine at launch scale, mirroring lib/data/members.ts. */
export const GET = handle(async (req) => {
  const { user, gymId } = await requireApiGymScope("GYM_OWNER", "RECEPTIONIST", "TRAINER");
  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const search = url.searchParams.get("search")?.trim().toLowerCase() ?? "";
  const status = url.searchParams.get("status") as DerivedMemberStatus | null;

  const where = {
    gymId,
    role: "MEMBER" as UserRole,
    deletedAt: null,
    ...(user.role === "TRAINER"
      ? { memberProfile: { is: { assignedTrainerId: user.id } } }
      : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, members] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip,
      take,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        image: true,
        memberProfile: { select: { joinDate: true } },
      },
    }),
  ]);

  if (total === 0) return paginatedOk([], 0, page, pageSize);

  // Batched latest-membership lookup — one query, no N+1.
  const ids = members.map((m) => m.id);
  const memberships = await db.memberMembership.findMany({
    where: { gymId, memberId: { in: ids } },
    orderBy: { endDate: "desc" },
    include: { plan: { select: { name: true } } },
  });
  const latestByMember = new Map<string, (typeof memberships)[number]>();
  for (const m of memberships) {
    if (!latestByMember.has(m.memberId)) latestByMember.set(m.memberId, m);
  }

  const rows = members
    .map((m) => {
      const latest = latestByMember.get(m.id) ?? null;
      const derived = deriveMemberStatus(latest);
      return {
        id: m.id,
        name: m.name,
        phone: m.phone,
        email: m.email,
        image: m.image,
        joinedAt: m.memberProfile?.joinDate ?? null,
        status: derived,
        plan: latest?.plan?.name ?? null,
        membershipExpiresAt: latest?.endDate ?? null,
      };
    })
    .filter((r) => !status || r.status === status);

  const filteredTotal = total - (members.length - rows.length);
  return paginatedOk(rows, filteredTotal, page, pageSize);
});
