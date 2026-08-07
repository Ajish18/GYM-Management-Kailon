import { z } from "zod";

export const createPlanSchema = z.object({
  name: z.string().trim().min(2, "Plan name is required").max(80),
  durationDays: z.coerce.number().int().min(1, "Duration must be at least 1 day").max(3650),
  price: z.coerce.number().min(0, "Price can't be negative"),
  description: z.string().trim().max(500).optional(),
  includesTrainer: z.boolean(),
});
export type CreatePlanInput = z.infer<typeof createPlanSchema>;
// z.coerce fields have an "unknown" input type (pre-coercion) that differs
// from their parsed "output" type (number) — CreatePlanFormInput is what
// react-hook-form's state actually holds; CreatePlanInput (output) is what
// the resolver produces for onSubmit/the server action. See useForm's 3rd
// generic (TTransformedValues) in the form components that use this.
export type CreatePlanFormInput = z.input<typeof createPlanSchema>;

export const assignMembershipSchema = z.object({
  memberId: z.string().min(1),
  planId: z.string().min(1),
  amountPaid: z.coerce.number().min(0),
  method: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER"]),
  discountAmount: z.coerce.number().min(0),
  discountReason: z.string().trim().max(200).optional(),
  referenceNote: z.string().trim().max(200).optional(),
});
export type AssignMembershipInput = z.infer<typeof assignMembershipSchema>;
export type AssignMembershipFormInput = z.input<typeof assignMembershipSchema>;
