"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireGymScope } from "@/lib/auth/guards";
import {
  createCategorySchema,
  createExpenseSchema,
  updateExpenseSchema,
  type CreateCategoryInput,
  type CreateExpenseInput,
  type UpdateExpenseInput,
} from "@/lib/validations/expenses";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createCategoryAction(input: CreateCategoryInput): Promise<ActionResult> {
  const { gymId } = await requireGymScope("GYM_OWNER");
  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await db.expenseCategory.findFirst({
    where: {
      OR: [{ gymId }, { gymId: null }],
      name: { equals: parsed.data.name, mode: "insensitive" },
    },
  });
  if (existing) {
    return { success: false, error: "A category with this name already exists" };
  }

  await db.expenseCategory.create({ data: { gymId, name: parsed.data.name } });

  revalidatePath("/owner/expenses");
  return { success: true, data: undefined };
}

/** Only gym-owned categories can be toggled — the shared global defaults
 *  (gymId: null) are seeded once for every gym, so flipping one off here
 *  would silently deactivate it for every other tenant too. */
export async function toggleCategoryActiveAction(
  categoryId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const { gymId } = await requireGymScope("GYM_OWNER");
  const category = await db.expenseCategory.findFirst({ where: { id: categoryId, gymId } });
  if (!category) {
    return { success: false, error: "Only categories your gym created can be deactivated" };
  }

  await db.expenseCategory.update({ where: { id: categoryId }, data: { isActive } });
  revalidatePath("/owner/expenses");
  return { success: true, data: undefined };
}

export async function createExpenseAction(input: CreateExpenseInput): Promise<ActionResult> {
  const { user, gymId } = await requireGymScope("GYM_OWNER");
  const parsed = createExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { categoryId, amount, expenseDate, vendorNote } = parsed.data;

  const category = await db.expenseCategory.findFirst({
    where: { id: categoryId, OR: [{ gymId }, { gymId: null }], isActive: true },
  });
  if (!category) {
    return { success: false, error: "Category not found or inactive" };
  }

  await db.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        gymId,
        categoryId,
        amount,
        expenseDate,
        vendorNote,
        recordedById: user.id,
      },
    });

    await tx.auditLog.create({
      data: {
        gymId,
        actorId: user.id,
        action: "expense.create",
        targetType: "expense",
        targetId: expense.id,
        afterState: { categoryId, amount, expenseDate: expenseDate.toISOString(), vendorNote },
      },
    });
  });

  revalidatePath("/owner/expenses");
  return { success: true, data: undefined };
}

export async function updateExpenseAction(input: UpdateExpenseInput): Promise<ActionResult> {
  const { user, gymId } = await requireGymScope("GYM_OWNER");
  const parsed = updateExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { id, categoryId, amount, expenseDate, vendorNote } = parsed.data;

  const existing = await db.expense.findFirst({ where: { id, gymId } });
  if (!existing) {
    return { success: false, error: "Expense not found" };
  }

  const category = await db.expenseCategory.findFirst({
    where: { id: categoryId, OR: [{ gymId }, { gymId: null }], isActive: true },
  });
  if (!category) {
    return { success: false, error: "Category not found or inactive" };
  }

  await db.$transaction(async (tx) => {
    await tx.expense.update({
      where: { id },
      data: { categoryId, amount, expenseDate, vendorNote },
    });

    await tx.auditLog.create({
      data: {
        gymId,
        actorId: user.id,
        action: "expense.update",
        targetType: "expense",
        targetId: id,
        beforeState: {
          categoryId: existing.categoryId,
          amount: Number(existing.amount),
          expenseDate: existing.expenseDate.toISOString(),
          vendorNote: existing.vendorNote,
        },
        afterState: { categoryId, amount, expenseDate: expenseDate.toISOString(), vendorNote },
      },
    });
  });

  revalidatePath("/owner/expenses");
  return { success: true, data: undefined };
}

export async function deleteExpenseAction(expenseId: string): Promise<ActionResult> {
  const { user, gymId } = await requireGymScope("GYM_OWNER");
  const existing = await db.expense.findFirst({ where: { id: expenseId, gymId } });
  if (!existing) {
    return { success: false, error: "Expense not found" };
  }

  await db.$transaction(async (tx) => {
    await tx.expense.delete({ where: { id: expenseId } });

    await tx.auditLog.create({
      data: {
        gymId,
        actorId: user.id,
        action: "expense.delete",
        targetType: "expense",
        targetId: expenseId,
        beforeState: {
          categoryId: existing.categoryId,
          amount: Number(existing.amount),
          expenseDate: existing.expenseDate.toISOString(),
          vendorNote: existing.vendorNote,
        },
      },
    });
  });

  revalidatePath("/owner/expenses");
  return { success: true, data: undefined };
}
