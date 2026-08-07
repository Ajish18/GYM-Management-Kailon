import { z } from "zod";

export const createMemberSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number")
    .max(20)
    .regex(/^[0-9+\-\s()]+$/, "Enter a valid phone number"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "UNDISCLOSED"]),
  dob: z.string().optional().or(z.literal("")),
  emergencyContactName: z.string().trim().max(120).optional().or(z.literal("")),
  emergencyContactPhone: z.string().trim().max(20).optional().or(z.literal("")),
  healthNotes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type CreateMemberInput = z.infer<typeof createMemberSchema>;

export const assignTrainerSchema = z.object({
  memberId: z.string().min(1),
  trainerId: z.string().min(1).nullable(),
});
export type AssignTrainerInput = z.infer<typeof assignTrainerSchema>;

/** One row of a bulk member import. Mirrors `createMemberSchema` so a parsed
 *  spreadsheet can be validated and then created with the same rules, but
 *  optional fields tolerate empty cells. */
export const bulkMemberRowSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number")
    .max(20)
    .regex(/^[0-9+\-\s()]+$/, "Enter a valid phone number"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "UNDISCLOSED"]).default("UNDISCLOSED"),
  dob: z.string().optional().or(z.literal("")),
  emergencyContactName: z.string().trim().max(120).optional().or(z.literal("")),
  emergencyContactPhone: z.string().trim().max(20).optional().or(z.literal("")),
  healthNotes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type BulkMemberRowInput = z.infer<typeof bulkMemberRowSchema>;

/** Safety cap per bulk import — keeps one upload from overwhelming the
 *  transaction. Lives here (not in the "use server" file) so the client
 *  component and the server action share one source of truth. */
export const BULK_IMPORT_MAX_ROWS = 200;
