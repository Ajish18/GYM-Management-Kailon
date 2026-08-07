import { Card, CardContent } from "@/components/ui/card";
import { MonthPicker } from "@/components/expenses/month-picker";
import type { CategoryBreakdownRow } from "@/lib/data/expenses";
import { formatCurrency } from "@/lib/format";

export function CategoryBreakdown({
  month,
  rows,
  total,
}: {
  month: string;
  rows: CategoryBreakdownRow[];
  total: number;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-medium">Monthly expense report</h2>
          <p className="text-sm text-muted-foreground">Category-wise breakdown for the selected month.</p>
        </div>
        <MonthPicker value={month} />
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <p className="font-medium">No expenses recorded this month</p>
          <p className="mt-1 text-sm text-muted-foreground">Totals will appear here once expenses are logged.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total expenses</span>
              <span className="font-semibold">{formatCurrency(total)}</span>
            </div>
            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.categoryId} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{row.categoryName}</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(row.amount)} · {row.percent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(row.percent, 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
