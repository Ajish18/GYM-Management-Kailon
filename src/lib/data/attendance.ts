import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { deriveMemberStatus, type DerivedMemberStatus } from "@/lib/member-status";

const PAGE_SIZE = 30;

// The reception/owner attendance screens are high-traffic and every visit
// re-ran their 2–3 query renders against the remote DB. These get short
// data-cache windows (10s) — short enough that live check-ins still show up
// almost immediately (and attendance actions revalidatePath the pages on
// every check-in/out anyway), while removing the round-trips from repeat
// visits and sidebar navigation.
const ATTENDANCE_REVALIDATE = 10; // seconds

export type AttendanceRange = "day" | "week" | "month";

/** Inclusive [start, end] bounds for the given range, anchored on `reference`
 *  (defaults to now). Week starts Sunday, month starts on the 1st. */
export function getRangeBounds(range: AttendanceRange, reference: Date = new Date()) {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  if (range === "week") {
    start.setDate(start.getDate() - start.getDay());
  } else if (range === "month") {
    start.setDate(1);
  }
  const end = new Date(reference);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// ─────────────────────────────────────────────────────────────────────────
// Check-in roster / open sessions (manual check-in panel)
// ─────────────────────────────────────────────────────────────────────────

export type CheckinRosterItem = {
  id: string;
  name: string;
  phone: string | null;
  status: DerivedMemberStatus;
};

/** Full member roster for the manual check-in panel's search-and-pick UI.
 *  Gym rosters at launch scale are small enough to fetch in one page — if
 *  that stops being true, swap this for a debounced server-action search. */
export const listCheckinRoster = unstable_cache(
  async (gymId: string): Promise<CheckinRosterItem[]> => {
    const members = await db.user.findMany({
      where: { gymId, role: "MEMBER", deletedAt: null },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
    });
    if (members.length === 0) return [];

    const memberships = await db.memberMembership.findMany({
      where: { gymId, memberId: { in: members.map((m) => m.id) } },
      orderBy: { endDate: "desc" },
    });
    const latestByMember = new Map<string, (typeof memberships)[number]>();
    for (const m of memberships) {
      if (!latestByMember.has(m.memberId)) latestByMember.set(m.memberId, m);
    }

    return members.map((m) => ({
      id: m.id,
      name: m.name,
      phone: m.phone,
      status: deriveMemberStatus(latestByMember.get(m.id) ?? null),
    }));
  },
  ["attendance-roster"],
  { revalidate: ATTENDANCE_REVALIDATE },
);

export type OpenSessionItem = {
  id: string;
  memberId: string;
  memberName: string;
  checkInAt: Date;
  checkInMethod: string;
};

export const listOpenSessions = unstable_cache(
  async (gymId: string): Promise<OpenSessionItem[]> => {
    const records = await db.attendanceRecord.findMany({
      where: { gymId, checkOutAt: null },
      orderBy: { checkInAt: "desc" },
    });
    if (records.length === 0) return [];

    const members = await db.user.findMany({
      where: { id: { in: [...new Set(records.map((r) => r.memberId))] } },
      select: { id: true, name: true },
    });
    const nameById = new Map(members.map((m) => [m.id, m.name]));

    return records.map((r) => ({
      id: r.id,
      memberId: r.memberId,
      memberName: nameById.get(r.memberId) ?? "Unknown member",
      checkInAt: r.checkInAt,
      checkInMethod: r.checkInMethod,
    }));
  },
  ["attendance-open"],
  { revalidate: ATTENDANCE_REVALIDATE },
);

export async function getOpenSessionForMember(gymId: string, memberId: string) {
  return db.attendanceRecord.findFirst({ where: { gymId, memberId, checkOutAt: null } });
}

export async function getLatestMembership(gymId: string, memberId: string) {
  return db.memberMembership.findFirst({ where: { gymId, memberId }, orderBy: { endDate: "desc" } });
}

// ─────────────────────────────────────────────────────────────────────────
// Attendance list (daily/weekly/monthly views, owner/reception)
// ─────────────────────────────────────────────────────────────────────────

export type AttendanceListItem = {
  id: string;
  memberId: string;
  memberName: string;
  checkInAt: Date;
  checkInMethod: string;
  checkOutAt: Date | null;
  checkOutMethod: string | null;
  autoCheckedOut: boolean;
  sessionDurationMinutes: number | null;
};

export const listAttendance = unstable_cache(
  async (params: {
    gymId: string;
    start: Date;
    end: Date;
    memberId?: string;
    page?: number;
  }): Promise<{ items: AttendanceListItem[]; total: number; page: number; totalPages: number }> => {
    const page = Math.max(1, params.page ?? 1);
    const where = {
      gymId: params.gymId,
      checkInAt: { gte: params.start, lte: params.end },
      ...(params.memberId ? { memberId: params.memberId } : {}),
    };

    const [rows, total] = await Promise.all([
      db.attendanceRecord.findMany({
        where,
        orderBy: { checkInAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      db.attendanceRecord.count({ where }),
    ]);

    const memberIds = [...new Set(rows.map((r) => r.memberId))];
    const members = memberIds.length
      ? await db.user.findMany({ where: { id: { in: memberIds } }, select: { id: true, name: true } })
      : [];
    const nameById = new Map(members.map((m) => [m.id, m.name]));

    const items: AttendanceListItem[] = rows.map((r) => ({
      id: r.id,
      memberId: r.memberId,
      memberName: nameById.get(r.memberId) ?? "Unknown member",
      checkInAt: r.checkInAt,
      checkInMethod: r.checkInMethod,
      checkOutAt: r.checkOutAt,
      checkOutMethod: r.checkOutMethod,
      autoCheckedOut: r.autoCheckedOut,
      sessionDurationMinutes: r.sessionDurationMinutes,
    }));

    return { items, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
  },
  ["attendance-list"],
  { revalidate: ATTENDANCE_REVALIDATE },
);

// ─────────────────────────────────────────────────────────────────────────
// Attendance stats (daily/monthly rollup + percentage)
// ─────────────────────────────────────────────────────────────────────────

export type AttendanceStats = {
  activeMembers: number;
  visitors: number;
  checkins: number;
  percentage: number;
  openSessions: number;
  avgSessionMinutes: number | null;
};

/** Rollup for the owner/reception "Daily Attendance", "Monthly Attendance"
 *  and "Attendance Percentage" features. The denominator is members whose
 *  latest membership is currently active (`deriveMemberStatus`), the
 *  numerator is distinct members who checked in within `range`. */
export const getAttendanceStats = unstable_cache(
  async (
    gymId: string,
    range: AttendanceRange,
    reference: Date = new Date(),
  ): Promise<AttendanceStats> => {
    const { start, end } = getRangeBounds(range, reference);

    const [members, records] = await Promise.all([
      db.user.findMany({ where: { gymId, role: "MEMBER", deletedAt: null }, select: { id: true } }),
      db.attendanceRecord.findMany({
        where: { gymId, checkInAt: { gte: start, lte: end } },
        select: { memberId: true, checkOutAt: true, sessionDurationMinutes: true },
      }),
    ]);

    if (members.length === 0) {
      return {
        activeMembers: 0,
        visitors: 0,
        checkins: 0,
        percentage: 0,
        openSessions: 0,
        avgSessionMinutes: null,
      };
    }

    const memberships = await db.memberMembership.findMany({
      where: { gymId, memberId: { in: members.map((m) => m.id) } },
      orderBy: { endDate: "desc" },
    });
    const latestByMember = new Map<string, (typeof memberships)[number]>();
    for (const m of memberships) {
      if (!latestByMember.has(m.memberId)) latestByMember.set(m.memberId, m);
    }

    const activeMembers = members.filter(
      (m) => deriveMemberStatus(latestByMember.get(m.id) ?? null) === "active",
    ).length;

    const visitors = new Set(records.map((r) => r.memberId)).size;
    const closed = records.filter((r) => r.checkOutAt && r.sessionDurationMinutes != null);
    const avgSessionMinutes = closed.length
      ? Math.round(closed.reduce((sum, r) => sum + (r.sessionDurationMinutes ?? 0), 0) / closed.length)
      : null;

    return {
      activeMembers,
      visitors,
      checkins: records.length,
      percentage: activeMembers > 0 ? Math.round((visitors / activeMembers) * 100) : 0,
      openSessions: records.filter((r) => !r.checkOutAt).length,
      avgSessionMinutes,
    };
  },
  ["attendance-stats"],
  { revalidate: ATTENDANCE_REVALIDATE },
);

// ─────────────────────────────────────────────────────────────────────────
// Member's own attendance history (calendar heatmap)
// ─────────────────────────────────────────────────────────────────────────

export type AttendanceDayCell = { date: string; sessions: number; totalMinutes: number };

/** Day-by-day attendance for the last `days` days (default ~12 weeks), for
 *  the heatmap-style calendar view. Date bucketing uses the server's local
 *  calendar day (consistent with the rest of this codebase's date handling,
 *  which doesn't yet thread through `gym.timezone`). Cached 30s — streak/
 *  calendar only change on check-in/out, which already revalidates
 *  /owner/attendance, /reception/attendance, /member, /member/attendance. */
export const getMemberAttendanceCalendar = unstable_cache(
  async (gymId: string, memberId: string, days = 84): Promise<AttendanceDayCell[]> => {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const records = await db.attendanceRecord.findMany({
    where: { gymId, memberId, checkInAt: { gte: start, lte: end } },
    select: { checkInAt: true, sessionDurationMinutes: true },
  });

  const byDate = new Map<string, { sessions: number; totalMinutes: number }>();
  for (const r of records) {
    const key = dateKey(r.checkInAt);
    const cur = byDate.get(key) ?? { sessions: 0, totalMinutes: 0 };
    cur.sessions += 1;
    cur.totalMinutes += r.sessionDurationMinutes ?? 0;
    byDate.set(key, cur);
  }

  const cells: AttendanceDayCell[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = dateKey(d);
    const v = byDate.get(key);
    cells.push({ date: key, sessions: v?.sessions ?? 0, totalMinutes: v?.totalMinutes ?? 0 });
  }
  return cells;
  },
  ["attendance-member-calendar"],
  { revalidate: ATTENDANCE_REVALIDATE },
);

function dateKey(d: Date) {
  const local = new Date(d);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────
// Streaks & badges
// ─────────────────────────────────────────────────────────────────────────

/** Scoped by gymId too (not just the memberId PK) as defense-in-depth against
 *  a caller accidentally passing a memberId from another gym. */
export const getMemberStreak = unstable_cache(
  async (gymId: string, memberId: string) => {
    return db.memberStreak.findFirst({ where: { gymId, memberId } });
  },
  ["attendance-member-streak"],
  { revalidate: ATTENDANCE_REVALIDATE },
);

export type MemberBadgeItem = {
  id: string;
  badgeId: string;
  name: string;
  description: string | null;
  icon: string | null;
  awardedAt: Date;
};

export const getMemberBadges = unstable_cache(
  async (gymId: string, memberId: string): Promise<MemberBadgeItem[]> => {
  const rows = await db.memberBadge.findMany({
    where: { gymId, memberId },
    orderBy: { awardedAt: "desc" },
    include: { badge: true },
  });
  return rows.map((r) => ({
    id: r.id,
    badgeId: r.badgeId,
    name: r.badge.name,
    description: r.badge.description,
    icon: r.badge.icon,
    awardedAt: r.awardedAt,
  }));
  },
  ["attendance-member-badges"],
  { revalidate: ATTENDANCE_REVALIDATE },
);

// ─────────────────────────────────────────────────────────────────────────
// Leaderboard — gym-scoped, opt-in only, ranked by current streak
// ─────────────────────────────────────────────────────────────────────────

export type LeaderboardEntry = {
  memberId: string;
  name: string;
  image: string | null;
  currentStreak: number;
  longestStreak: number;
  rank: number;
};

export const getLeaderboard = unstable_cache(
  async (gymId: string, limit = 10): Promise<LeaderboardEntry[]> => {
  const optedIn = await db.memberProfile.findMany({
    where: { gymId, leaderboardOptIn: true },
    select: { userId: true },
  });
  const memberIds = optedIn.map((p) => p.userId);
  if (memberIds.length === 0) return [];

  const streaks = await db.memberStreak.findMany({
    where: { gymId, memberId: { in: memberIds } },
    orderBy: [{ currentStreak: "desc" }, { longestStreak: "desc" }],
    take: limit,
  });
  if (streaks.length === 0) return [];

  const users = await db.user.findMany({
    where: { id: { in: streaks.map((s) => s.memberId) } },
    select: { id: true, name: true, image: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  return streaks.map((s, i) => ({
    memberId: s.memberId,
    name: userById.get(s.memberId)?.name ?? "Member",
    image: userById.get(s.memberId)?.image ?? null,
    currentStreak: s.currentStreak,
    longestStreak: s.longestStreak,
    rank: i + 1,
  }));
  },
  ["attendance-leaderboard"],
  { revalidate: ATTENDANCE_REVALIDATE },
);

// ─────────────────────────────────────────────────────────────────────────
// Vacation mode
// ─────────────────────────────────────────────────────────────────────────

export type VacationPeriodItem = {
  id: string;
  memberId: string;
  memberName: string;
  startDate: Date;
  endDate: Date;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: Date;
};

export const listPendingVacationRequests = unstable_cache(
  async (gymId: string): Promise<VacationPeriodItem[]> => {
  const rows = await db.vacationModePeriod.findMany({
    where: { gymId, status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });
  if (rows.length === 0) return [];

  const members = await db.user.findMany({
    where: { id: { in: [...new Set(rows.map((r) => r.memberId))] } },
    select: { id: true, name: true },
  });
  const nameById = new Map(members.map((m) => [m.id, m.name]));

  return rows.map((r) => ({
    id: r.id,
    memberId: r.memberId,
    memberName: nameById.get(r.memberId) ?? "Unknown member",
    startDate: r.startDate,
    endDate: r.endDate,
    reason: r.reason,
    status: r.status,
    createdAt: r.createdAt,
  }));
  },
  ["attendance-pending-vacations"],
  { revalidate: ATTENDANCE_REVALIDATE },
);

export const listMemberVacationPeriods = unstable_cache(
  async (gymId: string, memberId: string) => {
    return db.vacationModePeriod.findMany({
      where: { gymId, memberId },
      orderBy: { startDate: "desc" },
    });
  },
  ["attendance-member-vacations"],
  { revalidate: ATTENDANCE_REVALIDATE },
);
