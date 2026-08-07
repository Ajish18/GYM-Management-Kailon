import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { PnlSummary } from "@/lib/data/expenses";
import { formatCurrency } from "@/lib/format";

function Delta({ current, previous, invertGood = false }: { current: number; previous: number; invertGood?: boolean }) {
  if (previous === 0 && current === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        No change vs last month
      </span>
    );
  }

  const diff = current - previous;
  const percent = previous !== 0 ? (diff / Math.abs(previous)) * 100 : 100;
  const isFlat = Math.abs(percent) < 0.05;
  const isUp = diff > 0;
  // For revenue/profit, up is good; for expenses, up is bad (invertGood).
  const isGood = isFlat ? null : invertGood ? !isUp : isUp;

  const colorClass = isFlat
    ? "text-muted-foreground"
    : isGood
      ? "text-success"
      : "text-destructive";

  const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${colorClass}`}>
      <Icon className="h-3 w-3" />
      {isFlat ? "Flat" : `${isUp ? "+" : ""}${percent.toFixed(1)}%`} vs last month
    </span>
  );
}

export function PnlSummaryCard({ pnl, monthLabel }: { pnl: PnlSummary; monthLabel: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profit &amp; loss — {monthLabel}</CardTitle>
        <CardDescription>Revenue collected minus expenses recorded this month.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1 rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">Revenue</p>
            <p className="text-2xl font-semibold tracking-tight">{formatCurrency(pnl.revenue)}</p>
            <Delta current={pnl.revenue} previous={pnl.prevRevenue} />
          </div>
          <div className="space-y-1 rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">Expenses</p>
            <p className="text-2xl font-semibold tracking-tight">{formatCurrency(pnl.expenses)}</p>
            <Delta current={pnl.expenses} previous={pnl.prevExpenses} invertGood />
          </div>
          <div className="space-y-1 rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">Net profit</p>
            <p
              className={`text-2xl font-semibold tracking-tight ${pnl.netProfit < 0 ? "text-destructive" : ""}`}
            >
              {formatCurrency(pnl.netProfit)}
            </p>
            <Delta current={pnl.netProfit} previous={pnl.prevNetProfit} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
