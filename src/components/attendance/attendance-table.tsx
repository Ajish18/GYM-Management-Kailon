import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AttendanceCorrectionDialog } from "@/components/attendance/attendance-correction-dialog";
import type { AttendanceListItem } from "@/lib/data/attendance";

function formatTime(date: Date) {
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

/** Attendance list for a day/week/month range. Pass `canCorrect` for
 *  Owner/Reception views so each row gets a correction action — Members
 *  viewing their own history shouldn't get one. Pass `memberHref` to make
 *  each row's member name a link (e.g. to filter this page down to that
 *  member's history + calendar). */
export function AttendanceTable({
  items,
  canCorrect = false,
  memberHref,
}: {
  items: AttendanceListItem[];
  canCorrect?: boolean;
  memberHref?: (memberId: string) => string;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
        <p className="font-medium">No attendance in this range</p>
        <p className="mt-1 text-sm text-muted-foreground">Check-ins will show up here as they happen.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Check-in</TableHead>
            <TableHead>Check-out</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Method</TableHead>
            {canCorrect && <TableHead className="w-10" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                {memberHref ? (
                  <Link href={memberHref(item.memberId)} className="hover:underline">
                    {item.memberName}
                  </Link>
                ) : (
                  item.memberName
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">{formatTime(item.checkInAt)}</TableCell>
              <TableCell className="text-muted-foreground">
                {item.checkOutAt ? (
                  formatTime(item.checkOutAt)
                ) : (
                  <Badge variant="secondary">Checked in</Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDuration(item.sessionDurationMinutes)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {METHOD_LABEL[item.checkInMethod] ?? item.checkInMethod}
                {item.autoCheckedOut && (
                  <Badge variant="outline" className="ml-1.5">
                    Auto-closed
                  </Badge>
                )}
              </TableCell>
              {canCorrect && (
                <TableCell>
                  <AttendanceCorrectionDialog record={item} />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
