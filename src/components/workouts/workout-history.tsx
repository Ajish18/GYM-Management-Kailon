import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import type { WorkoutHistoryItem } from "@/lib/data/workouts";

const STATUS_VARIANT = {
  COMPLETED: "default",
  PARTIAL: "secondary",
  SKIPPED: "outline",
} as const;

export function WorkoutHistory({ logs }: { logs: WorkoutHistoryItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Workout history</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No workouts logged yet.</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{formatDate(log.logDate)}</p>
                <p className="text-xs text-muted-foreground">
                  {log.sets.length} set{log.sets.length === 1 ? "" : "s"} logged
                  {log.sets.some((s) => s.isPr) ? " · new PR" : ""}
                  {log.notes ? ` · ${log.notes}` : ""}
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[log.status]}>{log.status}</Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
