import { ReportEmptyState, ReportSection } from "@/components/reports/report-section";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ProfitLossRow } from "@/lib/data/reports";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

function Delta({ label, value, invert = false }: { label: string; value: number | undefined; invert?: boolean }) {
  if (value === undefined) return null;
  const up = value >= 0;
  const good = invert ? !up : up;
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {up ? (
        <ArrowUpRight className={cn("h-3.5 w-3.5", good ? "text-success" : "text-destructive")} />
      ) : (
        <ArrowDownRight className={cn("h-3.5 w-3.5", good ? "text-success" : "text-destructive")} />
      )}
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium tabular-nums", good ? "text-success" : "text-destructive")}>
        {formatCurrency(Math.abs(value))}
      </span>
    </div>
  );
}

/** Profit & Loss — headline revenue/expenses/net for the selected month, with
 *  optional prior-period deltas when comparison is enabled. */
export function ProfitLossReport({ data }: { data: ProfitLossRow[] }) {
  if (data.length === 0) {
    return (
      <ReportSection title="Profit & loss" description="Selected month's revenue vs expenses">
        <ReportEmptyState title="No data for this month" />
      </ReportSection>
    );
  }

  const row = data[0];
  const positive = row.netProfit >= 0;

  return (
    <ReportSection
      title="Profit & loss"
      description={`${row.period}${row.priorRevenue !== undefined ? " vs previous month" : ""}`}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border p-5">
          <p className="text-sm text-muted-foreground">Revenue</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-success">{formatCurrency(row.revenue)}</p>
          {row.priorRevenue !== undefined && (
            <div className="mt-2">
              <Delta label="vs last month" value={row.revenue - row.priorRevenue} />
            </div>
          )}
        </div>

        <div className="rounded-xl border p-5">
          <p className="text-sm text-muted-foreground">Expenses</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-destructive">{formatCurrency(row.expenses)}</p>
          {row.priorExpenses !== undefined && (
            <div className="mt-2">
              <Delta label="vs last month" value={row.expenses - row.priorExpenses} invert />
            </div>
          )}
        </div>

        <div className={cn("rounded-xl border p-5", positive ? "border-success/30" : "border-destructive/30")}>
          <p className="text-sm text-muted-foreground">Net profit</p>
          <p className={cn("mt-1 text-2xl font-semibold tracking-tight", positive ? "text-success" : "text-destructive")}>
            {formatCurrency(row.netProfit)}
          </p>
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            {positive ? <ArrowUpRight className="h-3.5 w-3.5 text-success" /> : <Minus className="h-3.5 w-3.5 text-destructive" />}
            <span>
              <span className="font-medium text-foreground">{row.marginPercent}%</span> margin
            </span>
          </p>
        </div>
      </div>

      {row.priorMarginPercent !== undefined && (
        <p className="mt-3 text-xs text-muted-foreground">
          Prior-period margin: {row.priorMarginPercent}% (vs {row.marginPercent}% this month)
        </p>
      )}
    </ReportSection>
  );
}
