import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PersonalRecordItem } from "@/lib/data/workouts";
import { formatDate } from "@/lib/format";

function weightOf(w: PersonalRecordItem["bestWeight"]) {
  return Number(w);
}

/** Personal Records — the member's current best lift per exercise. Rendered
 *  as a compact card list for the member workout page sidebar. */
export function PersonalRecordsCard({ records }: { records: PersonalRecordItem[] }) {
  if (records.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-6 text-center">
        <Trophy className="mx-auto h-6 w-6 text-muted-foreground/60" />
        <p className="mt-2 text-sm font-medium">No personal records yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Lift heavier than your best to set your first PR.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border p-5">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-streak" />
        <h3 className="text-sm font-semibold">Personal records</h3>
      </div>
      <ul className="mt-3 space-y-3">
        {records.map((r) => {
          const weight = weightOf(r.bestWeight);
          return (
            <li key={r.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.exercise.name}</p>
                <p className="text-xs text-muted-foreground">{formatDate(r.achievedAt)}</p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="border-streak/40 text-streak">
                  {weight} kg
                  <span className="ml-1 text-muted-foreground">× {r.bestRepsAtWeight}</span>
                </Badge>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
