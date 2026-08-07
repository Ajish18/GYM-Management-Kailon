import { z } from "zod";

export const manualCheckInSchema = z.object({
  memberId: z.string().min(1, "Select a member"),
});
export type ManualCheckInInput = z.infer<typeof manualCheckInSchema>;

export const attendanceIdSchema = z.object({
  attendanceId: z.string().min(1),
});
export type AttendanceIdInput = z.infer<typeof attendanceIdSchema>;

/** Owner/Receptionist correction of a member's attendance record — mirrors
 *  the audited-write pattern used for financial corrections (see
 *  memberships.actions.ts): every correction writes an AuditLog row.
 *  Dates travel as datetime-local strings (house convention — see
 *  validations/members.ts's `dob` — dates are kept as strings through the
 *  form layer and parsed with `new Date(...)` in the action). */
export const correctAttendanceSchema = z
  .object({
    attendanceId: z.string().min(1),
    checkInAt: z.string().min(1, "Check-in time is required"),
    checkOutAt: z.string().optional().or(z.literal("")),
  })
  .refine((data) => !data.checkOutAt || new Date(data.checkOutAt) > new Date(data.checkInAt), {
    message: "Check-out must be after check-in",
    path: ["checkOutAt"],
  });
export type CorrectAttendanceInput = z.infer<typeof correctAttendanceSchema>;

export const vacationRequestSchema = z
  .object({
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    reason: z.string().trim().max(300).optional().or(z.literal("")),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });
export type VacationRequestInput = z.infer<typeof vacationRequestSchema>;

export const vacationDecisionSchema = z.object({
  periodId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
});
export type VacationDecisionInput = z.infer<typeof vacationDecisionSchema>;
