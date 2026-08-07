import { handle, ok, errors } from "@/lib/api/response";
import { requireApiGymScope } from "@/lib/api/guard";
import { db } from "@/lib/db";
import { deriveMemberStatus } from "@/lib/member-status";

/** Member detail — full profile, latest membership + plan, trainer, and
 *  derived status. Owner/reception see any member; trainers only their
 *  assigned members. */
export const GET = handle(async (_req, { params }) => {
  const { user, gymId } = await requireApiGymScope("GYM_OWNER", "RECEPTIONIST", "TRAINER");
  const { id } = await params;

  const where = {
    id,
    gymId,
    role: "MEMBER" as const,
    deletedAt: null,
    ...(user.role === "TRAINER" ? { memberProfile: { is: { assignedTrainerId: user.id } } } : {}),
  };

  const member = await db.user.findFirst({
    where,
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      image: true,
      createdAt: true,
      memberProfile: {
        select: {
          joinDate: true,
          dob: true,
          gender: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
          healthNotes: true,
          unitPreference: true,
          leaderboardOptIn: true,
          assignedTrainer: { select: { id: true, name: true, phone: true } },
        },
      },
    },
  });

  if (!member) throw errors.notFound("Member not found");

  const latestMembership = await db.memberMembership.findFirst({
    where: { gymId, memberId: id },
    orderBy: { endDate: "desc" },
    include: { plan: { select: { id: true, name: true, price: true, durationDays: true } } },
  });

  const lastAttendance = await db.attendanceRecord.findFirst({
    where: { gymId, memberId: id },
    orderBy: { checkInAt: "desc" },
    select: { checkInAt: true, checkOutAt: true, checkInMethod: true },
  });

  return ok({
    id: member.id,
    name: member.name,
    phone: member.phone,
    email: member.email,
    image: member.image,
    profile: member.memberProfile,
    status: deriveMemberStatus(latestMembership),
    membership: latestMembership
      ? {
          plan: latestMembership.plan?.name ?? null,
          startDate: latestMembership.startDate,
          endDate: latestMembership.endDate,
          status: latestMembership.status,
        }
      : null,
    lastAttendance,
  });
});
