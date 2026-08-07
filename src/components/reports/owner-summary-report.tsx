import { ReportEmptyState, ReportSection } from "@/components/reports/report-section";
import { Wallet, Receipt, TrendingUp, UserPlus, UserMinus, Activity } from "lucide-react";
import type { OwnerSummaryRow } from "@/lib/data/reports";
import { formatCurrency } from "@/lib/format";

/** Owner Summary — a single-row headline of the selected month: revenue,
 *  expenses, net profit, new/churned members and avg attendance. */
export function OwnerSummaryReport({ data }: { data: OwnerSummaryRow[]; filters?: unknown }) {
  if (data.length === 0) {
    return (
      <ReportSection title="Owner summary" description="Snapshot of the selected month">
        <ReportEmptyState title="No summary data" />
      </ReportSection>
    );
  }

  const row = data[0];
  const positive = row.netProfit >= 0;

  const cards = [
    {
      label: "Revenue",
      value: formatCurrency(row.revenue),
      icon: Wallet,
      accent: "bg-primary/10 text-primary" as const,
      hint: row.period,
    },
    {
      label: "Expenses",
      value: formatCurrency(row.expenses),
      icon: Receipt,
      accent: "bg-destructive/10 text-destructive" as const,
    },
    {
      label: "Net profit",
      value: formatCurrency(row.netProfit),
      icon: TrendingUp,
      accent: positive ? ("bg-success/10 text-success" as const) : ("bg-destructive/10 text-destructive" as const),
      hint: positive ? "Profitable month" : "Loss-making month",
    },
    {
      label: "New members",
      value: row.newMembers,
      icon: UserPlus,
      accent: "bg-primary/10 text-primary" as const,
    },
    {
      label: "Churned members",
      value: row.churnedMembers,
      icon: UserMinus,
      accent: "bg-muted text-muted-foreground" as const,
    },
    {
      label: "Avg attendance",
      value: `${row.avgAttendancePercent}%`,
      icon: Activity,
      accent: "bg-streak/10 text-streak" as const,
      hint: "of active members × days",
    },
  ];

  return (
    <ReportSection title="Owner summary" description={`Snapshot of ${row.period}`}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="flex items-start justify-between gap-3 rounded-xl border p-4">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="mt-1 truncate text-xl font-semibold tracking-tight">{c.value}</p>
              {c.hint && <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>}
            </div>
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${c.accent}`}>
              <c.icon className="h-4 w-4" />
            </div>
          </div>
        ))}
      </div>
    </ReportSection>
  );
}
