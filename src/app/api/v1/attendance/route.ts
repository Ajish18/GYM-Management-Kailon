import { handle, paginatedOk, parsePagination } from "@/lib/api/response";
import { requireApiGymScope } from "@/lib/api/guard";
import { db } from "@/lib/db";

/** Attendance records, newest first. Owner/reception/trainer see the gym's
 *  records (optionally filtered to one member via ?memberId); members only
 *  ever see their own. Supports ?from=YYYY-MM-DD&to=YYYY-MM-DD. */
export const GET = handle(async (req) => {
  const { user, gymId } = await requireApiGymScope("GYM_OWNER", "RECEPTIONIST", "TRAINER", "MEMBER");
  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);

  const memberIdParam = url.searchParams.get("memberId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  // Members always see their own records; staff may optionally narrow to a
  // single member. Building the memberId filter conditionally keeps null out
  // of the Prisma where object.
  const scopedMemberId = user.role === "MEMBER" ? user.id : memberIdParam;

  const where = {
    gymId,
    ...(scopedMemberId ? { memberId: scopedMemberId } : {}),
    ...(from ? { checkInAt: { gte: new Date(from) } } : {}),
    ...(to ? { checkInAt: { lte: new Date(`${to}T23:59:59.999`) } } : {}),
  };

  const [total, records] = await Promise.all([
    db.attendanceRecord.count({ where }),
    db.attendanceRecord.findMany({
      where,
      orderBy: { checkInAt: "desc" },
      skip,
      take,
    }),
  ]);

  // Batch-resolve member names — AttendanceRecord has no `member` relation
  // (only checkInBy), so a single query keeps this O(records) not O(records²).
  const memberIds = [...new Set(records.map((r) => r.memberId))];
  const nameById = new Map(
    (await db.user.findMany({ where: { id: { in: memberIds } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]),
  );

  return paginatedOk(
    records.map((r) => ({
      id: r.id,
      memberId: r.memberId,
      memberName: nameById.get(r.memberId) ?? "Unknown",
      checkInAt: r.checkInAt,
      checkInMethod: r.checkInMethod,
      checkOutAt: r.checkOutAt,
      sessionDurationMinutes: r.sessionDurationMinutes,
      autoCheckedOut: r.autoCheckedOut,
    })),
    total,
    page,
    pageSize,
  );
});
