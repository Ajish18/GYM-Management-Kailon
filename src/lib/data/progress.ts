import "server-only";
import { db } from "@/lib/db";
import { getSignedUrl } from "@/lib/storage";

// Every read helper below takes an explicit (gymId, memberId) pair rather than
// baking in any role assumption — Member/Trainer pages pass their own scoped
// memberId today; an Owner-facing view can call the same functions later with
// any member in the gym without changes here.

export type MeasurementEntry = {
  id: string;
  measuredAt: Date;
  weightKg: number | null;
  heightCm: number | null;
  bmi: number | null;
  bodyFatPercent: number | null;
  musclePercent: number | null;
  chestCm: number | null;
  waistCm: number | null;
  shoulderCm: number | null;
  armsCm: number | null;
  legsCm: number | null;
  source: "TRAINER" | "SELF";
  recordedByName: string | null;
};

function toNum(d: unknown): number | null {
  return d === null || d === undefined ? null : Number(d);
}

export async function getMeasurements(gymId: string, memberId: string): Promise<MeasurementEntry[]> {
  const rows = await db.bodyMeasurement.findMany({
    where: { gymId, memberId },
    orderBy: { measuredAt: "desc" },
    include: { recordedBy: { select: { name: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    measuredAt: r.measuredAt,
    weightKg: toNum(r.weightKg),
    heightCm: toNum(r.heightCm),
    bmi: toNum(r.bmi),
    bodyFatPercent: toNum(r.bodyFatPercent),
    musclePercent: toNum(r.musclePercent),
    chestCm: toNum(r.chestCm),
    waistCm: toNum(r.waistCm),
    shoulderCm: toNum(r.shoulderCm),
    armsCm: toNum(r.armsCm),
    legsCm: toNum(r.legsCm),
    source: r.source,
    recordedByName: r.recordedBy?.name ?? null,
  }));
}

export type MeasurementComparison = {
  latest: MeasurementEntry;
  compareTo: MeasurementEntry;
  daysBetween: number;
  deltas: {
    weightKg: number | null;
    bmi: number | null;
    bodyFatPercent: number | null;
    musclePercent: number | null;
  };
};

/** Latest entry vs. whichever earlier entry lands closest to ~30 days before
 *  it (FR §12.11 "monthly comparison" — simplest reasonable interpretation,
 *  not a rigid calendar-month rollup). Returns null with fewer than 2 entries. */
export async function getMonthlyComparison(
  gymId: string,
  memberId: string,
): Promise<MeasurementComparison | null> {
  const entries = await getMeasurements(gymId, memberId); // desc by measuredAt
  if (entries.length < 2) return null;

  const [latest, ...rest] = entries;
  const targetMs = latest.measuredAt.getTime() - 30 * 24 * 60 * 60 * 1000;

  let compareTo = rest[0];
  let bestDiff = Math.abs(rest[0].measuredAt.getTime() - targetMs);
  for (const entry of rest) {
    const diff = Math.abs(entry.measuredAt.getTime() - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      compareTo = entry;
    }
  }

  const delta = (a: number | null, b: number | null) =>
    a !== null && b !== null ? Math.round((a - b) * 10) / 10 : null;

  const daysBetween = Math.round(
    (latest.measuredAt.getTime() - compareTo.measuredAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  return {
    latest,
    compareTo,
    daysBetween,
    deltas: {
      weightKg: delta(latest.weightKg, compareTo.weightKg),
      bmi: delta(latest.bmi, compareTo.bmi),
      bodyFatPercent: delta(latest.bodyFatPercent, compareTo.bodyFatPercent),
      musclePercent: delta(latest.musclePercent, compareTo.musclePercent),
    },
  };
}

export type ProgressPhotoItem = {
  id: string;
  takenAt: Date;
  pose: "FRONT" | "SIDE" | "BACK";
  signedUrl: string;
  uploadedByName: string | null;
};

/** Signed URLs are short-lived (default 1hr) and must never be cached beyond
 *  the request that generated them — always re-resolve on each page load. */
export async function getProgressPhotos(
  gymId: string,
  memberId: string,
): Promise<ProgressPhotoItem[]> {
  const rows = await db.progressPhoto.findMany({
    where: { gymId, memberId },
    orderBy: { takenAt: "desc" },
    include: { uploadedBy: { select: { name: true } } },
  });

  const signed = await Promise.all(
    rows.map(async (r) => {
      try {
        return await getSignedUrl(r.storagePath, 3600);
      } catch {
        // Storage bucket may not exist yet in a pre-launch environment —
        // surface an empty string rather than failing the whole page.
        return "";
      }
    }),
  );

  return rows.map((r, i) => ({
    id: r.id,
    takenAt: r.takenAt,
    pose: r.pose,
    signedUrl: signed[i],
    uploadedByName: r.uploadedBy?.name ?? null,
  }));
}

export type TimelineEntry = ProgressPhotoItem & {
  closestMeasurement: { weightKg: number | null; bmi: number | null; measuredAt: Date } | null;
};

/** Chronological photo timeline, each frame annotated with whichever
 *  measurement entry landed closest in time to it (no fixed cutoff window —
 *  gyms may only measure sporadically, and a stale-but-closest snapshot is
 *  still more useful than none). */
export async function getTransformationTimeline(
  gymId: string,
  memberId: string,
): Promise<TimelineEntry[]> {
  const [photos, measurements] = await Promise.all([
    getProgressPhotos(gymId, memberId),
    getMeasurements(gymId, memberId),
  ]);

  return photos.map((photo) => {
    let closest: MeasurementEntry | null = null;
    let bestDiff = Infinity;
    for (const m of measurements) {
      const diff = Math.abs(m.measuredAt.getTime() - photo.takenAt.getTime());
      if (diff < bestDiff) {
        bestDiff = diff;
        closest = m;
      }
    }
    return {
      ...photo,
      closestMeasurement: closest
        ? { weightKg: closest.weightKg, bmi: closest.bmi, measuredAt: closest.measuredAt }
        : null,
    };
  });
}

export async function getLatestHeightCm(gymId: string, memberId: string): Promise<number | null> {
  const row = await db.bodyMeasurement.findFirst({
    where: { gymId, memberId, heightCm: { not: null } },
    orderBy: { measuredAt: "desc" },
  });
  return row ? Number(row.heightCm) : null;
}

export type AssignedMember = { id: string; name: string; image: string | null };

/** Members assigned to this trainer, for the trainer-side member picker. */
export async function getAssignedMembers(gymId: string, trainerId: string): Promise<AssignedMember[]> {
  const rows = await db.user.findMany({
    where: {
      gymId,
      role: "MEMBER",
      deletedAt: null,
      memberProfile: { assignedTrainerId: trainerId },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, image: true },
  });
  return rows;
}
