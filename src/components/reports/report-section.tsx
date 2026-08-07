import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Shared card wrapper for every report block. Keeps the heading, summary
 *  line and table/chart body visually consistent across the Reports page. */
export function ReportSection({
  title,
  description,
  actions,
  className,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  /** Right-aligned slot (e.g. a "N records" count or export control). */
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("rounded-2xl", className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** Standard empty state for a report with no rows in the current filter range. */
export function ReportEmptyState({
  title = "Nothing to show",
  description = "Adjust the report filters to see data here.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-14 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

/** Summary caption like "42 records · ₹12,500 total" shown above a table. */
export function ReportSummary({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
