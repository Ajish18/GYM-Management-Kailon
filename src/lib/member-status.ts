import type { MemberMembership } from "@prisma/client";

export type DerivedMemberStatus = "active" | "frozen" | "expired" | "inactive";

/**
 * Member status is never stored directly (see docs/08 §9.5 / §12.5) — it's
 * derived from the member's most recent membership row so it can never
 * drift out of sync with the actual membership dates.
 */
export function deriveMemberStatus(latestMembership: MemberMembership | null): DerivedMemberStatus {
  if (!latestMembership) return "inactive";
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (latestMembership.status === "FROZEN") return "frozen";
  if (latestMembership.status === "ACTIVE" && latestMembership.endDate >= today) return "active";
  return "expired";
}

export const STATUS_LABEL: Record<DerivedMemberStatus, string> = {
  active: "Active",
  frozen: "Frozen",
  expired: "Expired",
  inactive: "No membership",
};

export const STATUS_BADGE_VARIANT: Record<DerivedMemberStatus, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  frozen: "secondary",
  expired: "destructive",
  inactive: "outline",
};
