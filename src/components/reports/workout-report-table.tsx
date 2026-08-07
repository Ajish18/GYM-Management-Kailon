import { Badge } from "@/components/ui/badge";
import { ReportTable } from "@/components/reports/report-table";
import type { WorkoutReportRow } from "@/lib/data/reports";

const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive"> = {
  ACTIVE: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

/** Workout Report — workout plan adherence and PRs per member plan. */
export function WorkoutReportTable({ data }: { data: WorkoutReportRow[]; filters?: unknown }) {
  return (
    <ReportTable<WorkoutReportRow>
      title="Workouts"
      description="Plan adherence and personal records"
      summary={`${data.length} workout plan${data.length === 1 ? "" : "s"} tracked`}
      data={data}
      keyFn={(r) => r.planId}
      emptyTitle="No workout plans"
      emptyDescription="Workout plans matching the filters will appear here."
      columns={[
        { header: "Member", cell: (r) => <span className="font-medium">{r.memberName}</span> },
        { header: "Plan", cell: (r) => r.planName },
        { header: "Status", cell: (r) => <Badge variant={STATUS_BADGE[r.status] ?? "secondary"}>{r.status}</Badge> },
        {
          header: "Adherence",
          className: "text-right",
          cell: (r) => (
            <div className="ml-auto flex w-32 items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${r.adherencePercent >= 70 ? "bg-success" : r.adherencePercent >= 40 ? "bg-streak" : "bg-destructive"}`}
                  style={{ width: `${Math.max(0, Math.min(100, r.adherencePercent))}%` }}
                />
              </div>
              <span className="w-10 text-right tabular-nums text-muted-foreground">{r.adherencePercent}%</span>
            </div>
          ),
        },
        {
          header: "PRs",
          className: "text-right",
          cell: (r) => <span className="font-medium tabular-nums">{r.prCount}</span>,
        },
      ]}
    />
  );
}
