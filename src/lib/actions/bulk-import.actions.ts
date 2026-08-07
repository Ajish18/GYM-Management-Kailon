"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireGymScope } from "@/lib/auth/guards";
import { bulkMemberRowSchema, BULK_IMPORT_MAX_ROWS, type BulkMemberRowInput } from "@/lib/validations/members";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export type BulkImportResult = {
  created: number;
  errors: { row: number; message: string }[];
};

/** Validate + insert a batch of member rows in one transaction.
 *
 *  Rows are validated individually (mirroring `createMemberSchema`), de-duped
 *  by phone within the file and against existing gym members, then created as
 *  user + memberProfile + memberStreak — the same shape as `createMemberAction`,
 *  so a bad row never blocks the rest of the batch.
 */
export async function bulkImportMembersAction(
  rows: BulkMemberRowInput[],
): Promise<ActionResult<BulkImportResult>> {
  const { gymId } = await requireGymScope("GYM_OWNER", "RECEPTIONIST");

  if (rows.length === 0) return { success: false, error: "No rows to import" };
  if (rows.length > BULK_IMPORT_MAX_ROWS) {
    return { success: false, error: `Too many rows — max ${BULK_IMPORT_MAX_ROWS} per import` };
  }

  const errors: { row: number; message: string }[] = [];
  const valid: { data: BulkMemberRowInput; row: number }[] = [];

  rows.forEach((raw, i) => {
    const parsed = bulkMemberRowSchema.safeParse(raw);
    const rowNumber = i + 1;
    if (!parsed.success) {
      errors.push({ row: rowNumber, message: parsed.error.issues[0]?.message ?? "Invalid row" });
    } else {
      valid.push({ data: parsed.data, row: rowNumber });
    }
  });

  // De-dupe within the file by normalized phone.
  const seen = new Set<string>();
  const unique = valid.filter(({ data, row }) => {
    const key = data.phone.replace(/\D/g, "");
    if (seen.has(key)) {
      errors.push({ row, message: "Duplicate phone in file" });
      return false;
    }
    seen.add(key);
    return true;
  });

  // Skip phones already registered in this gym.
  const existing = await db.user.findMany({
    where: { gymId, phone: { in: unique.map((u) => u.data.phone) }, deletedAt: null },
    select: { phone: true },
  });
  const existingPhones = new Set(existing.map((e) => e.phone));
  const toCreate = unique.filter(({ data, row }) => {
    if (existingPhones.has(data.phone)) {
      errors.push({ row, message: "Phone already registered" });
      return false;
    }
    return true;
  });

  if (toCreate.length === 0) {
    return { success: false, error: "No new rows to import" };
  }

  await db.$transaction(async (tx) => {
    for (const { data } of toCreate) {
      const created = await tx.user.create({
        data: {
          gymId,
          role: "MEMBER",
          status: "ACTIVE",
          name: data.name,
          phone: data.phone,
          email: data.email || null,
        },
      });
      await tx.memberProfile.create({
        data: {
          userId: created.id,
          gymId,
          gender: data.gender,
          dob: data.dob ? new Date(data.dob) : null,
          emergencyContactName: data.emergencyContactName || null,
          emergencyContactPhone: data.emergencyContactPhone || null,
          healthNotes: data.healthNotes || null,
        },
      });
      await tx.memberStreak.create({ data: { memberId: created.id, gymId } });
    }
  });

  revalidatePath("/owner/members");
  revalidatePath("/reception/members");
  return { success: true, data: { created: toCreate.length, errors } };
}
