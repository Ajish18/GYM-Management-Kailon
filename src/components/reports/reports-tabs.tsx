"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText } from "lucide-react";

// Reports are loaded per-tab on the server (see owner/reports/page.tsx), so
// clicking a tab must navigate to `?tab=…` — that re-renders the page with
// only that tab's queries instead of all 20 up front. This client component
// is just the URL bridge: it owns the controlled Tabs root, and on change it
// pushes the new tab to the query string, preserving any active filters.
const TABS = [
  { value: "overview", label: "Overview" },
  { value: "performance", label: "Performance" },
  { value: "members", label: "Members" },
  { value: "financial", label: "Financial" },
  { value: "operations", label: "Operations" },
] as const;

// Map tab to report types available for export within that tab
const TAB_REPORT_TYPES: Record<string, { value: string; label: string }[]> = {
  overview: [],
  performance: [
    { value: "owner-summary", label: "Owner Summary" },
    { value: "trainer-performance", label: "Trainer Performance" },
    { value: "workout-report", label: "Workout Report" },
  ],
  members: [
    { value: "member-report", label: "Member Report" },
    { value: "streak-report", label: "Streak Report" },
    { value: "leaderboard", label: "Leaderboard" },
    { value: "inactive-members", label: "Inactive Members" },
    { value: "renewal-report", label: "Renewal Report" },
  ],
  financial: [
    { value: "profit-loss", label: "Profit & Loss" },
    { value: "revenue-report", label: "Revenue Report" },
    { value: "expense-report", label: "Expense Report" },
    { value: "pending-dues", label: "Pending Dues" },
  ],
  operations: [
    { value: "attendance-report", label: "Attendance Report" },
    { value: "diet-report", label: "Diet Report" },
    { value: "membership-report", label: "Membership Report" },
  ],
};

function exportReport(reportType: string, format: "csv" | "xlsx", currentParams: URLSearchParams) {
  const params = new URLSearchParams(currentParams.toString());
  params.set("format", format);
  // Remove tab from params since it's in the URL path
  params.delete("tab");
  window.open(`/api/reports/export/${reportType}?${params.toString()}`, "_blank");
}

export function ReportsTabs({
  activeTab,
  children,
}: {
  activeTab: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(next: string | number | null) {
    if (next === null || String(next) === activeTab) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", String(next));
    // Keep other report filters (month, trainerId, status…) intact.
    router.push(`?${params.toString()}`, { scroll: false });
  }

  const reportTypes = TAB_REPORT_TYPES[activeTab] || [];

  return (
    <Tabs value={activeTab} onValueChange={handleChange}>
      <div className="flex items-center justify-between mb-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {reportTypes.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <button className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-secondary transition-colors">
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {reportTypes.map((report) => (
                <div key={report.value} className="space-y-1">
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground">{report.label}</p>
                  <DropdownMenuItem
                    onClick={() => exportReport(report.value, "csv", searchParams)}
                    className="flex items-center gap-2 px-2 py-1.5 text-sm"
                    inset
                  >
                    <FileText className="h-4 w-4" />
                    CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => exportReport(report.value, "xlsx", searchParams)}
                    className="flex items-center gap-2 px-2 py-1.5 text-sm"
                    inset
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    XLSX
                  </DropdownMenuItem>
                  {report !== reportTypes[reportTypes.length - 1] && <DropdownMenuSeparator className="my-1" />}
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {children}
    </Tabs>
  );
}
