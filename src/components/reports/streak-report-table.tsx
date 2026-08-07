import { Badge } from "@/components/ui/badge";
import { ReportTable } from "@/components/reports/report-table";
import { Flame } from "lucide-react";
import type { StreakReportRow } from "@/lib/data/reports";

/** Streak Report — current/longest streaks per member, freeze usage and
 *  badges earned. */
export function StreakReportTable({ data }: { data: StreakReportRow[]; filters?: unknown }) {
  const avgStreak = data.length > 0 ? Math.round(data.reduce((s, r) => s + r.currentStreak, 0) / data.length) : 0;

  return (
    <ReportTable<StreakReportRow>
      title="Streak report"
      description="Check-in streaks, freezes and badges"
      summary={`${data.length} members · ${avgStreak} avg current streak`}
      data={data}
      keyFn={(r) => r.memberId}
      emptyTitle="No streaks yet"
      emptyDescription="Members with streaks matching the filters will appear here."
      columns={[
        {
          header: "Member",
          cell: (r) => (
            <div className="flex items-center gap-2">
              <span className="font-medium">{r.memberName}</span>
              {r.currentStreak >= 30 && (
                <Badge variant="outline" className="gap-1 border-streak/40 text-streak">
                  <Flame className="h-3 w-3" />
                  Hot
                </Badge>
              )}
            </div>
          ),
        },
        {
          header: "Current streak",
          className: "text-right",
          cell: (r) => (
            <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-streak">
              <Flame className="h-3.5 w-3.5" />
              {r.currentStreak}
            </span>
          ),
        },
        {
          header: "Longest streak",
          className: "text-right",
          cell: (r) => <span className="tabular-nums">{r.longestStreak}</span>,
        },
        {
          header: "Freezes used",
          className: "text-right",
          cell: (r) => <span className="tabular-nums text-muted-foreground">{r.freezesUsed}</span>,
        },
        {
          header: "Badges earned",
          className: "text-right",
          cell: (r) => (
            <Badge variant="secondary" className="tabular-nums">
              {r.badgesEarned}
            </Badge>
          ),
        },
      ]}
    />
  );
}
