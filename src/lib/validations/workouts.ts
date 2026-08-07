import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────
// Exercise library
// ─────────────────────────────────────────────────────────────────────────

export const exerciseSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  muscleGroup: z.string().trim().max(60).optional().or(z.literal("")),
  equipment: z.string().trim().max(60).optional().or(z.literal("")),
  instructions: z.string().trim().max(1000).optional().or(z.literal("")),
  mediaUrl: z.string().trim().url("Enter a valid URL").max(500).optional().or(z.literal("")),
});
export type ExerciseInput = z.infer<typeof exerciseSchema>;

// ─────────────────────────────────────────────────────────────────────────
// Workout templates (name/description + days + per-day exercises)
// ─────────────────────────────────────────────────────────────────────────

export const templateExerciseSchema = z.object({
  exerciseId: z.string().min(1, "Select an exercise"),
  targetSets: z.coerce.number().int().min(1, "At least 1 set").max(20),
  targetReps: z.coerce.number().int().min(1, "At least 1 rep").max(100),
  // Both default to 0 rather than being left as an empty string — the form
  // always holds a number (see CreatePlanFormInput precedent in
  // validations/memberships.ts), and 0 is treated as "not specified" when
  // persisted (see workouts.actions.ts).
  targetWeight: z.coerce.number().min(0).max(2000).default(0),
  restSeconds: z.coerce.number().int().min(0).max(1800).default(0),
  // Always overwritten with the exercise's position in the day right before
  // submit (see TemplateBuilderDialog) — up/down reordering moves the array
  // position, which becomes the persisted sortOrder. Kept in the schema
  // because WorkoutTemplateExercise.sortOrder is a real column.
  sortOrder: z.coerce.number().int().min(0).default(0),
});
export type TemplateExerciseInput = z.infer<typeof templateExerciseSchema>;

export const templateDaySchema = z.object({
  label: z.string().trim().min(1, "Day label is required").max(60),
  dayOrder: z.coerce.number().int().min(1),
  exercises: z.array(templateExerciseSchema).min(1, "Add at least one exercise"),
});
export type TemplateDayInput = z.infer<typeof templateDaySchema>;

export const createTemplateSchema = z.object({
  name: z.string().trim().min(2, "Template name is required").max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  days: z.array(templateDaySchema).min(1, "Add at least one day"),
});
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type CreateTemplateFormInput = z.input<typeof createTemplateSchema>;

export const updateTemplateSchema = createTemplateSchema.extend({
  templateId: z.string().min(1),
});
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

// ─────────────────────────────────────────────────────────────────────────
// Assigning a plan to a member
// ─────────────────────────────────────────────────────────────────────────

export const assignPlanSchema = z.object({
  memberId: z.string().min(1, "Select a member"),
  templateId: z.string().min(1, "Select a template"),
  startDate: z.string().min(1, "Pick a start date"),
});
export type AssignPlanInput = z.infer<typeof assignPlanSchema>;

// ─────────────────────────────────────────────────────────────────────────
// Logging a workout (member self-log, or trainer logging on behalf of an
// assigned member)
// ─────────────────────────────────────────────────────────────────────────

export const workoutLogSetSchema = z.object({
  exerciseId: z.string().min(1),
  setNumber: z.coerce.number().int().min(1),
  // 0 means "not entered" — see the PR-detection comment in
  // workouts.actions.ts for how these are interpreted.
  actualReps: z.coerce.number().int().min(0).max(200).default(0),
  actualWeight: z.coerce.number().min(0).max(2000).default(0),
});
export type WorkoutLogSetInput = z.infer<typeof workoutLogSetSchema>;

export const logWorkoutSchema = z.object({
  workoutPlanId: z.string().min(1),
  memberId: z.string().min(1),
  logDate: z.string().min(1),
  status: z.enum(["COMPLETED", "SKIPPED", "PARTIAL"]),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  sets: z.array(workoutLogSetSchema),
});
export type LogWorkoutInput = z.infer<typeof logWorkoutSchema>;
