import type { Metadata } from "next";
import { Suspense } from "react";
import { requireGymScope } from "@/lib/auth/guards";
import {
  getReportFilterOptions,
  getOwnerSummaryReport,
  getTrainerPerformanceReport,
  getMemberReport,
  getAttendanceReport,
  getRevenueReport,
  getExpenseReport,
  getWorkoutReport,
  getDietReport,
  getMembershipReport,
  getRenewalReport,
  getInactiveMemberReport,
  getStreakReport,
  getLeaderboardReport,
  getPendingDuesReport,
  getProfitLossReport,
  getRevenueTrend,
  getMembershipGrowthTrend,
  getAttendanceTrend,
  getTopTrainers,
  getTopMembersByStreak,
  type OwnerSummaryFilters,
  type TrainerPerformanceFilters,
  type MemberReportFilters,
  type AttendanceReportFilters,
  type RevenueReportFilters,
  type ExpenseReportFilters,
  type WorkoutReportFilters,
  type DietReportFilters,
  type MembershipReportFilters,
  type RenewalReportFilters,
  type InactiveMemberReportFilters,
  type StreakReportFilters,
  type PendingDuesFilters,
  type ProfitLossFilters,
} from "@/lib/data/reports";
import { TabsContent } from "@/components/ui/tabs";
import { ReportsTabs } from "@/components/reports/reports-tabs";
import { OwnerSummaryReport } from "@/components/reports/owner-summary-report";
import { TrainerPerformanceReport } from "@/components/reports/trainer-performance-report";
import { MemberReportTable } from "@/components/reports/member-report-table";
import { AttendanceReportTable } from "@/components/reports/attendance-report-table";
import { RevenueReportTable } from "@/components/reports/revenue-report-table";
import { ExpenseReportTable } from "@/components/reports/expense-report-table";
import { WorkoutReportTable } from "@/components/reports/workout-report-table";
import { DietReportTable } from "@/components/reports/diet-report-table";
import { MembershipReportTable } from "@/components/reports/membership-report-table";
import { RenewalReportTable } from "@/components/reports/renewal-report-table";
import { InactiveMemberReportTable } from "@/components/reports/inactive-member-report-table";
import { StreakReportTable } from "@/components/reports/streak-report-table";
import { LeaderboardReportTable } from "@/components/reports/leaderboard-report-table";
import { PendingDuesReportTable } from "@/components/reports/pending-dues-report-table";
import { ProfitLossReport } from "@/components/reports/profit-loss-report";
import { AnalyticsOverviewLazy } from "@/components/reports/analytics-overview-lazy";
import { SegmentLoading } from "@/components/ui/segment-loading";

export const metadata: Metadata = { title: "Reports" };

// Only the active tab's data is fetched (5–8 queries instead of 23). Tabs are
// URL-driven: ReportsTabs navigates to `?tab=…`, which re-renders the page with
// just that tab's Promise.all. Loading the overview (the default) is 5 queries.
async function loadActiveTab(params: { [k: string]: string | undefined }, gymId: string) {
  const tab = params.tab ?? "overview";

  if (tab === "performance") {
    const [filters, ownerSummary, trainerPerformance, workoutReport] = await Promise.all([
      getReportFilterOptions(gymId),
      getOwnerSummaryReport(gymId, {
        month: params.month,
        year: params.year,
      } as OwnerSummaryFilters),
      getTrainerPerformanceReport(gymId, {
        trainerId: params.trainerId,
        from: params.from,
        to: params.to,
      } as TrainerPerformanceFilters),
      getWorkoutReport(gymId, {
        memberId: params.memberId,
        trainerId: params.trainerId,
        planStatus: params.planStatus,
        from: params.from,
        to: params.to,
      } as WorkoutReportFilters),
    ]);
    return (
      <>
        <TabsContent value="performance" className="space-y-6">
          <OwnerSummaryReport data={ownerSummary} filters={filters} />
          <TrainerPerformanceReport data={trainerPerformance} filters={filters} />
          <WorkoutReportTable data={workoutReport} filters={filters} />
        </TabsContent>
      </>
    );
  }

  if (tab === "members") {
    const [filters, memberReport, streakReport, leaderboard, inactive, renewal] = await Promise.all([
      getReportFilterOptions(gymId),
      getMemberReport(gymId, {
        status: params.status,
        trainerId: params.trainerId,
        planId: params.planId,
        joinFrom: params.joinFrom,
        joinTo: params.joinTo,
      } as MemberReportFilters),
      getStreakReport(gymId, {
        trainerId: params.trainerId,
        minStreak: params.minStreak,
      } as StreakReportFilters),
      getLeaderboardReport(gymId),
      getInactiveMemberReport(gymId, {
        attendanceThreshold: params.attendanceThreshold,
        trailingDays: params.trailingDays,
      } as InactiveMemberReportFilters),
      getRenewalReport(gymId, {
        expiryWindow: params.expiryWindow,
        status: params.renewalStatus,
      } as RenewalReportFilters),
    ]);
    return (
      <>
        <TabsContent value="members" className="space-y-6">
          <MemberReportTable data={memberReport} filters={filters} />
          <StreakReportTable data={streakReport} filters={filters} />
          <LeaderboardReportTable data={leaderboard} />
          <InactiveMemberReportTable data={inactive} />
          <RenewalReportTable data={renewal} />
        </TabsContent>
      </>
    );
  }

  if (tab === "financial") {
    const [filters, profitLoss, revenue, expense, pendingDues] = await Promise.all([
      getReportFilterOptions(gymId),
      getProfitLossReport(gymId, {
        month: params.month,
        year: params.year,
        comparePriorPeriod: params.comparePriorPeriod,
      } as ProfitLossFilters),
      getRevenueReport(gymId, {
        from: params.from,
        to: params.to,
        planId: params.planId,
        paymentMethod: params.paymentMethod,
      } as RevenueReportFilters),
      getExpenseReport(gymId, {
        from: params.from,
        to: params.to,
        categoryId: params.categoryId,
      } as ExpenseReportFilters),
      getPendingDuesReport(gymId, {
        daysOverdueMin: params.daysOverdueMin,
      } as PendingDuesFilters),
    ]);
    return (
      <>
        <TabsContent value="financial" className="space-y-6">
          <ProfitLossReport data={profitLoss} />
          <RevenueReportTable data={revenue} filters={filters} />
          <ExpenseReportTable data={expense} filters={filters} />
          <PendingDuesReportTable data={pendingDues} />
        </TabsContent>
      </>
    );
  }

  if (tab === "operations") {
    const [filters, attendance, diet, membership] = await Promise.all([
      getReportFilterOptions(gymId),
      getAttendanceReport(gymId, {
        memberId: params.memberId,
        trainerId: params.trainerId,
        from: params.from,
        to: params.to,
        method: params.method,
      } as AttendanceReportFilters),
      getDietReport(gymId, {
        memberId: params.memberId,
        trainerId: params.trainerId,
        from: params.from,
        to: params.to,
      } as DietReportFilters),
      getMembershipReport(gymId, {
        planId: params.planId,
        status: params.status,
      } as MembershipReportFilters),
    ]);
    return (
      <>
        <TabsContent value="operations" className="space-y-6">
          <AttendanceReportTable data={attendance} filters={filters} />
          <DietReportTable data={diet} />
          <MembershipReportTable data={membership} />
        </TabsContent>
      </>
    );
  }

  // Overview (default) — charts + leaderboards, no filter dropdowns.
  const [revenueTrend, membershipGrowthTrend, attendanceTrend, topTrainers, topMembers] =
    await Promise.all([
      getRevenueTrend(gymId),
      getMembershipGrowthTrend(gymId),
      getAttendanceTrend(gymId),
      getTopTrainers(gymId),
      getTopMembersByStreak(gymId),
    ]);
  return (
    <>
      <TabsContent value="overview" className="space-y-6">
        <AnalyticsOverviewLazy
          revenueTrend={revenueTrend}
          membershipGrowthTrend={membershipGrowthTrend}
          attendanceTrend={attendanceTrend}
          topTrainers={topTrainers}
          topMembers={topMembers}
        />
      </TabsContent>
    </>
  );
}

export default async function OwnerReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    // Owner summary
    month?: string;
    year?: string;
    // Trainer performance
    trainerId?: string;
    from?: string;
    to?: string;
    // Member report
    status?: string;
    planId?: string;
    joinFrom?: string;
    joinTo?: string;
    // Attendance report
    memberId?: string;
    method?: string;
    // Revenue report
    paymentMethod?: string;
    // Expense report
    categoryId?: string;
    // Workout report
    planStatus?: string;
    // Renewal report
    expiryWindow?: string;
    renewalStatus?: string;
    // Inactive members
    attendanceThreshold?: string;
    trailingDays?: string;
    // Streak report
    minStreak?: string;
    // Pending dues
    daysOverdueMin?: string;
    // Profit loss
    comparePriorPeriod?: string;
  }>;
}) {
  const { gymId } = await requireGymScope("GYM_OWNER");
  const params = await searchParams;
  const activeTab = params.tab ?? "overview";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground">
          Comprehensive insights into your gym&apos;s performance
        </p>
      </div>

      <ReportsTabs activeTab={activeTab}>
        <Suspense fallback={<SegmentLoading />}>
          {await loadActiveTab(params, gymId)}
        </Suspense>
      </ReportsTabs>
    </div>
  );
}
