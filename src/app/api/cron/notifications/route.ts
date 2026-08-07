import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isCronAuthorized } from "@/lib/auth/cron";
import type { NotificationType } from "@prisma/client";

/**
 * Nightly notification-generation job.
 *
 * No "notify N days before expiry" setting exists on GymSettings yet, so
 * this hardcodes a 7-day window — candidate future field, e.g.
 * `GymSettings.expiryNotifyDays`.
 *
 * "Today" is computed in UTC (not each gym's own `Gym.timezone`) — good
 * enough for a nightly batch pre-launch, but a gym far from UTC could see
 * its birthday/expiry notifications land a day off. Follow-up: bucket by
 * gym timezone once this matters.
 *
 * Scope: EXPIRY, FEE_DUE, BIRTHDAY, plus the daily reminders
 * ATTENDANCE_REMINDER, WORKOUT_REMINDER, DIET_REMINDER.
 *
 * The three reminder types are "you haven't done X today" nudges, so they're
 * only meaningful if this job runs in the evening — schedule it late in the
 * day (e.g. 18:00 UTC) or members see them at midnight before anyone has
 * checked in.
 *
 * Dedup rule (docs/12 §12.16): (userId, type, relatedEntityId, date) must
 * never double-fire. There's no unique DB constraint for this tuple, only
 * an index — enforced here with a `findFirst` check before every `create`.
 */

const EXPIRY_WINDOW_DAYS = 7;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function isEnabled(preferences: Record<string, unknown> | undefined, type: NotificationType): boolean {
  if (!preferences) return true;
  const value = preferences[type];
  return value !== false;
}

async function getPreferenceMap(userIds: string[]): Promise<Map<string, Record<string, unknown>>> {
  const uniqueIds = [...new Set(userIds)];
  if (uniqueIds.length === 0) return new Map();
  const rows = await db.notificationPreference.findMany({
    where: { userId: { in: uniqueIds } },
    select: { userId: true, preferences: true },
  });
  return new Map(rows.map((row) => [row.userId, row.preferences as Record<string, unknown>]));
}

async function alreadyNotifiedToday(
  userId: string,
  type: NotificationType,
  relatedEntityId: string,
  since: Date,
): Promise<boolean> {
  const existing = await db.notification.findFirst({
    where: { userId, type, relatedEntityId, createdAt: { gte: since } },
    select: { id: true },
  });
  return existing !== null;
}

export async function GET(request: Request) {
  // Fail-closed: the endpoint 401s unless Authorization: Bearer <CRON_SECRET>
  // is present. See src/lib/auth/cron.ts — a missing CRON_SECRET is a config
  // error, not an excuse to run open.
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
  const today = startOfUtcDay(new Date());
  const windowEnd = addDays(today, EXPIRY_WINDOW_DAYS);
  const todayMonth = today.getUTCMonth();
  const todayDate = today.getUTCDate();

  let expiryCreated = 0;
  let feeDueCreated = 0;
  let birthdayCreated = 0;
  let attendanceCreated = 0;
  let workoutCreated = 0;
  let dietCreated = 0;

  // MemberMembership/Invoice only carry gymId/memberId as plain scalar FKs
  // (no `gym`/`member` relation declared on those models), so gym-status
  // and member-status scoping has to happen via this precomputed id set
  // rather than a nested `where`.
  const activeGyms = await db.gym.findMany({
    where: { status: { not: "SUSPENDED" } },
    select: { id: true, currency: true },
  });
  const activeGymIds = activeGyms.map((g) => g.id);
  const currencyByGym = new Map(activeGyms.map((g) => [g.id, g.currency ?? "INR"]));
  const activeMembers = await db.user.findMany({
    where: { role: "MEMBER", status: "ACTIVE", deletedAt: null, gymId: { in: activeGymIds } },
    select: { id: true, gymId: true },
  });
  const activeMemberIds = activeMembers.map((m) => m.id);
  const gymIdByMember = new Map(activeMembers.map((m) => [m.id, m.gymId]));

  // ── EXPIRY: memberships ending within the window ─────────────────────
  const expiringMemberships = await db.memberMembership.findMany({
    where: {
      status: "ACTIVE",
      endDate: { gte: today, lte: windowEnd },
      memberId: { in: activeMemberIds },
    },
    select: {
      id: true,
      gymId: true,
      memberId: true,
      endDate: true,
      plan: { select: { name: true } },
    },
  });
  const expiryPrefs = await getPreferenceMap(expiringMemberships.map((m) => m.memberId));

  for (const membership of expiringMemberships) {
    if (!isEnabled(expiryPrefs.get(membership.memberId), "EXPIRY")) continue;
    if (await alreadyNotifiedToday(membership.memberId, "EXPIRY", membership.id, today)) continue;

    const daysLeft = Math.round((membership.endDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
    const body =
      daysLeft <= 0
        ? `Your ${membership.plan.name} membership expires today.`
        : `Your ${membership.plan.name} membership expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`;

    await db.notification.create({
      data: {
        gymId: membership.gymId,
        userId: membership.memberId,
        type: "EXPIRY",
        title: "Membership expiring soon",
        body,
        relatedEntityType: "MemberMembership",
        relatedEntityId: membership.id,
      },
    });
    expiryCreated++;
  }

  // ── FEE_DUE: unpaid / partially paid invoices ────────────────────────
  const unpaidInvoices = await db.invoice.findMany({
    where: {
      status: { in: ["UNPAID", "PARTIALLY_PAID"] },
      memberId: { in: activeMemberIds },
    },
    select: { id: true, gymId: true, memberId: true, total: true, invoiceNumber: true, status: true },
  });
  const feePrefs = await getPreferenceMap(unpaidInvoices.map((i) => i.memberId));

  for (const invoice of unpaidInvoices) {
    if (!isEnabled(feePrefs.get(invoice.memberId), "FEE_DUE")) continue;
    if (await alreadyNotifiedToday(invoice.memberId, "FEE_DUE", invoice.id, today)) continue;

    const statusLabel = invoice.status === "PARTIALLY_PAID" ? "partially paid" : "unpaid";
    const currency = currencyByGym.get(invoice.gymId) ?? "INR";
    const amount = new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(
      Number(invoice.total),
    );
    await db.notification.create({
      data: {
        gymId: invoice.gymId,
        userId: invoice.memberId,
        type: "FEE_DUE",
        title: "Payment due",
        body: `Invoice ${invoice.invoiceNumber} for ${amount} is ${statusLabel}.`,
        relatedEntityType: "Invoice",
        relatedEntityId: invoice.id,
      },
    });
    feeDueCreated++;
  }

  // ── BIRTHDAY: member profiles whose dob month/day matches today ─────
  const profilesWithDob = await db.memberProfile.findMany({
    where: {
      dob: { not: null },
      userId: { in: activeMemberIds },
    },
    select: { userId: true, gymId: true, dob: true, user: { select: { name: true } } },
  });
  const birthdayProfiles = profilesWithDob.filter(
    (profile) => profile.dob!.getUTCMonth() === todayMonth && profile.dob!.getUTCDate() === todayDate,
  );
  const birthdayPrefs = await getPreferenceMap(birthdayProfiles.map((p) => p.userId));

  for (const profile of birthdayProfiles) {
    if (!isEnabled(birthdayPrefs.get(profile.userId), "BIRTHDAY")) continue;
    if (await alreadyNotifiedToday(profile.userId, "BIRTHDAY", profile.userId, today)) continue;

    await db.notification.create({
      data: {
        gymId: profile.gymId,
        userId: profile.userId,
        type: "BIRTHDAY",
        title: "Happy birthday!",
        body: `Happy birthday, ${profile.user.name}! Wishing you a great year ahead from all of us at the gym.`,
        relatedEntityType: "MemberProfile",
        relatedEntityId: profile.userId,
      },
    });
    birthdayCreated++;
  }

  // ── Daily reminders: ATTENDANCE / WORKOUT / DIET ─────────────────────
  // Nightly nudges for active members who haven't done the activity today.
  // relatedEntityId is the ISO date key, so each type fires at most once per
  // member per day.
  const [attendanceToday, workoutLogsToday, activeWorkoutPlans, activeDietPlans] = await Promise.all([
    db.attendanceRecord.findMany({
      where: { memberId: { in: activeMemberIds }, checkInAt: { gte: today, lt: addDays(today, 1) } },
      select: { memberId: true },
    }),
    db.workoutLog.findMany({
      where: {
        memberId: { in: activeMemberIds },
        logDate: { gte: today, lte: addDays(today, 1) },
        status: "COMPLETED",
      },
      select: { memberId: true },
    }),
    db.workoutPlan.findMany({
      where: { memberId: { in: activeMemberIds }, status: "ACTIVE" },
      select: { memberId: true },
    }),
    db.dietPlan.findMany({
      where: { memberId: { in: activeMemberIds }, status: "ACTIVE" },
      select: { memberId: true },
    }),
  ]);
  const checkedInToday = new Set(attendanceToday.map((a) => a.memberId));
  const loggedWorkoutToday = new Set(workoutLogsToday.map((w) => w.memberId));
  const hasWorkoutPlan = new Set(activeWorkoutPlans.map((w) => w.memberId));
  const hasDietPlan = new Set(activeDietPlans.map((d) => d.memberId));

  const reminderPrefs = await getPreferenceMap(activeMemberIds);
  const dateKey = today.toISOString().slice(0, 10);

  // Only generate the "haven't done X today" nudges once the day is mostly
  // over (after 12:00 UTC) — running the job early would notify every member
  // before anyone has had a chance to check in. EXPIRY/FEE_DUE/BIRTHDAY above
  // are forward-looking and always run.
  const remindersDue = new Date().getUTCHours() >= 12;

  const attendanceTargets = activeMemberIds.filter((id) => !checkedInToday.has(id));
  for (const memberId of attendanceTargets) {
    if (!remindersDue) break;
    if (!isEnabled(reminderPrefs.get(memberId), "ATTENDANCE_REMINDER")) continue;
    if (await alreadyNotifiedToday(memberId, "ATTENDANCE_REMINDER", dateKey, today)) continue;

    await db.notification.create({
      data: {
        gymId: gymIdByMember.get(memberId)!,
        userId: memberId,
        type: "ATTENDANCE_REMINDER",
        title: "Haven't checked in today",
        body: "You haven't checked in today — a quick visit keeps your streak alive!",
        relatedEntityType: "date",
        relatedEntityId: dateKey,
      },
    });
    attendanceCreated++;
  }

  const workoutTargets = activeMemberIds.filter(
    (id) => hasWorkoutPlan.has(id) && !loggedWorkoutToday.has(id),
  );
  for (const memberId of workoutTargets) {
    if (!remindersDue) break;
    if (!isEnabled(reminderPrefs.get(memberId), "WORKOUT_REMINDER")) continue;
    if (await alreadyNotifiedToday(memberId, "WORKOUT_REMINDER", dateKey, today)) continue;

    await db.notification.create({
      data: {
        gymId: gymIdByMember.get(memberId)!,
        userId: memberId,
        type: "WORKOUT_REMINDER",
        title: "Workout reminder",
        body: "You still have a workout on your plan for today — don't miss it!",
        relatedEntityType: "date",
        relatedEntityId: dateKey,
      },
    });
    workoutCreated++;
  }

  const dietTargets = activeMemberIds.filter((id) => hasDietPlan.has(id));
  for (const memberId of dietTargets) {
    if (!remindersDue) break;
    if (!isEnabled(reminderPrefs.get(memberId), "DIET_REMINDER")) continue;
    if (await alreadyNotifiedToday(memberId, "DIET_REMINDER", dateKey, today)) continue;

    await db.notification.create({
      data: {
        gymId: gymIdByMember.get(memberId)!,
        userId: memberId,
        type: "DIET_REMINDER",
        title: "Stay on your diet plan",
        body: "A quick reminder to check today's meals on your diet plan and stay on track.",
        relatedEntityType: "date",
        relatedEntityId: dateKey,
      },
    });
    dietCreated++;
  }

    return NextResponse.json({
      success: true,
      created: {
        expiry: expiryCreated,
        feeDue: feeDueCreated,
        birthday: birthdayCreated,
        attendanceReminder: attendanceCreated,
        workoutReminder: workoutCreated,
        dietReminder: dietCreated,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
