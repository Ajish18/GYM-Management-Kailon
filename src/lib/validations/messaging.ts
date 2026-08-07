import { z } from "zod";

export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10MB
export const ALLOWED_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;

/** Validates the plain fields of a `sendMessageAction` call — the actual
 *  File (if any) is read straight off the FormData in the action since Zod
 *  doesn't need to touch it, just needs to know one of body/attachment is
 *  present. */
export const sendMessageSchema = z
  .object({
    trainerId: z.string().min(1, "Trainer is required"),
    memberId: z.string().min(1, "Member is required"),
    body: z.string().trim().max(MAX_MESSAGE_LENGTH, "Message is too long").optional(),
    hasAttachment: z.boolean().default(false),
  })
  .refine((data) => data.hasAttachment || !!data.body?.length, {
    message: "Message can't be empty",
    path: ["body"],
  });
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const threadParamsSchema = z.object({
  trainerId: z.string().min(1),
  memberId: z.string().min(1),
});
export type ThreadParamsInput = z.infer<typeof threadParamsSchema>;
