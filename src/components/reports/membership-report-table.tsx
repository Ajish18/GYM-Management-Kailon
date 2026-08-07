import { ReportTable } from "@/components/reports/report-table";
import type { MembershipReportRow } from "@/lib/data/reports";
import { formatCurrency } from "@/lib/format";

/** Membership Report — revenue and tenure per membership plan. */
export function MembershipReportTable({ data }: { data: MembershipReportRow[] }) {
  const totalRevenue = data.reduce((sum, r) => sum + r.revenue, 0);

  return (
    <ReportTable<MembershipReportRow>
      title="Memberships by plan"
      description="Active members, booked revenue and tenure per plan"
      summary={`${data.length} plans · ${formatCurrency(totalRevenue)} booked revenue`}
      data={data}
      keyFn={(r) => r.planId}
      emptyTitle="No plans yet"
      emptyDescription="Create membership plans to see them here."
      columns={[
        { header: "Plan", cell: (r) => <span className="font-medium">{r.planName}</span> },
        {
          header: "Active members",
          className: "text-right",
          cell: (r) => <span className="tabular-nums">{r.activeCount}</span>,
        },
        {
          header: "Booked revenue",
          className: "text-right",
          cell: (r) => <span className="font-semibold tabular-nums">{formatCurrency(r.revenue)}</span>,
        },
        {
          header: "Avg tenure",
          className: "text-right",
          cell: (r) => <span className="tabular-nums text-muted-foreground">{r.avgTenureDays} days</span>,
        },
      ]}
    />
  );
}
