import { describe, expect, it } from "vitest";
import type { MemberMembership } from "@prisma/client";
import {
  deriveMemberStatus,
  STATUS_LABEL,
  STATUS_BADGE_VARIANT,
  type DerivedMemberStatus,
} from "@/lib/member-status";

function membership(overrides: Partial<MemberMembership>): MemberMembership {
  return {
    id: "m1",
    gymId: "g1",
    memberId: "u1",
    planId: "p1",
    startDate: new Date(),
    endDate: new Date(),
    status: "ACTIVE",
    pricePaid: 0 as unknown as MemberMembership["pricePaid"],
    previousMembershipId: null,
    createdById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as MemberMembership;
}

const yesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(12, 0, 0, 0);
  return d;
};
const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(12, 0, 0, 0);
  return d;
};

describe("deriveMemberStatus", () => {
  it("returns inactive when there is no membership", () => {
    expect(deriveMemberStatus(null)).toBe("inactive");
  });

  it("returns frozen regardless of dates", () => {
    expect(deriveMemberStatus(membership({ status: "FROZEN", endDate: yesterday() }))).toBe("frozen");
    expect(deriveMemberStatus(membership({ status: "FROZEN", endDate: tomorrow() }))).toBe("frozen");
  });

  it("returns active for an active membership that has not ended", () => {
    expect(deriveMemberStatus(membership({ status: "ACTIVE", endDate: tomorrow() }))).toBe("active");
  });

  it("returns expired once the end date has passed", () => {
    expect(deriveMemberStatus(membership({ status: "ACTIVE", endDate: yesterday() }))).toBe("expired");
  });

  it("treats any non-active non-frozen status as expired", () => {
    expect(deriveMemberStatus(membership({ status: "EXPIRED", endDate: tomorrow() }))).toBe("expired");
  });
});

describe("status label + badge metadata", () => {
  it("labels every derived status", () => {
    const statuses: DerivedMemberStatus[] = ["active", "frozen", "expired", "inactive"];
    for (const s of statuses) {
      expect(typeof STATUS_LABEL[s]).toBe("string");
      expect(STATUS_LABEL[s].length).toBeGreaterThan(0);
    }
  });

  it("maps every status to a valid badge variant", () => {
    const valid = new Set(["default", "secondary", "destructive", "outline"]);
    for (const v of Object.values(STATUS_BADGE_VARIANT)) {
      expect(valid.has(v)).toBe(true);
    }
  });
});
