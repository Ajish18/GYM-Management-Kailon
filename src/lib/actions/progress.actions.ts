"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireGymScope } from "@/lib/auth/guards";
import { uploadFile, deleteFile } from "@/lib/storage";
import {
  recordMeasurementSchema,
  photoMetaSchema,
  type RecordMeasurementInput,
} from "@/lib/validations/progress";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

type CallerUser = { id: string; role: string };

/** Resolves which member an entry is being recorded for and what `source`
 *  tag it should carry (docs/09 §10.11): Members can only ever write their
 *  own SELF-tagged entries; Owner/Trainer must name a member explicitly and
 *  get TRAINER-tagged entries, with Trainer further restricted to members
 *  actually assigned to them (never a client-trusted memberId across roles). */
async function resolveMemberContext(
  user: CallerUser,
  gymId: string,
  requestedMemberId: string | undefined,
): Promise<
  { ok: true; memberId: string; source: "SELF" | "TRAINER" } | { ok: false; error: string }
> {
  if (user.role === "MEMBER") {
    return { ok: true, memberId: user.id, source: "SELF" };
  }

  if (!requestedMemberId) {
    return { ok: false, error: "Select a member" };
  }

  const member = await db.user.findFirst({
    where: { id: requestedMemberId, gymId, role: "MEMBER", deletedAt: null },
    include: { memberProfile: true },
  });
  if (!member) return { ok: false, error: "Member not found" };

  if (user.role === "TRAINER" && member.memberProfile?.assignedTrainerId !== user.id) {
    return { ok: false, error: "This member isn't assigned to you" };
  }

  return { ok: true, memberId: member.id, source: "TRAINER" };
}

function revalidateProgressPaths() {
  revalidatePath("/member/progress");
  revalidatePath("/trainer/progress");
}

/** Records a measurement. BMI is always computed here from weight/height —
 *  never accepted from the client — falling back to the member's most
 *  recently known height when this entry only supplies weight (docs/12
 *  §12.11/12.12). */
export async function recordMeasurementAction(
  input: RecordMeasurementInput,
): Promise<ActionResult<{ id: string }>> {
  const { user, gymId } = await requireGymScope("GYM_OWNER", "TRAINER", "MEMBER");

  const parsed = recordMeasurementSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const ctx = await resolveMemberContext(user, gymId, parsed.data.memberId);
  if (!ctx.ok) return { success: false, error: ctx.error };
  const { memberId, source } = ctx;

  const {
    measuredAt,
    weightKg,
    heightCm,
    bodyFatPercent,
    musclePercent,
    chestCm,
    waistCm,
    shoulderCm,
    armsCm,
    legsCm,
  } = parsed.data;

  let heightForBmi = heightCm ?? null;
  if (heightForBmi == null && weightKg != null) {
    const lastKnown = await db.bodyMeasurement.findFirst({
      where: { gymId, memberId, heightCm: { not: null } },
      orderBy: { measuredAt: "desc" },
    });
    heightForBmi = lastKnown ? Number(lastKnown.heightCm) : null;
  }

  const bmi =
    weightKg != null && heightForBmi != null
      ? Math.round((weightKg / Math.pow(heightForBmi / 100, 2)) * 10) / 10
      : null;

  const created = await db.bodyMeasurement.create({
    data: {
      gymId,
      memberId,
      measuredAt: new Date(measuredAt),
      recordedById: user.id,
      weightKg: weightKg ?? null,
      heightCm: heightCm ?? null,
      bmi,
      bodyFatPercent: bodyFatPercent ?? null,
      musclePercent: musclePercent ?? null,
      chestCm: chestCm ?? null,
      waistCm: waistCm ?? null,
      shoulderCm: shoulderCm ?? null,
      armsCm: armsCm ?? null,
      legsCm: legsCm ?? null,
      source,
    },
  });

  revalidateProgressPaths();
  return { success: true, data: { id: created.id } };
}

/** Corrections are Owner-only — members/trainers can only add entries,
 *  never delete/edit (append-only trust model, docs/09 §10.11). */
export async function deleteMeasurementAction(id: string): Promise<ActionResult> {
  const { gymId } = await requireGymScope("GYM_OWNER");

  const existing = await db.bodyMeasurement.findFirst({ where: { id, gymId } });
  if (!existing) return { success: false, error: "Entry not found" };

  await db.bodyMeasurement.delete({ where: { id } });
  revalidateProgressPaths();
  return { success: true, data: undefined };
}

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

/** Uploads a progress photo. Takes FormData (not a typed object) because it
 *  carries a File — everything else is validated through photoMetaSchema. */
export async function uploadProgressPhotoAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const { user, gymId } = await requireGymScope("GYM_OWNER", "TRAINER", "MEMBER");

  const requestedMemberId = formData.get("memberId");
  const ctx = await resolveMemberContext(
    user,
    gymId,
    typeof requestedMemberId === "string" && requestedMemberId.length > 0
      ? requestedMemberId
      : undefined,
  );
  if (!ctx.ok) return { success: false, error: ctx.error };

  const parsed = photoMetaSchema.safeParse({
    takenAt: formData.get("takenAt"),
    pose: formData.get("pose"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Choose a photo to upload" };
  }
  if (!file.type.startsWith("image/")) {
    return { success: false, error: "Only image files are supported" };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { success: false, error: "Photo must be under 8MB" };
  }

  const ext = file.type === "image/png" ? "png" : "jpg";
  const path = `progress-photos/${gymId}/${ctx.memberId}/${Date.now()}-${parsed.data.pose.toLowerCase()}.${ext}`;

  try {
    await uploadFile(path, file, file.type);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Upload failed — please try again",
    };
  }

  const created = await db.progressPhoto.create({
    data: {
      gymId,
      memberId: ctx.memberId,
      takenAt: new Date(parsed.data.takenAt),
      pose: parsed.data.pose,
      storagePath: path,
      uploadedById: user.id,
    },
  });

  revalidateProgressPaths();
  return { success: true, data: { id: created.id } };
}

/** Owner-only correction, same append-only rule as measurements. */
export async function deletePhotoAction(id: string): Promise<ActionResult> {
  const { gymId } = await requireGymScope("GYM_OWNER");

  const existing = await db.progressPhoto.findFirst({ where: { id, gymId } });
  if (!existing) return { success: false, error: "Photo not found" };

  await deleteFile(existing.storagePath);
  await db.progressPhoto.delete({ where: { id } });
  revalidateProgressPaths();
  return { success: true, data: undefined };
}
