import type { Metadata } from "next";
import { requireGymScope } from "@/lib/auth/guards";
import {
  getAssignedMembers,
  getMeasurements,
  getMonthlyComparison,
  getTransformationTimeline,
} from "@/lib/data/progress";
import { MemberPicker } from "@/components/progress/member-picker";
import { MeasurementForm } from "@/components/progress/measurement-form";
import { MeasurementHistory } from "@/components/progress/measurement-history";
import { TrendChartLazy } from "@/components/progress/trend-chart-lazy";
import { ComparisonCard } from "@/components/progress/comparison-card";
import { PhotoUpload } from "@/components/progress/photo-upload";
import { PhotoTimeline } from "@/components/progress/photo-timeline";

export const metadata: Metadata = { title: "Progress" };

export default async function TrainerProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ memberId?: string }>;
}) {
  const { user, gymId } = await requireGymScope("TRAINER");
  const { memberId } = await searchParams;

  const members = await getAssignedMembers(gymId, user.id);

  if (members.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Member progress</h1>
          <p className="text-muted-foreground">Record measurements and photos for your members.</p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <p className="font-medium">No members assigned to you yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Once the gym owner assigns members to you, they&apos;ll show up here.
          </p>
        </div>
      </div>
    );
  }

  const selected = members.find((m) => m.id === memberId) ?? members[0];

  const [measurements, comparison, timeline] = await Promise.all([
    getMeasurements(gymId, selected.id),
    getMonthlyComparison(gymId, selected.id),
    getTransformationTimeline(gymId, selected.id),
  ]);

  const chronological = [...measurements].reverse();

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Member progress</h1>
          <p className="text-muted-foreground">Record measurements and photos for your members.</p>
        </div>
        <MemberPicker members={members} selectedId={selected.id} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MeasurementForm
            key={selected.id}
            memberId={selected.id}
            title={`Record a measurement — ${selected.name}`}
            description="All fields are optional — enter at least one. This entry is tagged as trainer-verified."
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

      <PhotoUpload key={`photo-${selected.id}`} memberId={selected.id} />

      <div>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Transformation timeline</h2>
        <PhotoTimeline entries={timeline} />
      </div>
    </div>
  );
}
