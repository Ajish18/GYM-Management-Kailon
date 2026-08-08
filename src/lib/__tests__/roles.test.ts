import { describe, expect, it } from "vitest";
import { getRoleHome, isPathInRoleArea, ROLE_HOME } from "@/lib/auth/roles";

describe("ROLE_HOME / getRoleHome", () => {
  it("maps every role to its own dashboard", () => {
    expect(ROLE_HOME.GYM_OWNER).toBe("/owner");
    expect(ROLE_HOME.RECEPTIONIST).toBe("/reception");
    expect(ROLE_HOME.TRAINER).toBe("/trainer");
    expect(ROLE_HOME.MEMBER).toBe("/member");
    expect(ROLE_HOME.PLATFORM_SUPER_ADMIN).toBe("/admin");
  });

  it("getRoleHome matches the mapping", () => {
    expect(getRoleHome("GYM_OWNER")).toBe("/owner");
    expect(getRoleHome("MEMBER")).toBe("/member");
  });

  it("falls back to / for a missing role", () => {
    expect(getRoleHome(undefined)).toBe("/");
    expect(getRoleHome(null)).toBe("/");
  });
});

describe("isPathInRoleArea", () => {
  it("allows the role's own prefix and paths below it", () => {
    expect(isPathInRoleArea("/member", "MEMBER")).toBe(true);
    expect(isPathInRoleArea("/member/workout", "MEMBER")).toBe(true);
  });

  it("rejects another role's area", () => {
    expect(isPathInRoleArea("/owner/members", "MEMBER")).toBe(false);
    expect(isPathInRoleArea("/member/workout", "GYM_OWNER")).toBe(false);
  });

  it("rejects non-role paths and junk", () => {
    expect(isPathInRoleArea("/login", "MEMBER")).toBe(false);
    expect(isPathInRoleArea("/", "MEMBER")).toBe(false);
    expect(isPathInRoleArea(undefined, "MEMBER")).toBe(false);
    expect(isPathInRoleArea(null, "MEMBER")).toBe(false);
    expect(isPathInRoleArea("member/workout", "MEMBER")).toBe(false);
    expect(isPathInRoleArea("https://evil.example.com/member", "MEMBER")).toBe(false);
  });
});
