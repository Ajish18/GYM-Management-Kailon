import { z } from "zod";

// Server-side validation is the real boundary (NFR-SEC-005) — these schemas
// are shared by both the client form and the server action/authorize().
export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number");

/** The gym's shareable "Gym ID" (Gym.gymCode) — what staff/members type in
 *  to reach their gym's Join Gym / login flow. */
export const gymCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(4, "Enter your gym's ID")
  .max(12, "Enter your gym's ID");

export const loginSchema = z.object({
  gymCode: gymCodeSchema,
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

const passwordsMatch = <T extends { password: string; confirmPassword: string }>(data: T) =>
  data.password === data.confirmPassword;
const passwordsMatchIssue = {
  message: "Passwords don't match",
  path: ["confirmPassword"],
};

export const registerGymSchema = z
  .object({
    gymName: z.string().trim().min(2, "Gym name is required").max(120),
    ownerName: z.string().trim().min(2, "Your name is required").max(120),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    password: passwordSchema,
    confirmPassword: z.string(),
    // No .default() here on purpose: react-hook-form's zodResolver treats
    // z.default() fields as optional on input, which conflicts with the form
    // always supplying a value via defaultValues. Plain required + a
    // defaultValues entry in the form gives the same UX without the type clash.
    timezone: z.string().trim().min(1),
    currency: z.string().trim().length(3),
  })
  .refine(passwordsMatch, passwordsMatchIssue);
export type RegisterGymInput = z.infer<typeof registerGymSchema>;

export const inviteStaffSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  role: z.enum(["RECEPTIONIST", "TRAINER", "MEMBER"]),
  name: z.string().trim().min(2, "Name is required").max(120),
});
export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;

export const acceptInvitePasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(passwordsMatch, passwordsMatchIssue);
export type AcceptInvitePasswordInput = z.infer<typeof acceptInvitePasswordSchema>;

/** Self-service Trainer/Member account creation from the "Join Gym" page —
 *  gated by the gym's shared Gym ID rather than a per-person invite. */
export const selfSignupSchema = z
  .object({
    gymCode: gymCodeSchema,
    role: z.enum(["TRAINER", "MEMBER"]),
    name: z.string().trim().min(2, "Name is required").max(120),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    phone: z.string().trim().max(20).optional().or(z.literal("")),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(passwordsMatch, passwordsMatchIssue);
export type SelfSignupInput = z.infer<typeof selfSignupSchema>;
