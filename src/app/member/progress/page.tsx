import type { Metadata } from "next";
import { requireGymScope } from "@/lib/auth/guards";
import {
  getMeasurements,
  getMonthlyComparison,
  getTransformationTimeline,
} from "@/lib/data/progress";
import { MeasurementForm } from "@/components/progress/measurement-form";
import { MeasurementHistory } from "@/components/progress/measurement-history";
import { TrendChartLazy } from "@/components/progress/trend-chart-lazy";
import { ComparisonCard } from "@/components/progress/comparison-card";
import { PhotoUpload } from "@/components/progress/photo-upload";
import { PhotoTimeline } from "@/components/progress/photo-timeline";

export const metadata: Metadata = { title: "Progress" };

export default async function MemberProgressPage() {
  const { user, gymId } = await requireGymScope("MEMBER");

  const [measurements, comparison, timeline] = await Promise.all([
    getMeasurements(gymId, user.id),
    getMonthlyComparison(gymId, user.id),
    getTransformationTimeline(gymId, user.id),
  ]);

  // getMeasurements returns newest-first; charts want chronological order.
  const chronological = [...measurements].reverse();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your progress</h1>
        <p className="text-muted-foreground">
          Log measurements and photos to see your trend over time.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MeasurementForm
            title="Log a measurement"
            description="Self-reported entries are tagged accordingly — your trainer's entries carry a verified badge."
          />
        </div>
        <ComparisonCard comparison={comparison} />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <TrendChartLazy
          label="Weight"
          unit="kg"
          colorVar="--chart-1"
          data={chronological.map((m) => ({ date: m.measuredAt, value: m.weightKg }))}
        />
        <TrendChartLazy
          label="BMI"
          colorVar="--chart-2"
          data={chronological.map((m) => ({ date: m.measuredAt, value: m.bmi }))}
        />
        <TrendChartLazy
          label="Body fat"
          unit="%"
          colorVar="--chart-3"
          data={chronological.map((m) => ({ date: m.measuredAt, value: m.bodyFatPercent }))}
        />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Measurement history</h2>
        <MeasurementHistory entries={measurements} canDelete={false} />
      </div>

      <PhotoUpload />

      <div>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Transformation timeline</h2>
        <PhotoTimeline entries={timeline} />
      </div>
    </div>
  );
}
