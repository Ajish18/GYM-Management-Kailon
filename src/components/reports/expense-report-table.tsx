import { ReportTable } from "@/components/reports/report-table";
import { Badge } from "@/components/ui/badge";
import type { ExpenseReportRow } from "@/lib/data/reports";
import { formatCurrency, formatDate } from "@/lib/format";

/** Expense Report — every expense with category and vendor/note. */
export function ExpenseReportTable({ data }: { data: ExpenseReportRow[]; filters?: unknown }) {
  const total = data.reduce((sum, r) => sum + r.amount, 0);

  return (
    <ReportTable<ExpenseReportRow>
      title="Expenses"
      description="Expenses recorded in the selected range"
      summary={`${data.length} expenses · ${formatCurrency(total)} total`}
      data={data}
      keyFn={(r) => r.expenseId}
      emptyTitle="No expenses in this range"
      emptyDescription="Expenses matching the filters will appear here."
      columns={[
        { header: "Category", cell: (r) => <Badge variant="secondary">{r.category}</Badge> },
        {
          header: "Amount",
          className: "text-right",
          cell: (r) => <span className="font-semibold tabular-nums text-destructive">{formatCurrency(r.amount)}</span>,
        },
        {
          header: "Date",
          className: "text-right",
          cell: (r) => <span className="text-muted-foreground">{formatDate(r.date)}</span>,
        },
        { header: "Vendor / note", cell: (r) => r.vendorNote ?? <span className="text-muted-foreground">—</span> },
      ]}
    />
  );
}
