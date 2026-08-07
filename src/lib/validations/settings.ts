import { z } from "zod";
import { passwordSchema } from "@/lib/validations/auth";

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordSchema,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords don't match",
    path: ["confirmNewPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const updateGymSettingsSchema = z.object({
  attendanceGraceMinutes: z.coerce.number().int().min(0).max(120),
  maxSessionHours: z.coerce.number().int().min(1).max(24),
  selfCheckinEnabled: z.boolean(),
  streakRequiresCheckin: z.boolean(),
  streakRequiresWorkoutLog: z.boolean(),
  streakRequiresCheckout: z.boolean(),
  streakFreezesPerMonth: z.coerce.number().int().min(0).max(31),
  invoicePrefix: z
    .string()
    .trim()
    .min(1, "Required")
    .max(10)
    .regex(/^[A-Za-z0-9-]+$/, "Letters, numbers, and dashes only"),
  defaultTaxPercent: z.coerce.number().min(0).max(100),
  paymentDueInDays: z.coerce.number().int().min(0).max(365),
});
export type UpdateGymSettingsInput = z.infer<typeof updateGymSettingsSchema>;
export type UpdateGymSettingsFormInput = z.input<typeof updateGymSettingsSchema>;

export const updateGymProfileSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  timezone: z.string().trim().min(1).max(60),
  currency: z.string().trim().min(3).max(3),
  brandColor: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Use a hex color like #4f46e5")
    .optional()
    .or(z.literal("")),
  addressLine: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
});
export type UpdateGymProfileInput = z.infer<typeof updateGymProfileSchema>;

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
