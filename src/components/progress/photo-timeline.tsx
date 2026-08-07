import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import type { TimelineEntry } from "@/lib/data/progress";
import { formatDate } from "@/lib/format";

const POSE_LABEL: Record<TimelineEntry["pose"], string> = {
  FRONT: "Front",
  SIDE: "Side",
  BACK: "Back",
};

/** Straightforward vertical timeline — newest first — pairing each photo
 *  with whichever measurement landed closest to it in time. Signed URLs are
 *  resolved server-side per request and never cached across requests. */
export function PhotoTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-12 text-center">
        <p className="font-medium">No progress photos yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload the first photo above to start a visual timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <div key={entry.id} className="flex gap-4 rounded-2xl border p-3">
          <div className="relative aspect-[3/4] w-28 shrink-0 overflow-hidden rounded-lg bg-muted">
            {entry.signedUrl ? (
              <Image
                src={entry.signedUrl}
                alt={`${POSE_LABEL[entry.pose]} progress photo, ${formatDate(entry.takenAt)}`}
                fill
                unoptimized
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-center text-xs text-muted-foreground">
                Photo unavailable
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center gap-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{formatDate(entry.takenAt)}</span>
              <Badge variant="secondary">{POSE_LABEL[entry.pose]}</Badge>
            </div>
            {entry.closestMeasurement ? (
              <p className="text-sm text-muted-foreground">
                {entry.closestMeasurement.weightKg !== null && `${entry.closestMeasurement.weightKg} kg`}
                {entry.closestMeasurement.weightKg !== null && entry.closestMeasurement.bmi !== null && " · "}
                {entry.closestMeasurement.bmi !== null && `BMI ${entry.closestMeasurement.bmi}`}
                {" "}
                <span className="text-xs">(measured {formatDate(entry.closestMeasurement.measuredAt)})</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No measurement on record nearby</p>
            )}
            {entry.uploadedByName && (
              <p className="text-xs text-muted-foreground">Uploaded by {entry.uploadedByName}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
