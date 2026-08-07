import { ReportEmptyState, ReportSection } from "@/components/reports/report-section";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { TrainerPerformanceRow } from "@/lib/data/reports";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Trainer Performance — per-trainer retention, attendance and workout
 *  adherence. Percentages render as progress bars so the page scans fast. */
export function TrainerPerformanceReport({ data }: { data: TrainerPerformanceRow[]; filters?: unknown }) {
  return (
    <ReportSection title="Trainer performance" description="Retention, attendance and workout adherence per trainer">
      {data.length === 0 ? (
        <ReportEmptyState title="No trainers" description="Trainers with assigned members will appear here." />
      ) : (
        <ul className="divide-y">
          {data.map((t) => (
            <li key={t.trainerId} className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs">{initials(t.trainerName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.trainerName}</p>
                  <p className="text-xs text-muted-foreground">{t.assignedMembers} assigned</p>
                </div>
              </div>

              <div className="grid flex-[2] grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
                <Metric label="Retention" value={`${t.retentionPercent}%`} percent={t.retentionPercent} color="bg-primary" />
                <Metric label="Avg attendance" value={`${t.avgAttendance}/member`} percent={Math.min(100, t.avgAttendance * 10)} color="bg-streak" />
                <Metric label="Workout adherence" value={`${t.workoutAdherencePercent}%`} percent={t.workoutAdherencePercent} color="bg-success" />
              </div>

              <div className="shrink-0 rounded-lg border px-3 py-2 text-center sm:text-right">
                <p className="text-lg font-semibold leading-none">{t.prsLogged}</p>
                <p className="mt-1 text-xs text-muted-foreground">PRs logged</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </ReportSection>
  );
}

function Metric({ label, value, percent, color }: { label: string; value: string; percent: number; color: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium tabular-nums">{value}</p>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
    </div>
  );
}
