import { Badge } from "@/components/ui/badge";
import { CalendarDays, Check, Minus, Zap } from "lucide-react";
import type { WorkoutHistoryItem } from "@/lib/data/workouts";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, { label: string; badge: "default" | "secondary" | "destructive"; icon: typeof Check }> = {
  COMPLETED: { label: "Completed", badge: "default", icon: Check },
  PARTIAL: { label: "Partial", badge: "secondary", icon: Minus },
  SKIPPED: { label: "Skipped", badge: "destructive", icon: Minus },
};

function formatWeight(w: number | { toNumber: () => number } | null | undefined) {
  if (w == null) return null;
  const n = Number(w);
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

/** Workout History — chronological workout logs with their sets. Each set
 *  shows exercise, weight × reps and a flame marker when it was a PR. */
export function WorkoutHistoryList({ history }: { history: WorkoutHistoryItem[] }) {
  if (history.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed py-14 text-center">
        <CalendarDays className="mx-auto h-6 w-6 text-muted-foreground/60" />
        <p className="mt-2 text-sm font-medium">No workout history yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Logged workouts will show up here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((log) => {
        const style = STATUS_STYLE[log.status] ?? STATUS_STYLE.COMPLETED;
        const Icon = style.icon;
        return (
          <div key={log.id} className="rounded-2xl border p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold capitalize">
                  {new Date(log.logDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                </p>
              </div>
              <Badge variant={style.badge} className="gap-1">
                <Icon className="h-3 w-3" />
                {style.label}
              </Badge>
            </div>

            {log.notes && <p className="mt-3 text-sm text-muted-foreground">{log.notes}</p>}

            {log.sets.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {log.sets.map((s) => {
                  const weight = formatWeight(s.actualWeight);
                  return (
                    <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 flex-1 truncate">{s.exercise.name}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {s.setNumber && <span className="text-xs">Set {s.setNumber} · </span>}
                        {weight != null ? `${weight} kg` : "bodyweight"}
                        {s.actualReps != null && ` × ${s.actualReps}`}
                      </span>
                      {s.isPr && (
                        <span className={cn("inline-flex shrink-0 items-center gap-1 text-xs font-medium text-streak")}>
                          <Zap className="h-3 w-3" />
                          PR
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
