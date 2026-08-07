import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isCronAuthorized } from "@/lib/auth/cron";
import type { Gym, GymSettings } from "@prisma/client";

export const dynamic = "force-dynamic";

function dateOnly(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isSameDay(a: Date, b: Date) {
  return dateOnly(a).getTime() === dateOnly(b).getTime();
}

function addDays(d: Date, days: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** (a) Auto-closes any AttendanceRecord left open past the gym's
 *  maxSessionHours (docs/12 §12.21). The synthetic checkout time is
 *  check-in + maxSessionHours, not "now" — so sessionDurationMinutes stays
 *  meaningful even if the job is late/delayed. */
async function autoCloseStaleSessions(gymId: string, maxSessionHours: number): Promise<number> {
  const cutoff = new Date(Date.now() - maxSessionHours * 60 * 60 * 1000);
  const stale = await db.attendanceRecord.findMany({
    where: { gymId, checkOutAt: null, checkInAt: { lt: cutoff } },
  });
  if (stale.length === 0) return 0;

  await Promise.all(
    stale.map((r) => {
      const checkOutAt = new Date(r.checkInAt.getTime() + maxSessionHours * 60 * 60 * 1000);
      const sessionDurationMinutes = Math.round((checkOutAt.getTime() - r.checkInAt.getTime()) / 60000);
      return db.attendanceRecord.update({
        where: { id: r.id },
        data: { checkOutAt, checkOutMethod: "AUTO", autoCheckedOut: true, sessionDurationMinutes },
      });
    }),
  );
  return stale.length;
}

type MilestoneBadge = { id: string; days: number };

/** (b) + (c): evaluates every active member's `day` against the gym's streak
 *  rules, then awards any streak-milestone badges crossed. One batched pass
 *  per gym — no per-member N+1 queries. */
async function evaluateStreaksForGym(
  gym: Gym,
  settings: GymSettings,
  day: Date,
): Promise<{ evaluated: number; freezesUsed: number; badgesAwarded: number }> {
  const dayStart = dateOnly(day);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);
  const isFirstOfMonth = dayStart.getDate() === 1;
  const previousDayStart = addDays(dayStart, -1);

  const members = await db.user.findMany({
    where: { gymId: gym.id, role: "MEMBER", deletedAt: null, status: "ACTIVE" },
    select: { id: true, name: true },
  });
  const memberIds = members.map((m) => m.id);
  if (memberIds.length === 0) return { evaluated: 0, freezesUsed: 0, badgesAwarded: 0 };

  const [streaks, approvedVacations, membershipsWithFreezes, attendance, workoutLogs, badges, existingBadges, notificationPrefs] =
    await Promise.all([
      db.memberStreak.findMany({ where: { gymId: gym.id, memberId: { in: memberIds } } }),
      db.vacationModePeriod.findMany({
        where: {
          gymId: gym.id,
          memberId: { in: memberIds },
          status: "APPROVED",
          startDate: { lte: dayEnd },
          endDate: { gte: dayStart },
        },
        select: { memberId: true },
      }),
      db.memberMembership.findMany({
        where: { gymId: gym.id, memberId: { in: memberIds } },
        select: {
          memberId: true,
          freezes: {
            where: { startDate: { lte: dayEnd }, endDate: { gte: dayStart } },
            select: { id: true },
          },
        },
      }),
      db.attendanceRecord.findMany({
        where: { gymId: gym.id, memberId: { in: memberIds }, checkInAt: { gte: dayStart, lte: dayEnd } },
        select: { memberId: true, checkOutAt: true },
      }),
      settings.streakRequiresWorkoutLog
        ? db.workoutLog.findMany({
            where: {
              gymId: gym.id,
              memberId: { in: memberIds },
              logDate: { gte: dayStart, lte: dayEnd },
              status: "COMPLETED",
            },
            select: { memberId: true },
          })
        : Promise.resolve([]),
      db.badge.findMany({ where: { OR: [{ gymId: gym.id }, { gymId: null }] } }),
      db.memberBadge.findMany({
        where: { gymId: gym.id, memberId: { in: memberIds } },
        select: { memberId: true, badgeId: true },
      }),
      db.notificationPreference.findMany({
        where: { userId: { in: memberIds } },
        select: { userId: true, preferences: true },
      }),
    ]);

  const streakByMember = new Map(streaks.map((s) => [s.memberId, s]));
  const vacationMembers = new Set(approvedVacations.map((v) => v.memberId));
  const frozenMembers = new Set(
    membershipsWithFreezes.filter((m) => m.freezes.length > 0).map((m) => m.memberId),
  );

  const attendanceByMember = new Map<string, { checkin: boolean; checkout: boolean }>();
  for (const a of attendance) {
    const cur = attendanceByMember.get(a.memberId) ?? { checkin: false, checkout: false };
    cur.checkin = true;
    if (a.checkOutAt) cur.checkout = true;
    attendanceByMember.set(a.memberId, cur);
  }
  const workoutMembers = new Set(workoutLogs.map((w) => w.memberId));

  const milestoneBadges: MilestoneBadge[] = badges.flatMap((b) => {
    const criteria = b.criteria as { type?: string; days?: number } | null;
    if (criteria?.type === "streak_milestone" && typeof criteria.days === "number") {
      return [{ id: b.id, days: criteria.days }];
    }
    return [];
  });
  const awardedKeys = new Set(existingBadges.map((b) => `${b.memberId}:${b.badgeId}`));
  const memberNameById = new Map(members.map((m) => [m.id, m.name ?? "You"]));
  const badgeNameById = new Map(badges.map((b) => [b.id, b.name]));
  const prefsByMember = new Map(
    notificationPrefs.map((p) => [p.userId, p.preferences as Record<string, unknown> | undefined]),
  );
  const isEnabled = (memberId: string, type: string): boolean => {
    const prefs = prefsByMember.get(memberId);
    if (!prefs) return true;
    return prefs[type] !== false;
  };

  const streakOps: Promise<unknown>[] = [];
  const freezeUsageOps: Promise<unknown>[] = [];
  const badgeOps: Promise<unknown>[] = [];
  const notificationOps: Promise<unknown>[] = [];
  let evaluated = 0;
  let freezesUsed = 0;
  let badgesAwarded = 0;

  for (const memberId of memberIds) {
    // A membership freeze or approved vacation covering this date skips
    // evaluation entirely — neither breaks nor accrues (docs/12 §12.21).
    if (vacationMembers.has(memberId) || frozenMembers.has(memberId)) continue;

    const streak = streakByMember.get(memberId);
    if (!streak) continue; // no streak row yet (shouldn't happen post-creation, but don't crash the job)
    // Idempotency: if this member was already credited for the evaluated day,
    // skip. Without this, a scheduler retry or overlapping run recomputes
    // `wasContinuous=false` and resets every streak in the gym to 1.
    if (streak.lastCreditDate && isSameDay(streak.lastCreditDate, dayStart)) continue;
    evaluated++;

    const activity = attendanceByMember.get(memberId);
    const satisfied =
      (!settings.streakRequiresCheckin || !!activity?.checkin) &&
      (!settings.streakRequiresWorkoutLog || workoutMembers.has(memberId)) &&
      (!settings.streakRequiresCheckout || !!activity?.checkout);

    const wasContinuous = !!streak.lastCreditDate && isSameDay(streak.lastCreditDate, previousDayStart);
    const monthChanged =
      !streak.lastCreditDate ||
      streak.lastCreditDate.getMonth() !== dayStart.getMonth() ||
      streak.lastCreditDate.getFullYear() !== dayStart.getFullYear();

    let { currentStreak, longestStreak, currentMonthStreak, lastCreditDate } = streak;
    // Freeze allowance replenishes at the start of each calendar month.
    let freezesRemaining = isFirstOfMonth ? settings.streakFreezesPerMonth : streak.streakFreezesRemaining;

    if (satisfied) {
      currentStreak = wasContinuous ? currentStreak + 1 : 1;
      longestStreak = Math.max(longestStreak, currentStreak);
      currentMonthStreak = monthChanged ? 1 : currentMonthStreak + 1;
      lastCreditDate = dayStart;
    } else if (freezesRemaining > 0) {
      // Freeze protects continuity: the streak neither grows nor breaks.
      freezesRemaining -= 1;
      freezesUsed++;
      lastCreditDate = dayStart;
      freezeUsageOps.push(
        db.streakFreezeUsage
          .create({ data: { gymId: gym.id, memberId, usedOnDate: dayStart } })
          .catch(() => null), // unique [memberId, usedOnDate] guards a re-run of the same day
      );
    } else {
      currentStreak = 0;
      currentMonthStreak = monthChanged ? 0 : currentMonthStreak;
    }

    streakOps.push(
      db.memberStreak.update({
        where: { memberId },
        data: { currentStreak, longestStreak, currentMonthStreak, lastCreditDate, streakFreezesRemaining: freezesRemaining },
      }),
    );

    for (const badge of milestoneBadges) {
      const key = `${memberId}:${badge.id}`;
      if (currentStreak >= badge.days && !awardedKeys.has(key)) {
        awardedKeys.add(key);
        badgesAwarded++;
        badgeOps.push(
          db.memberBadge
            .create({ data: { gymId: gym.id, memberId, badgeId: badge.id } })
            .catch(() => null), // unique [memberId, badgeId] guards a re-run
        );

        // STREAK_MILESTONE in-app notification (docs/09 §10.15) — fires
        // alongside the badge award, honouring the member's opt-out.
        if (isEnabled(memberId, "STREAK_MILESTONE")) {
          notificationOps.push(
            db.notification
              .create({
                data: {
                  gymId: gym.id,
                  userId: memberId,
                  type: "STREAK_MILESTONE",
                  title: `${badge.days}-day streak!`,
                  body: `${memberNameById.get(memberId) ?? "You"} hit a ${badge.days}-day streak — "${
                    badgeNameById.get(badge.id) ?? "milestone"
                  }" unlocked. Keep it going!`,
                  relatedEntityType: "Badge",
                  relatedEntityId: badge.id,
                },
              })
              .catch(() => null),
          );
        }
      }
    }
  }

  await Promise.all([...streakOps, ...freezeUsageOps, ...badgeOps, ...notificationOps]);
  return { evaluated, freezesUsed, badgesAwarded };
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const evaluatedDay = dateOnly(addDays(new Date(), -1));

  const gyms = await db.gym.findMany();
  const results: Array<{
    gymId: string;
    autoClosed?: number;
    evaluated?: number;
    freezesUsed?: number;
    badgesAwarded?: number;
    skipped?: string;
    error?: string;
  }> = [];
  let anyFailed = false;

  // Each gym is isolated in its own try/catch so one malformed gym or a
  // transient DB blip doesn't abort the run for every other gym. If any gym
  // failed we return 500 so the scheduler retries — safe now that the
  // per-member idempotency guard makes re-runs a no-op.
  for (const gym of gyms) {
    try {
      const settings = await db.gymSettings.findUnique({ where: { gymId: gym.id } });
      if (!settings) {
        results.push({ gymId: gym.id, skipped: "no GymSettings row" });
        continue;
      }

      const autoClosed = await autoCloseStaleSessions(gym.id, settings.maxSessionHours);
      const { evaluated, freezesUsed, badgesAwarded } = await evaluateStreaksForGym(gym, settings, evaluatedDay);
      results.push({ gymId: gym.id, autoClosed, evaluated, freezesUsed, badgesAwarded });
    } catch (err) {
      anyFailed = true;
      results.push({ gymId: gym.id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json(
    {
      ok: !anyFailed,
      ranAt: new Date().toISOString(),
      evaluatedDate: evaluatedDay.toISOString().slice(0, 10),
      gyms: results,
    },
    { status: anyFailed ? 500 : 200 },
  );
}
