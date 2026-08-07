import { Badge } from "@/components/ui/badge";
import { ReportTable } from "@/components/reports/report-table";
import { Droplets } from "lucide-react";
import type { DietReportRow } from "@/lib/data/reports";

const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive"> = {
  ACTIVE: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

function formatWater(ml: number) {
  if (ml <= 0) return "—";
  if (ml < 1000) return `${ml} ml`;
  return `${(ml / 1000).toFixed(ml % 1000 === 0 ? 0 : 1)} L`;
}

/** Diet Report — diet plan adherence notes and average daily water intake. */
export function DietReportTable({ data }: { data: DietReportRow[] }) {
  return (
    <ReportTable<DietReportRow>
      title="Diet"
      description="Plan notes and hydration per member"
      summary={`${data.length} diet plan${data.length === 1 ? "" : "s"} tracked`}
      data={data}
      keyFn={(r) => r.planId}
      emptyTitle="No diet plans"
      emptyDescription="Diet plans matching the filters will appear here."
      columns={[
        { header: "Member", cell: (r) => <span className="font-medium">{r.memberName}</span> },
        { header: "Plan", cell: (r) => r.planName },
        { header: "Status", cell: (r) => <Badge variant={STATUS_BADGE[r.status] ?? "secondary"}>{r.status}</Badge> },
        {
          header: "Notes",
          className: "text-right",
          cell: (r) => <span className="tabular-nums text-muted-foreground">{r.noteCount}</span>,
        },
        {
          header: "Avg water",
          className: "text-right",
          cell: (r) =>
            r.avgWaterMl > 0 ? (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Droplets className="h-3.5 w-3.5 text-sky-500" />
                {formatWater(r.avgWaterMl)}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            ),
        },
      ]}
    />
  );
}
