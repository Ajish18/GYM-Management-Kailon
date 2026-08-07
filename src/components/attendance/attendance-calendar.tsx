import { getMemberAttendanceCalendar } from "@/lib/data/attendance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function intensityClass(sessions: number) {
  if (sessions <= 0) return "bg-muted";
  if (sessions === 1) return "bg-primary/30";
  if (sessions === 2) return "bg-primary/60";
  return "bg-primary";
}

/** Heatmap-style calendar of a member's own attendance history — one cell
 *  per day, 7 per row (a week), oldest first. Self-contained: fetches its
 *  own data given `gymId`/`memberId`, so it can be dropped into the member
 *  dashboard or an owner/reception "view member" panel alike. */
export async function AttendanceCalendar({
  gymId,
  memberId,
  days = 84,
}: {
  gymId: string;
  memberId: string;
  days?: number;
}) {
  const cells = await getMemberAttendanceCalendar(gymId, memberId, days);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance history</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => (
            <div
              key={cell.date}
              title={`${cell.date}: ${cell.sessions} session${cell.sessions === 1 ? "" : "s"}`}
              className={cn("aspect-square w-full rounded-sm", intensityClass(cell.sessions))}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="h-3 w-3 rounded-sm bg-muted" />
          <div className="h-3 w-3 rounded-sm bg-primary/30" />
          <div className="h-3 w-3 rounded-sm bg-primary/60" />
          <div className="h-3 w-3 rounded-sm bg-primary" />
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
}
