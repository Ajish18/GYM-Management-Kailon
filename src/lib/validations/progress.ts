import { z } from "zod";

// Numeric measurement fields are all optional and arrive from <input type="number">
// as strings (or empty strings when left blank) — preprocess blank/nullish values
// to `undefined` before z.coerce.number() runs, since Number("") is 0, not NaN,
// and we never want a blank field silently recorded as a real zero measurement.
function optionalNumber(opts: { min: number; max: number; label: string }) {
  return z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.coerce
      .number()
      .min(opts.min, `${opts.label} looks too low`)
      .max(opts.max, `${opts.label} looks too high`)
      .optional(),
  );
}

const MEASUREMENT_FIELD_KEYS = [
  "weightKg",
  "heightCm",
  "bodyFatPercent",
  "musclePercent",
  "chestCm",
  "waistCm",
  "shoulderCm",
  "armsCm",
  "legsCm",
] as const;

export const recordMeasurementSchema = z
  .object({
    // Present only when a staff member (Owner/Trainer) records on behalf of a
    // member; ignored server-side for self-entry, where the caller's own id
    // is used instead (never trust a client-supplied memberId for that case).
    memberId: z.string().min(1).optional(),
    measuredAt: z.string().min(1, "Date is required"),
    weightKg: optionalNumber({ min: 15, max: 400, label: "Weight" }),
    heightCm: optionalNumber({ min: 50, max: 260, label: "Height" }),
    bodyFatPercent: optionalNumber({ min: 1, max: 75, label: "Body fat %" }),
    musclePercent: optionalNumber({ min: 1, max: 100, label: "Muscle %" }),
    chestCm: optionalNumber({ min: 20, max: 250, label: "Chest" }),
    waistCm: optionalNumber({ min: 20, max: 250, label: "Waist" }),
    shoulderCm: optionalNumber({ min: 20, max: 250, label: "Shoulder" }),
    armsCm: optionalNumber({ min: 5, max: 100, label: "Arms" }),
    legsCm: optionalNumber({ min: 10, max: 150, label: "Legs" }),
  })
  .refine((data) => MEASUREMENT_FIELD_KEYS.some((key) => data[key] !== undefined), {
    message: "Enter at least one measurement",
    path: ["weightKg"],
  });
export type RecordMeasurementInput = z.infer<typeof recordMeasurementSchema>;
export type RecordMeasurementFormInput = z.input<typeof recordMeasurementSchema>;

export const photoMetaSchema = z.object({
  memberId: z.string().min(1).optional(),
  takenAt: z.string().min(1, "Date is required"),
  pose: z.enum(["FRONT", "SIDE", "BACK"]),
});
export type PhotoMetaInput = z.infer<typeof photoMetaSchema>;
export type PhotoMetaFormInput = z.input<typeof photoMetaSchema>;
