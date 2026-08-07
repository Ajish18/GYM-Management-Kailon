import { z } from "zod";

/** Recording a payment against an existing invoice (reception "Collect" flow). */
export const collectPaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than zero"),
  method: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER"]),
  referenceNote: z.string().trim().max(200).optional(),
});
export type CollectPaymentInput = z.infer<typeof collectPaymentSchema>;
// z.coerce fields have an "unknown" input type (pre-coercion) that differs
// from their parsed "output" type — CollectPaymentFormInput is what
// react-hook-form's state actually holds; CollectPaymentInput (output) is
// what the resolver produces for onSubmit/the server action.
export type CollectPaymentFormInput = z.input<typeof collectPaymentSchema>;
