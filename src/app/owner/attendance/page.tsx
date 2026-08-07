import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireGymScope } from "@/lib/auth/guards";
import {
  listCheckinRoster,
  listOpenSessions,
  listAttendance,
  listPendingVacationRequests,
  getAttendanceStats,
  getRangeBounds,
  type AttendanceRange,
} from "@/lib/data/attendance";
import { AttendanceStatsCards } from "@/components/attendance/attendance-stats-cards";
import { ManualCheckinPanel } from "@/components/attendance/manual-checkin-panel";
import { VacationApprovalActions } from "@/components/attendance/vacation-approval-actions";
import { AttendanceTable } from "@/components/attendance/attendance-table";
import { AttendanceCalendar } from "@/components/attendance/attendance-calendar";

export const metadata: Metadata = { title: "Attendance" };

const RANGES: { value: AttendanceRange; label: string }[] = [
  { value: "day", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

export default async function OwnerAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; memberId?: string; page?: string }>;
}) {
  const { gymId } = await requireGymScope("GYM_OWNER");
  const { range: rangeParam, memberId, page } = await searchParams;
  const range: AttendanceRange = rangeParam === "week" || rangeParam === "month" ? rangeParam : "day";
  const { start, end } = getRangeBounds(range);

  const [roster, openSessions, attendance, vacationRequests, stats] = await Promise.all([
    listCheckinRoster(gymId),
    listOpenSessions(gymId),
    listAttendance({ gymId, start, end, memberId, page: page ? Number(page) : 1 }),
    listPendingVacationRequests(gymId),
    getAttendanceStats(gymId, range),
  ]);

  const rangeHref = (nextRange: AttendanceRange) => {
    const params = new URLSearchParams({ range: nextRange });
    if (memberId) params.set("memberId", memberId);
    return `?${params.toString()}`;
  };
  const pageHref = (nextPage: number) => {
    const params = new URLSearchParams({ range, page: String(nextPage) });
    if (memberId) params.set("memberId", memberId);
    return `?${params.toString()}`;
  };
  const memberHref = (id: string) => `?${new URLSearchParams({ range, memberId: id }).toString()}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
        <p className="text-muted-foreground">Check members in/out and review attendance history.</p>
      </div>

      <AttendanceStatsCards stats={stats} range={range} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ManualCheckinPanel roster={roster} openSessions={openSessions} />
        <VacationApprovalActions requests={vacationRequests} />
      </div>

      {memberId && (
        <div>
          <h2 className="mb-2 text-lg font-medium">Member history</h2>
          <AttendanceCalendar gymId={gymId} memberId={memberId} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <Button
            key={r.value}
            variant={r.value === range ? "default" : "outline"}
            size="sm"
            nativeButton={false}
            render={<Link href={rangeHref(r.value)}>{r.label}</Link>}
          />
        ))}
        {memberId && (
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href={`?range=${range}`}>Clear member filter</Link>}
          />
        )}
      </div>

      <AttendanceTable items={attendance.items} canCorrect memberHref={memberHref} />

      {attendance.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={attendance.page <= 1}
            nativeButton={false}
            render={<Link href={pageHref(attendance.page - 1)}>Previous</Link>}
          />
          <span className="text-sm text-muted-foreground">
            Page {attendance.page} of {attendance.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={attendance.page >= attendance.totalPages}
            nativeButton={false}
            render={<Link href={pageHref(attendance.page + 1)}>Next</Link>}
          />
        </div>
      )}
    </div>
  );
}
