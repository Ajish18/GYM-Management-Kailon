import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { PersonalRecordItem } from "@/lib/data/workouts";

export function PrList({ records }: { records: PersonalRecordItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          Personal records
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground">No personal records yet — log a workout to start setting them.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {records.map((pr) => (
              <div key={pr.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{pr.exercise.name}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(pr.achievedAt)}</p>
                </div>
                <p className="text-sm font-semibold">
                  {Number(pr.bestWeight)}kg × {pr.bestRepsAtWeight}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
