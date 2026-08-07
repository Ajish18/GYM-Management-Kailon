import { z } from "zod";

export const updateTrainerProfileSchema = z.object({
  userId: z.string().min(1),
  specialization: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
  bio: z.string().trim().max(1000).optional().or(z.literal("")),
  yearsExperience: z.coerce.number().int().min(0).max(60).optional(),
  maxMemberCapacity: z.coerce.number().int().min(1).max(500).optional(),
});
export type UpdateTrainerProfileInput = z.infer<typeof updateTrainerProfileSchema>;
