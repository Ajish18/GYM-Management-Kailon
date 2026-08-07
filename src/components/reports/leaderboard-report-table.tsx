import { ReportTable } from "@/components/reports/report-table";
import { cn } from "@/lib/utils";
import { Flame, Trophy } from "lucide-react";
import type { LeaderboardRow } from "@/lib/data/reports";

const MEDAL = ["bg-yellow-500/15 text-yellow-600 dark:text-yellow-400", "bg-slate-400/15 text-slate-500 dark:text-slate-300", "bg-orange-600/15 text-orange-600 dark:text-orange-400"];

/** Leaderboard — ranked by current streak (ties broken by longest). Opt-in
 *  only, so it reflects members who agreed to appear. */
export function LeaderboardReportTable({ data }: { data: LeaderboardRow[] }) {
  return (
    <ReportTable<LeaderboardRow>
      title="Leaderboard"
      description="Opted-in members ranked by current streak"
      data={data}
      keyFn={(r, i) => `${r.memberId}-${i}`}
      emptyTitle="No leaderboard yet"
      emptyDescription="Members who opted in and have a streak will appear here."
      columns={[
        {
          header: "Rank",
          className: "w-14",
          cell: (r) =>
            r.rank <= 3 ? (
              <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-full", MEDAL[r.rank - 1])}>
                <Trophy className="h-3.5 w-3.5" />
              </span>
            ) : (
              <span className="tabular-nums text-muted-foreground">{r.rank}</span>
            ),
        },
        { header: "Member", cell: (r) => <span className="font-medium">{r.memberName}</span> },
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
          cell: (r) => <span className="tabular-nums text-muted-foreground">{r.longestStreak}</span>,
        },
      ]}
    />
  );
}
