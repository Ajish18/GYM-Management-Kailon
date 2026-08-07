import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { MeasurementComparison } from "@/lib/data/progress";
import { formatDate } from "@/lib/format";

function DeltaRow({ label, delta, unit }: { label: string; delta: number | null; unit: string }) {
  if (delta === null) {
    return (
      <div className="flex items-center justify-between py-1.5 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">—</span>
      </div>
    );
  }

  const Icon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
  const sign = delta > 0 ? "+" : "";

  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="inline-flex items-center gap-1 font-medium">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {sign}
        {delta}
        {unit}
      </span>
    </div>
  );
}

/** Deltas are shown neutrally (no green/red "good vs. bad" framing) — whether
 *  a drop in weight or a rise in muscle % is "good" depends on the member's
 *  own goal, which this module doesn't know. */
export function ComparisonCard({ comparison }: { comparison: MeasurementComparison | null }) {
  if (!comparison) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly comparison</CardTitle>
          <CardDescription>Record at least two measurements to see change over time.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { latest, compareTo, daysBetween, deltas } = comparison;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly comparison</CardTitle>
        <CardDescription>
          {formatDate(latest.measuredAt)} vs. {formatDate(compareTo.measuredAt)} ({daysBetween} days apart)
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        <DeltaRow label="Weight" delta={deltas.weightKg} unit=" kg" />
        <DeltaRow label="BMI" delta={deltas.bmi} unit="" />
        <DeltaRow label="Body fat" delta={deltas.bodyFatPercent} unit="%" />
        <DeltaRow label="Muscle" delta={deltas.musclePercent} unit="%" />
      </CardContent>
    </Card>
  );
}
