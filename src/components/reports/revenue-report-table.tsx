import { ReportTable } from "@/components/reports/report-table";
import { Badge } from "@/components/ui/badge";
import type { RevenueReportRow } from "@/lib/data/reports";
import { formatCurrency, formatDate } from "@/lib/format";

const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  BANK_TRANSFER: "Bank transfer",
};

/** Revenue Report — each recorded payment with invoice, plan and method. */
export function RevenueReportTable({ data }: { data: RevenueReportRow[]; filters?: unknown }) {
  const total = data.reduce((sum, r) => sum + r.amount, 0);

  return (
    <ReportTable<RevenueReportRow>
      title="Revenue"
      description="Payments recorded in the selected range"
      summary={`${data.length} payments · ${formatCurrency(total)} collected`}
      data={data}
      keyFn={(r) => r.paymentId}
      emptyTitle="No payments in this range"
      emptyDescription="Payments matching the filters will appear here."
      columns={[
        { header: "Invoice", cell: (r) => <span className="font-mono text-xs text-muted-foreground">{r.invoiceNumber}</span> },
        { header: "Member", cell: (r) => <span className="font-medium">{r.memberName}</span> },
        { header: "Plan", cell: (r) => r.planName ?? "—" },
        {
          header: "Amount",
          className: "text-right",
          cell: (r) => <span className="font-semibold tabular-nums">{formatCurrency(r.amount)}</span>,
        },
        { header: "Method", cell: (r) => <Badge variant="secondary">{METHOD_LABEL[r.method] ?? r.method}</Badge> },
        {
          header: "Date",
          className: "text-right",
          cell: (r) => <span className="text-muted-foreground">{formatDate(r.date)}</span>,
        },
      ]}
      footer={data.some((r) => r.discount > 0) ? `Discounts applied: ${formatCurrency(data.reduce((s, r) => s + r.discount, 0))}` : undefined}
    />
  );
}
