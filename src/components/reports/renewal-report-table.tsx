import { Badge } from "@/components/ui/badge";
import { ReportTable } from "@/components/reports/report-table";
import type { RenewalReportRow } from "@/lib/data/reports";
import { formatDate } from "@/lib/format";

const RENEWAL_BADGE: Record<RenewalReportRow["renewalStatus"], "default" | "secondary" | "destructive"> = {
  Renewed: "default",
  Pending: "secondary",
  Lapsed: "destructive",
};

/** Renewal Report — memberships expiring in the selected window, whether the
 *  member already renewed, and how many days are left. */
export function RenewalReportTable({ data }: { data: RenewalReportRow[] }) {
  const pending = data.filter((r) => r.renewalStatus === "Pending").length;

  return (
    <ReportTable<RenewalReportRow>
      title="Renewals"
      description="Upcoming and recently-lapsed membership renewals"
      summary={`${data.length} memberships in window · ${pending} awaiting renewal`}
      data={data}
      keyFn={(r) => `${r.memberId}-${r.expiryDate.getTime()}`}
      emptyTitle="No renewals in this window"
      emptyDescription="Memberships expiring soon will appear here."
      columns={[
        { header: "Member", cell: (r) => <span className="font-medium">{r.memberName}</span> },
        { header: "Plan", cell: (r) => r.planName ?? "—" },
        { header: "Expires", cell: (r) => formatDate(r.expiryDate) },
        {
          header: "Days left",
          className: "text-right",
          cell: (r) =>
            r.daysUntilExpiry < 0 ? (
              <span className="tabular-nums text-destructive">{Math.abs(r.daysUntilExpiry)}d overdue</span>
            ) : (
              <span className="tabular-nums">{r.daysUntilExpiry}d</span>
            ),
        },
        {
          header: "Status",
          cell: (r) => <Badge variant={RENEWAL_BADGE[r.renewalStatus]}>{r.renewalStatus}</Badge>,
        },
      ]}
    />
  );
}
