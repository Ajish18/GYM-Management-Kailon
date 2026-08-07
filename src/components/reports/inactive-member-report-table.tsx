import { Badge } from "@/components/ui/badge";
import { ReportTable } from "@/components/reports/report-table";
import type { InactiveMemberReportRow } from "@/lib/data/reports";
import { formatDate } from "@/lib/format";

/** Inactive Members — active members who visited fewer than the threshold
 *  times within the trailing window. A churn-risk list for follow-ups. */
export function InactiveMemberReportTable({ data }: { data: InactiveMemberReportRow[] }) {
  return (
    <ReportTable<InactiveMemberReportRow>
      title="Inactive members"
      description={`Active members with fewer than ${data[0]?.threshold ?? 3} visits in the last ${data[0]?.trailingDays ?? 14} days`}
      summary={`${data.length} member${data.length === 1 ? "" : "s"} at risk of churning`}
      data={data}
      keyFn={(r) => r.memberId}
      emptyTitle="No inactive members"
      emptyDescription="Everyone with an active membership is visiting regularly. Nice."
      columns={[
        { header: "Member", cell: (r) => <span className="font-medium">{r.memberName}</span> },
        { header: "Plan", cell: (r) => r.planName ?? "—" },
        {
          header: "Visits",
          className: "text-right",
          cell: (r) => (
            <span className="inline-flex items-center gap-2">
              <Badge variant={r.visitsInWindow === 0 ? "destructive" : "secondary"} className="tabular-nums">
                {r.visitsInWindow} / {r.threshold}
              </Badge>
            </span>
          ),
        },
        {
          header: "Window",
          className: "text-right",
          cell: (r) => <span className="tabular-nums text-muted-foreground">{r.trailingDays} days</span>,
        },
        {
          header: "Membership expires",
          cell: (r) => (r.expiryDate ? formatDate(r.expiryDate) : "—"),
        },
      ]}
    />
  );
}
