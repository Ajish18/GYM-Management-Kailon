import { requireGymScope } from "@/lib/auth/guards";
import { createCSVDownload, createXLSXDownload, generateCSV, generateXLSX, makeFilename } from "@/lib/export";
import type { OwnerSummaryFilters } from "@/lib/data/reports";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { gymId } = await requireGymScope("GYM_OWNER");
    const { type } = await params;
    const url = new URL(request.url);
    const format = url.searchParams.get("format") || "csv"; // csv or xlsx

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- row shape varies per report type; columns are built and validated per-case below
    let data: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let columns: any[] = [];
    let title = "";
    let subtitle = "";
    const footer = `Generated on ${new Date().toLocaleString("en-IN")} for Gym: ${gymId}`;

    // Reuse the same filter parsing logic from the reports page
    const searchParams = url.searchParams;
    const paramsObj: Record<string, string | undefined> = {};
    searchParams.forEach((value, key) => {
      if (key !== "format") paramsObj[key] = value;
    });

    // Import report functions dynamically to avoid circular deps
    const { getReportFilterOptions } = await import("@/lib/data/reports");

    const filters = await getReportFilterOptions(gymId);

    switch (type) {
      case "owner-summary": {
        const { getOwnerSummaryReport } = await import("@/lib/data/reports");
        data = await getOwnerSummaryReport(gymId, paramsObj as OwnerSummaryFilters);
        columns = [
          { key: "period", header: "Period" },
          { key: "revenue", header: "Revenue (₹)", format: (v: number) => `₹${v.toLocaleString("en-IN")}` },
          { key: "expenses", header: "Expenses (₹)", format: (v: number) => `₹${v.toLocaleString("en-IN")}` },
          { key: "netProfit", header: "Net Profit (₹)", format: (v: number) => `₹${v.toLocaleString("en-IN")}` },
          { key: "newMembers", header: "New Members" },
          { key: "churnedMembers", header: "Churned Members" },
          { key: "avgAttendancePercent", header: "Avg Attendance %", format: (v: number) => `${v}%` },
        ];
        title = "Owner Summary Report";
        subtitle = `Month: ${paramsObj.month || "current"}, Year: ${paramsObj.year || new Date().getFullYear()}`;
        break;
      }

      case "trainer-performance": {
        const { getTrainerPerformanceReport } = await import("@/lib/data/reports");
        data = await getTrainerPerformanceReport(gymId, paramsObj);
        columns = [
          { key: "trainerName", header: "Trainer" },
          { key: "assignedMembers", header: "Assigned Members" },
          { key: "retentionPercent", header: "Retention %", format: (v: number) => `${v}%` },
          { key: "avgAttendance", header: "Avg Attendance" },
          { key: "workoutAdherencePercent", header: "Workout Adherence %", format: (v: number) => `${v}%` },
          { key: "prsLogged", header: "PRs Logged" },
        ];
        title = "Trainer Performance Report";
        subtitle = `From: ${paramsObj.from || "30 days ago"} To: ${paramsObj.to || "today"}`;
        break;
      }

      case "member-report": {
        const { getMemberReport } = await import("@/lib/data/reports");
        data = await getMemberReport(gymId, paramsObj);
        columns = [
          { key: "name", header: "Member Name" },
          { key: "status", header: "Status" },
          { key: "planName", header: "Plan" },
          { key: "joinDate", header: "Join Date", format: (v: Date) => new Date(v).toLocaleDateString("en-IN") },
          { key: "expiryDate", header: "Expiry Date", format: (v: Date | null) => v ? new Date(v).toLocaleDateString("en-IN") : "—" },
          { key: "trainerName", header: "Trainer" },
          { key: "lastAttendance", header: "Last Attendance", format: (v: Date | null) => v ? new Date(v).toLocaleDateString("en-IN") : "—" },
          { key: "duesAmount", header: "Dues (₹)", format: (v: number) => `₹${v.toLocaleString("en-IN")}` },
        ];
        title = "Member Report";
        subtitle = `Status: ${paramsObj.status || "all"}, Trainer: ${paramsObj.trainerId ? filters.trainers.find((t) => t.id === paramsObj.trainerId)?.name || "all" : "all"}`;
        break;
      }

      case "attendance-report": {
        const { getAttendanceReport } = await import("@/lib/data/reports");
        data = await getAttendanceReport(gymId, paramsObj);
        columns = [
          { key: "memberName", header: "Member" },
          { key: "checkInAt", header: "Check-in", format: (v: Date) => new Date(v).toLocaleString("en-IN") },
          { key: "checkOutAt", header: "Check-out", format: (v: Date | null) => v ? new Date(v).toLocaleString("en-IN") : "Checked in" },
          { key: "durationMinutes", header: "Duration", format: (v: number | null) => v == null ? "—" : v < 60 ? `${v}m` : `${Math.floor(v / 60)}h ${v % 60}m` },
          { key: "method", header: "Method" },
        ];
        title = "Attendance Report";
        subtitle = `From: ${paramsObj.from || "7 days ago"} To: ${paramsObj.to || "today"}`;
        break;
      }

      case "revenue-report": {
        const { getRevenueReport } = await import("@/lib/data/reports");
        data = await getRevenueReport(gymId, paramsObj);
        columns = [
          { key: "invoiceNumber", header: "Invoice #" },
          { key: "memberName", header: "Member" },
          { key: "planName", header: "Plan" },
          { key: "amount", header: "Amount (₹)", format: (v: number) => `₹${v.toLocaleString("en-IN")}` },
          { key: "method", header: "Method" },
          { key: "discount", header: "Discount (₹)", format: (v: number) => `₹${v.toLocaleString("en-IN")}` },
          { key: "date", header: "Date", format: (v: Date) => new Date(v).toLocaleDateString("en-IN") },
        ];
        title = "Revenue Report";
        subtitle = `From: ${paramsObj.from || "30 days ago"} To: ${paramsObj.to || "today"}`;
        break;
      }

      case "expense-report": {
        const { getExpenseReport } = await import("@/lib/data/reports");
        data = await getExpenseReport(gymId, paramsObj);
        columns = [
          { key: "category", header: "Category" },
          { key: "amount", header: "Amount (₹)", format: (v: number) => `₹${v.toLocaleString("en-IN")}` },
          { key: "date", header: "Date", format: (v: Date) => new Date(v).toLocaleDateString("en-IN") },
          { key: "vendorNote", header: "Vendor/Note" },
        ];
        title = "Expense Report";
        subtitle = `From: ${paramsObj.from || "30 days ago"} To: ${paramsObj.to || "today"}`;
        break;
      }

      case "workout-report": {
        const { getWorkoutReport } = await import("@/lib/data/reports");
        data = await getWorkoutReport(gymId, paramsObj);
        columns = [
          { key: "memberName", header: "Member" },
          { key: "planName", header: "Plan" },
          { key: "status", header: "Status" },
          { key: "adherencePercent", header: "Adherence %", format: (v: number) => `${v}%` },
          { key: "prCount", header: "PRs" },
        ];
        title = "Workout Report";
        subtitle = `From: ${paramsObj.from || "90 days ago"} To: ${paramsObj.to || "today"}`;
        break;
      }

      case "diet-report": {
        const { getDietReport } = await import("@/lib/data/reports");
        data = await getDietReport(gymId, paramsObj);
        columns = [
          { key: "memberName", header: "Member" },
          { key: "planName", header: "Plan" },
          { key: "status", header: "Status" },
          { key: "noteCount", header: "Notes" },
          { key: "avgWaterMl", header: "Avg Water (ml)" },
        ];
        title = "Diet Report";
        subtitle = `From: ${paramsObj.from || "90 days ago"} To: ${paramsObj.to || "today"}`;
        break;
      }

      case "membership-report": {
        const { getMembershipReport } = await import("@/lib/data/reports");
        data = await getMembershipReport(gymId, paramsObj);
        columns = [
          { key: "planName", header: "Plan" },
          { key: "activeCount", header: "Active Members" },
          { key: "revenue", header: "Revenue (₹)", format: (v: number) => `₹${v.toLocaleString("en-IN")}` },
          { key: "avgTenureDays", header: "Avg Tenure (days)" },
        ];
        title = "Membership Report";
        break;
      }

      case "renewal-report": {
        const { getRenewalReport } = await import("@/lib/data/reports");
        data = await getRenewalReport(gymId, paramsObj);
        columns = [
          { key: "memberName", header: "Member" },
          { key: "planName", header: "Plan" },
          { key: "expiryDate", header: "Expiry Date", format: (v: Date) => new Date(v).toLocaleDateString("en-IN") },
          { key: "daysUntilExpiry", header: "Days Until Expiry" },
          { key: "renewalStatus", header: "Renewal Status" },
        ];
        title = "Renewal Report";
        subtitle = `Expiry Window: ${paramsObj.expiryWindow || "30"} days`;
        break;
      }

      case "inactive-members": {
        const { getInactiveMemberReport } = await import("@/lib/data/reports");
        data = await getInactiveMemberReport(gymId, paramsObj);
        columns = [
          { key: "memberName", header: "Member" },
          { key: "planName", header: "Plan" },
          { key: "expiryDate", header: "Expiry Date", format: (v: Date | null) => v ? new Date(v).toLocaleDateString("en-IN") : "—" },
          { key: "visitsInWindow", header: "Visits in Window" },
          { key: "threshold", header: "Threshold" },
          { key: "trailingDays", header: "Trailing Days" },
        ];
        title = "Inactive Members Report";
        subtitle = `Threshold: ${paramsObj.attendanceThreshold || "3"} visits in ${paramsObj.trailingDays || "14"} days`;
        break;
      }

      case "streak-report": {
        const { getStreakReport } = await import("@/lib/data/reports");
        data = await getStreakReport(gymId, paramsObj);
        columns = [
          { key: "memberName", header: "Member" },
          { key: "currentStreak", header: "Current Streak" },
          { key: "longestStreak", header: "Longest Streak" },
          { key: "freezesUsed", header: "Freezes Used" },
          { key: "badgesEarned", header: "Badges Earned" },
        ];
        title = "Streak Report";
        subtitle = `Min Streak: ${paramsObj.minStreak || "0"}`;
        break;
      }

      case "leaderboard": {
        const { getLeaderboardReport } = await import("@/lib/data/reports");
        data = await getLeaderboardReport(gymId);
        columns = [
          { key: "rank", header: "Rank" },
          { key: "memberName", header: "Member" },
          { key: "currentStreak", header: "Current Streak" },
          { key: "longestStreak", header: "Longest Streak" },
        ];
        title = "Leaderboard";
        break;
      }

      case "pending-dues": {
        const { getPendingDuesReport } = await import("@/lib/data/reports");
        data = await getPendingDuesReport(gymId, paramsObj);
        columns = [
          { key: "invoiceNumber", header: "Invoice #" },
          { key: "memberName", header: "Member" },
          { key: "amountDue", header: "Amount Due (₹)", format: (v: number) => `₹${v.toLocaleString("en-IN")}` },
          { key: "daysOverdue", header: "Days Overdue" },
          { key: "issuedAt", header: "Issued Date", format: (v: Date) => new Date(v).toLocaleDateString("en-IN") },
          { key: "dueDate", header: "Due Date", format: (v: Date | null) => v ? new Date(v).toLocaleDateString("en-IN") : "—" },
        ];
        title = "Pending Dues Report";
        subtitle = `Min Days Overdue: ${paramsObj.daysOverdueMin || "0"}`;
        break;
      }

      case "profit-loss": {
        const { getProfitLossReport } = await import("@/lib/data/reports");
        data = await getProfitLossReport(gymId, paramsObj);
        columns = [
          { key: "period", header: "Period" },
          { key: "revenue", header: "Revenue (₹)", format: (v: number) => `₹${v.toLocaleString("en-IN")}` },
          { key: "expenses", header: "Expenses (₹)", format: (v: number) => `₹${v.toLocaleString("en-IN")}` },
          { key: "netProfit", header: "Net Profit (₹)", format: (v: number) => `₹${v.toLocaleString("en-IN")}` },
          { key: "marginPercent", header: "Margin %", format: (v: number) => `${v}%` },
          { key: "priorRevenue", header: "Prior Revenue (₹)", format: (v: number | undefined) => v ? `₹${v.toLocaleString("en-IN")}` : "—" },
          { key: "priorExpenses", header: "Prior Expenses (₹)", format: (v: number | undefined) => v ? `₹${v.toLocaleString("en-IN")}` : "—" },
          { key: "priorNetProfit", header: "Prior Net Profit (₹)", format: (v: number | undefined) => v ? `₹${v.toLocaleString("en-IN")}` : "—" },
          { key: "priorMarginPercent", header: "Prior Margin %", format: (v: number | undefined) => v ? `${v}%` : "—" },
        ];
        title = "Profit & Loss Report";
        subtitle = `Month: ${paramsObj.month || "current"}, Year: ${paramsObj.year || new Date().getFullYear()}`;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid report type" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
    }

    const formatValue = format as "csv" | "xlsx";
    const filename = makeFilename(title.toLowerCase().replace(/\s+/g, "-"), formatValue);

    if (formatValue === "xlsx") {
      const buffer = generateXLSX({ title, columns, data, subtitle, footer });
      return createXLSXDownload(buffer, filename);
    } else {
      const csv = generateCSV({ title, columns, data, subtitle, footer });
      return createCSVDownload(csv, filename);
    }
  } catch (error) {
    console.error("Export error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate export" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}