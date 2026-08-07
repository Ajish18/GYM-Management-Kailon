import { ReportEmptyState, ReportSection } from "@/components/reports/report-section";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ReportColumn<T> = {
  header: string;
  cell: (row: T, index: number) => React.ReactNode;
  /** Alignment / width hints applied to the header and body cells. */
  className?: string;
};

/** Generic report table: renders a section card, an optional summary line, a
 *  scrollable table, and a consistent empty state. Report pages pass typed
 *  row data and column renderers — all filtering/sorting already happened
 *  server-side, so these components stay purely presentational. */
export function ReportTable<T>({
  title,
  description,
  columns,
  data,
  keyFn,
  summary,
  emptyTitle = "Nothing to show",
  emptyDescription = "Adjust the report filters to see data here.",
  footer,
  className,
}: {
  title: string;
  description?: string;
  columns: ReportColumn<T>[];
  data: T[];
  keyFn: (row: T, index: number) => string;
  summary?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <ReportSection title={title} description={description} className={className}>
      {data.length === 0 ? (
        <ReportEmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="space-y-3">
          {summary && <p className="text-sm text-muted-foreground">{summary}</p>}
          <div className="overflow-x-auto rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((c) => (
                    <TableHead key={c.header} className={c.className}>
                      {c.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, i) => (
                  <TableRow key={keyFn(row, i)}>
                    {columns.map((c) => (
                      <TableCell key={c.header} className={c.className}>
                        {c.cell(row, i)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {footer && <p className="text-xs text-muted-foreground">{footer}</p>}
        </div>
      )}
    </ReportSection>
  );
}
