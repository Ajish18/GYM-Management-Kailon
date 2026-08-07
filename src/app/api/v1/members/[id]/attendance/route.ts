import { handle, ok, errors } from "@/lib/api/response";
import { requireApiGymScope } from "@/lib/api/guard";
import { db } from "@/lib/db";
import { deriveMemberStatus } from "@/lib/member-status";
import { z } from "zod";

const bodySchema = z.object({
  action: z.enum(["check-in", "check-out"]),
});

function membershipBlockReason(status: ReturnType<typeof deriveMemberStatus>): string | null {
  if (status === "active") return null;
  if (status === "frozen") return "Membership is frozen — unfreeze it to check in";
  if (status === "expired") return "Membership expired, renew to check in";
  return "No membership on file — assign a plan before checking in";
}

async function hasCheckedInToday(gymId: string, memberId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return db.attendanceRecord.findFirst({
    where: { gymId, memberId, checkInAt: { gte: start, lte: end } },
  });
}

/** Check a member in or out (QR/kiosk friendly). Business rules mirror the
 *  server actions in lib/actions/attendance.actions.ts. */
export const POST = handle(async (req, { params }) => {
  const { user, gymId } = await requireApiGymScope("GYM_OWNER", "RECEPTIONIST");
  const { id } = await params;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    throw errors.validation(parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })));
  }
  const { action } = parsed.data;

  const member = await db.user.findFirst({ where: { id, gymId, role: "MEMBER" }, select: { id: true, name: true } });
  if (!member) throw errors.notFound("Member not found");

  if (action === "check-out") {
    const record = await db.attendanceRecord.findFirst({
      where: { gymId, memberId: member.id, checkOutAt: null },
      orderBy: { checkInAt: "desc" },
    });
    if (!record) throw errors.conflict("No open session to check out");

    const checkOutAt = new Date();
    const sessionDurationMinutes = Math.max(
      0,
      Math.round((checkOutAt.getTime() - record.checkInAt.getTime()) / 60000),
    );
    await db.attendanceRecord.update({
      where: { id: record.id },
      data: { checkOutAt, checkOutMethod: "QR", sessionDurationMinutes },
    });
    return ok({ id: record.id, memberName: member.name, action: "checked-out", checkOutAt });
  }

  // check-in
  const latestMembership = await db.memberMembership.findFirst({
    where: { gymId, memberId: member.id },
    orderBy: { endDate: "desc" },
  });
  const blockReason = membershipBlockReason(deriveMemberStatus(latestMembership));
  if (blockReason) throw errors.conflict(blockReason);

  const open = await db.attendanceRecord.findFirst({ where: { gymId, memberId: member.id, checkOutAt: null } });
  if (open) throw errors.conflict("Already checked in — check out first");

  if (await hasCheckedInToday(gymId, member.id)) {
    throw errors.conflict("Already checked in today — one check-in per day");
  }

  const record = await db.attendanceRecord.create({
    data: { gymId, memberId: member.id, checkInAt: new Date(), checkInMethod: "QR", checkInById: user.id },
  });
  return ok({ id: record.id, memberName: member.name, action: "checked-in", checkInAt: record.checkInAt });
});
