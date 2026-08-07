import { z } from "zod";

// Water intake target isn't gym-configurable (no schema field for it) — a
// simple shared constant, importable from both server data helpers and the
// client-side water tracker.
export const DEFAULT_WATER_TARGET_ML = 2500;

// Optional numeric fields (calories/macros) arrive from form inputs as
// strings that may be empty — coerce empties to undefined instead of
// letting z.coerce.number() turn "" into NaN and fail validation.
const optionalNonNegNumber = z
  .union([z.coerce.number().min(0, "Must be 0 or more"), z.literal("")])
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : v));

const optionalTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined));

export const dietMealSchema = z.object({
  mealName: z.string().trim().min(1, "Meal name is required").max(80),
  timeSlot: optionalTrimmedString(40),
  calories: optionalNonNegNumber,
  proteinG: optionalNonNegNumber,
  carbsG: optionalNonNegNumber,
  fatG: optionalNonNegNumber,
  sortOrder: z.coerce.number().int().min(0).default(0),
});
export type DietMealInput = z.infer<typeof dietMealSchema>;
export type DietMealFormInput = z.input<typeof dietMealSchema>;

export const createTemplateSchema = z.object({
  name: z.string().trim().min(2, "Template name is required").max(80),
  description: optionalTrimmedString(500),
  meals: z.array(dietMealSchema).min(1, "Add at least one meal"),
});
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
// z.coerce/transform fields have an "unknown"/string input type (pre-parse)
// that differs from their parsed output type — the *FormInput types are what
// react-hook-form's state actually holds; the plain Input types are what the
// resolver produces for onSubmit/the server action. See useForm's 3rd
// generic (TTransformedValues) in the form components that use these.
export type CreateTemplateFormInput = z.input<typeof createTemplateSchema>;

export const updateTemplateSchema = createTemplateSchema.extend({
  templateId: z.string().min(1),
});
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type UpdateTemplateFormInput = z.input<typeof updateTemplateSchema>;

export const assignPlanSchema = z.object({
  memberId: z.string().min(1, "Select a member"),
  templateId: z.string().min(1, "Select a template"),
  startDate: z.string().min(1, "Select a start date"),
});
export type AssignPlanInput = z.infer<typeof assignPlanSchema>;
export type AssignPlanFormInput = z.input<typeof assignPlanSchema>;

export const updatePlanStatusSchema = z.object({
  planId: z.string().min(1),
  status: z.enum(["COMPLETED", "CANCELLED"]),
});
export type UpdatePlanStatusInput = z.infer<typeof updatePlanStatusSchema>;

export const addDietNoteSchema = z.object({
  dietPlanId: z.string().min(1),
  noteDate: z.string().min(1, "Pick a date"),
  note: z.string().trim().min(1, "Note can't be empty").max(1000),
});
export type AddDietNoteInput = z.infer<typeof addDietNoteSchema>;
export type AddDietNoteFormInput = z.input<typeof addDietNoteSchema>;

export const addSupplementSchema = z.object({
  memberId: z.string().min(1),
  dietPlanId: z.string().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  name: z.string().trim().min(1, "Name is required").max(120),
  dosage: optionalTrimmedString(120),
  timingNote: optionalTrimmedString(200),
});
export type AddSupplementInput = z.infer<typeof addSupplementSchema>;
export type AddSupplementFormInput = z.input<typeof addSupplementSchema>;

export const logWaterSchema = z.object({
  amountMl: z.coerce.number().int().min(1, "Enter an amount greater than 0").max(5000, "That's a lot of water — enter a smaller amount"),
});
export type LogWaterInput = z.infer<typeof logWaterSchema>;
export type LogWaterFormInput = z.input<typeof logWaterSchema>;
