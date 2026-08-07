import type { Metadata } from "next";
import { requireGymScope } from "@/lib/auth/guards";
import { SelfCheckinCard } from "@/components/attendance/self-checkin-card";
import { StreakSummaryCard } from "@/components/attendance/streak-summary-card";
import { AttendanceCalendar } from "@/components/attendance/attendance-calendar";
import { BadgeGrid } from "@/components/attendance/badge-grid";
import { VacationCard } from "@/components/attendance/vacation-card";
import { LeaderboardList } from "@/components/attendance/leaderboard-list";

export const metadata: Metadata = { title: "Attendance & Streaks" };

/** Member-facing attendance & gamification surface: self check-in/out,
 *  streak summary, attendance heatmap, earned badges, vacation mode and the
 *  opt-in leaderboard. Members can only ever see their own data — everything
 *  is scoped to `gymId` + `user.id`. */
export default async function MemberAttendancePage() {
  const { user, gymId } = await requireGymScope("MEMBER");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Attendance &amp; Streaks</h1>
        <p className="text-muted-foreground">Your check-in history, streak, badges and leaderboard.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SelfCheckinCard gymId={gymId} memberId={user.id} />
        <StreakSummaryCard gymId={gymId} memberId={user.id} />
      </div>

      <AttendanceCalendar gymId={gymId} memberId={user.id} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BadgeGrid gymId={gymId} memberId={user.id} />
        <VacationCard gymId={gymId} memberId={user.id} />
      </div>

      <LeaderboardList gymId={gymId} currentMemberId={user.id} />
    </div>
  );
}
