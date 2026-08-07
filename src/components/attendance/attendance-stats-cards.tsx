import { UserCheck, Percent, Clock, Users } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import type { AttendanceStats, AttendanceRange } from "@/lib/data/attendance";

function formatAvg(minutes: number | null) {
  if (minutes == null) return "—";
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/** Daily/monthly attendance rollup cards for the owner/reception pages.
 *  Day shows the "Attendance rate" percentage (spec's Attendance
 *  Percentage); week/month show distinct visitors + active-member base
 *  instead, since a period-wide % is ambiguous. */
export function AttendanceStatsCards({
  stats,
  range,
}: {
  stats: AttendanceStats;
  range: AttendanceRange;
}) {
  if (range === "day") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Checked in today"
          value={stats.visitors}
          icon={UserCheck}
          accent="success"
          hint={`${stats.openSessions} still inside`}
        />
        <StatCard
          label="Attendance rate"
          value={`${stats.percentage}%`}
          icon={Percent}
          accent="primary"
          hint={`of ${stats.activeMembers} active members`}
        />
        <StatCard
          label="Avg session"
          value={formatAvg(stats.avgSessionMinutes)}
          icon={Clock}
          accent="muted"
          hint="today's visits"
        />
      </div>
    );
  }

  const period = range === "week" ? "this week" : "this month";
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard
        label={`Visitors ${period}`}
        value={stats.visitors}
        icon={UserCheck}
        accent="success"
        hint={`${stats.checkins} total check-ins`}
      />
      <StatCard
        label="Active members"
        value={stats.activeMembers}
        icon={Users}
        accent="primary"
        hint="with a live membership"
      />
      <StatCard
        label="Avg session"
        value={formatAvg(stats.avgSessionMinutes)}
        icon={Clock}
        accent="muted"
        hint={`${stats.checkins} visits ${period}`}
      />
    </div>
  );
}
