import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AttendanceReportRow } from "@/lib/data/reports";

function formatDateTime(date: Date) {
  return new Date(date).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(minutes: number | null) {
  if (minutes == null) return "—";
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

const METHOD_LABEL: Record<string, string> = {
  MANUAL: "Manual",
  SELF: "Self",
  QR: "QR",
  AUTO: "Auto",
};

/** Attendance report — renders the already-computed `AttendanceReportRow[]`
 *  (filtering happens server-side via the report page's search params, so
 *  this stays a pure presentational component). */
export function AttendanceReportTable({
  data,
}: {
  data: AttendanceReportRow[];
  filters?: unknown;
}) {
  const totalMinutes = data.reduce((sum, r) => sum + (r.durationMinutes ?? 0), 0);

  return (
    <div className="space-y-3">
      {data.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {data.length} session{data.length === 1 ? "" : "s"}
          {totalMinutes > 0 && ` · ${formatDuration(totalMinutes)} total`}
        </p>
      )}

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <p className="font-medium">No attendance in this range</p>
          <p className="mt-1 text-sm text-muted-foreground">Adjust the report filters to see check-ins.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r, i) => (
                <TableRow key={`${r.memberId}-${r.checkInAt.getTime()}-${i}`}>
                  <TableCell className="font-medium">{r.memberName}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(r.checkInAt)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.checkOutAt ? (
                      formatDateTime(r.checkOutAt)
                    ) : (
                      <Badge variant="secondary">Checked in</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDuration(r.durationMinutes)}</TableCell>
                  <TableCell className="text-muted-foreground">{METHOD_LABEL[r.method] ?? r.method}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
