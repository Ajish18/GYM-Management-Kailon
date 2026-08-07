import { ReportTable } from "@/components/reports/report-table";
import { Badge } from "@/components/ui/badge";
import type { PendingDuesRow } from "@/lib/data/reports";
import { formatCurrency, formatDate } from "@/lib/format";

/** Pending Dues — unpaid/partially-paid invoices that are overdue by the
 *  selected minimum, sorted oldest-due first so collections can follow. */
export function PendingDuesReportTable({ data }: { data: PendingDuesRow[] }) {
  const total = data.reduce((sum, r) => sum + r.amountDue, 0);
  const worst = data.reduce((max, r) => Math.max(max, r.daysOverdue), 0);

  return (
    <ReportTable<PendingDuesRow>
      title="Pending dues"
      description="Unpaid invoices sorted by oldest due date"
      summary={`${data.length} invoices · ${formatCurrency(total)} outstanding · worst ${worst}d overdue`}
      data={data}
      keyFn={(r) => r.invoiceId}
      emptyTitle="No pending dues"
      emptyDescription="All invoices are paid up. Great."
      columns={[
        { header: "Invoice", cell: (r) => <span className="font-mono text-xs text-muted-foreground">{r.invoiceNumber}</span> },
        { header: "Member", cell: (r) => <span className="font-medium">{r.memberName}</span> },
        {
          header: "Amount due",
          className: "text-right",
          cell: (r) => <span className="font-semibold tabular-nums text-destructive">{formatCurrency(r.amountDue)}</span>,
        },
        {
          header: "Overdue",
          className: "text-right",
          cell: (r) =>
            r.daysOverdue > 0 ? (
              <Badge variant={r.daysOverdue >= 30 ? "destructive" : "secondary"} className="tabular-nums">
                {r.daysOverdue}d
              </Badge>
            ) : (
              <span className="tabular-nums text-muted-foreground">0d</span>
            ),
        },
        {
          header: "Issued",
          cell: (r) => <span className="text-muted-foreground">{formatDate(r.issuedAt)}</span>,
        },
        {
          header: "Due",
          cell: (r) => (r.dueDate ? <span className="text-muted-foreground">{formatDate(r.dueDate)}</span> : "—"),
        },
      ]}
    />
  );
}
