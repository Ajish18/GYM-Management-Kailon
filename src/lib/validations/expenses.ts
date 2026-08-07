import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, "Category name is required").max(80),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const createExpenseSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  expenseDate: z.coerce.date({ message: "A valid date is required" }),
  vendorNote: z.string().trim().max(200).optional(),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
// z.coerce fields have an "unknown" pre-coercion input type that differs from
// their parsed output type — CreateExpenseFormInput is what react-hook-form's
// state holds; CreateExpenseInput (output) is what the resolver produces.
export type CreateExpenseFormInput = z.input<typeof createExpenseSchema>;

export const updateExpenseSchema = createExpenseSchema.extend({
  id: z.string().min(1),
});
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type UpdateExpenseFormInput = z.input<typeof updateExpenseSchema>;

export const expenseFilterSchema = z.object({
  search: z.string().trim().max(200).optional(),
  categoryId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
});
export type ExpenseFilterInput = z.infer<typeof expenseFilterSchema>;
