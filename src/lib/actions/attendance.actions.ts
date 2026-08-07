"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireGymScope } from "@/lib/auth/guards";
import { deriveMemberStatus } from "@/lib/member-status";
import {
  manualCheckInSchema,
  attendanceIdSchema,
  correctAttendanceSchema,
  vacationRequestSchema,
  vacationDecisionSchema,
  type ManualCheckInInput,
  type AttendanceIdInput,
  type CorrectAttendanceInput,
  type VacationRequestInput,
  type VacationDecisionInput,
} from "@/lib/validations/attendance";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

function membershipBlockReason(status: ReturnType<typeof deriveMemberStatus>): string | null {
  if (status === "active") return null;
  if (status === "frozen") return "Membership is frozen — unfreeze it to check in";
  if (status === "expired") return "Membership expired, renew to check in";
  return "No membership on file — assign a plan before checking in";
}

function revalidateAttendancePages() {
  revalidatePath("/owner/attendance");
  revalidatePath("/reception/attendance");
  revalidatePath("/member");
  revalidatePath("/member/attendance");
}

/** Spec business rule: a member can check in only once per calendar day.
 *  Uses the server's local day, consistent with the rest of the codebase's
 *  date handling (which doesn't yet thread through `gym.timezone`). */
async function hasCheckedInToday(gymId: string, memberId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return db.attendanceRecord.findFirst({
    where: { gymId, memberId, checkInAt: { gte: start, lte: end } },
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Manual check-in/out (Owner + Receptionist, any member in their gym)
// ─────────────────────────────────────────────────────────────────────────

/** Shared check-in path for staff-triggered check-ins (manual or QR). Both
 *  entry points enforce the same membership gating and once-per-day rule, so
 *  they share one implementation rather than drifting apart. */
async function checkInMember(
  gymId: string,
  staffId: string,
  memberId: string,
  method: "MANUAL" | "QR",
): Promise<ActionResult<{ attendanceId: string; memberName: string }>> {
  const member = await db.user.findFirst({ where: { id: memberId, gymId, role: "MEMBER" } });
  if (!member) return { success: false, error: "Member not found" };

  const latestMembership = await db.memberMembership.findFirst({
    where: { gymId, memberId },
    orderBy: { endDate: "desc" },
  });
  const blockReason = membershipBlockReason(deriveMemberStatus(latestMembership));
  if (blockReason) return { success: false, error: blockReason };

  const open = await db.attendanceRecord.findFirst({ where: { gymId, memberId, checkOutAt: null } });
  if (open) return { success: false, error: "Already checked in — check out first" };

  if (await hasCheckedInToday(gymId, memberId)) {
    return { success: false, error: "Already checked in today — one check-in per day" };
  }

  const record = await db.attendanceRecord.create({
    data: { gymId, memberId, checkInAt: new Date(), checkInMethod: method, checkInById: staffId },
  });
  return { success: true, data: { attendanceId: record.id, memberName: member.name } };
}

export async function manualCheckInAction(
  input: ManualCheckInInput,
): Promise<ActionResult<{ attendanceId: string }>> {
  const { user, gymId } = await requireGymScope("GYM_OWNER", "RECEPTIONIST");
  const parsed = manualCheckInSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const result = await checkInMember(gymId, user.id, parsed.data.memberId, "MANUAL");
  if (!result.success) return result;
  revalidateAttendancePages();
  return { success: true, data: { attendanceId: result.data.attendanceId } };
}

export async function qrCheckInAction(input: ManualCheckInInput): Promise<ActionResult<{ memberName: string }>> {
  const { user, gymId } = await requireGymScope("GYM_OWNER", "RECEPTIONIST");
  const parsed = manualCheckInSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid QR code — try scanning again" };
  }
  const result = await checkInMember(gymId, user.id, parsed.data.memberId, "QR");
  if (!result.success) return result;
  revalidateAttendancePages();
  return { success: true, data: { memberName: result.data.memberName } };
}

/** QR check-out: resolve the member's open session and close it. The QR only
 *  encodes the member id, so this finds the open attendance record rather
 *  than taking an attendance id like manualCheckOutAction. */
export async function qrCheckOutAction(input: ManualCheckInInput): Promise<ActionResult<{ memberName: string }>> {
  const { gymId } = await requireGymScope("GYM_OWNER", "RECEPTIONIST");
  const parsed = manualCheckInSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid QR code — try scanning again" };
  }

  const member = await db.user.findFirst({ where: { id: parsed.data.memberId, gymId, role: "MEMBER" } });
  if (!member) return { success: false, error: "Member not found" };

  const record = await db.attendanceRecord.findFirst({
    where: { gymId, memberId: member.id, checkOutAt: null },
    orderBy: { checkInAt: "desc" },
  });
  if (!record) return { success: false, error: "No open session to check out" };

  const checkOutAt = new Date();
  const sessionDurationMinutes = Math.max(
    0,
    Math.round((checkOutAt.getTime() - record.checkInAt.getTime()) / 60000),
  );
  await db.attendanceRecord.update({
    where: { id: record.id },
    data: { checkOutAt, checkOutMethod: "QR", sessionDurationMinutes },
  });

  revalidateAttendancePages();
  return { success: true, data: { memberName: member.name } };
}

export async function manualCheckOutAction(input: AttendanceIdInput): Promise<ActionResult> {
  const { gymId } = await requireGymScope("GYM_OWNER", "RECEPTIONIST");
  const parsed = attendanceIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const record = await db.attendanceRecord.findFirst({
    where: { id: parsed.data.attendanceId, gymId },
  });
  if (!record) return { success: false, error: "Attendance record not found" };
  if (record.checkOutAt) return { success: false, error: "Already checked out" };

  const checkOutAt = new Date();
  const sessionDurationMinutes = Math.max(
    0,
    Math.round((checkOutAt.getTime() - record.checkInAt.getTime()) / 60000),
  );

  await db.attendanceRecord.update({
    where: { id: record.id },
    data: { checkOutAt, checkOutMethod: "MANUAL", sessionDurationMinutes },
  });

  revalidateAttendancePages();
  return { success: true, data: undefined };
}

// ─────────────────────────────────────────────────────────────────────────
// Self check-in/out (Member, self only)
// ─────────────────────────────────────────────────────────────────────────

export async function selfCheckInAction(): Promise<ActionResult<{ attendanceId: string }>> {
  const { user, gymId } = await requireGymScope("MEMBER");

  const settings = await db.gymSettings.findUnique({ where: { gymId } });
  if (settings && !settings.selfCheckinEnabled) {
    return { success: false, error: "Self check-in is turned off at this gym — ask the front desk to check you in" };
  }

  const latestMembership = await db.memberMembership.findFirst({
    where: { gymId, memberId: user.id },
    orderBy: { endDate: "desc" },
  });
  const blockReason = membershipBlockReason(deriveMemberStatus(latestMembership));
  if (blockReason) return { success: false, error: blockReason };

  const open = await db.attendanceRecord.findFirst({
    where: { gymId, memberId: user.id, checkOutAt: null },
  });
  if (open) return { success: false, error: "Already checked in — check out first" };

  if (await hasCheckedInToday(gymId, user.id)) {
    return { success: false, error: "Already checked in today — one check-in per day" };
  }

  const record = await db.attendanceRecord.create({
    data: { gymId, memberId: user.id, checkInAt: new Date(), checkInMethod: "SELF" },
  });

  revalidateAttendancePages();
  return { success: true, data: { attendanceId: record.id } };
}

export async function selfCheckOutAction(): Promise<ActionResult> {
  const { user, gymId } = await requireGymScope("MEMBER");

  const open = await db.attendanceRecord.findFirst({
    where: { gymId, memberId: user.id, checkOutAt: null },
  });
  if (!open) return { success: false, error: "You're not checked in" };

  const checkOutAt = new Date();
  const sessionDurationMinutes = Math.max(
    0,
    Math.round((checkOutAt.getTime() - open.checkInAt.getTime()) / 60000),
  );

  await db.attendanceRecord.update({
    where: { id: open.id },
    data: { checkOutAt, checkOutMethod: "SELF", sessionDurationMinutes },
  });

  revalidateAttendancePages();
  return { success: true, data: undefined };
}

// ─────────────────────────────────────────────────────────────────────────
// Correction (Owner + Receptionist) — audited, like the financial actions
// ─────────────────────────────────────────────────────────────────────────

export async function correctAttendanceAction(input: CorrectAttendanceInput): Promise<ActionResult> {
  const { user, gymId } = await requireGymScope("GYM_OWNER", "RECEPTIONIST");
  const parsed = correctAttendanceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { attendanceId } = parsed.data;
  const checkInAt = new Date(parsed.data.checkInAt);

  const record = await db.attendanceRecord.findFirst({ where: { id: attendanceId, gymId } });
  if (!record) return { success: false, error: "Attendance record not found" };

  const nextCheckOutAt = parsed.data.checkOutAt ? new Date(parsed.data.checkOutAt) : null;
  const sessionDurationMinutes = nextCheckOutAt
    ? Math.max(0, Math.round((nextCheckOutAt.getTime() - checkInAt.getTime()) / 60000))
    : null;

  await db.$transaction(async (tx) => {
    await tx.attendanceRecord.update({
      where: { id: attendanceId },
      data: {
        checkInAt,
        checkOutAt: nextCheckOutAt,
        sessionDurationMinutes,
        autoCheckedOut: nextCheckOutAt ? false : record.autoCheckedOut,
      },
    });
    await tx.auditLog.create({
      data: {
        gymId,
        actorId: user.id,
        action: "attendance.correct",
        targetType: "attendance_record",
        targetId: attendanceId,
        beforeState: { checkInAt: record.checkInAt, checkOutAt: record.checkOutAt },
        afterState: { checkInAt, checkOutAt: nextCheckOutAt },
      },
    });
  });

  revalidateAttendancePages();
  return { success: true, data: undefined };
}

// ─────────────────────────────────────────────────────────────────────────
// Vacation mode
// ─────────────────────────────────────────────────────────────────────────

export async function requestVacationAction(input: VacationRequestInput): Promise<ActionResult> {
  const { user, gymId } = await requireGymScope("MEMBER");
  const parsed = vacationRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const startDate = new Date(parsed.data.startDate);
  const endDate = new Date(parsed.data.endDate);
  const reason = parsed.data.reason || undefined;

  await db.vacationModePeriod.create({
    data: { gymId, memberId: user.id, startDate, endDate, reason, status: "PENDING" },
  });

  revalidateAttendancePages();
  return { success: true, data: undefined };
}

export async function decideVacationAction(input: VacationDecisionInput): Promise<ActionResult> {
  const { user, gymId } = await requireGymScope("GYM_OWNER", "RECEPTIONIST");
  const parsed = vacationDecisionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { periodId, decision } = parsed.data;

  const period = await db.vacationModePeriod.findFirst({ where: { id: periodId, gymId } });
  if (!period) return { success: false, error: "Vacation request not found" };
  if (period.status !== "PENDING") return { success: false, error: "This request was already decided" };

  await db.$transaction(async (tx) => {
    await tx.vacationModePeriod.update({
      where: { id: periodId },
      data: { status: decision, approvedById: user.id },
    });
    await tx.auditLog.create({
      data: {
        gymId,
        actorId: user.id,
        action: decision === "APPROVED" ? "vacation.approve" : "vacation.reject",
        targetType: "vacation_mode_period",
        targetId: periodId,
        beforeState: { status: period.status },
        afterState: { status: decision },
      },
    });
  });

  revalidateAttendancePages();
  return { success: true, data: undefined };
}
