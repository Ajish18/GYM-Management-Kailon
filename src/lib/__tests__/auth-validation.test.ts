import { describe, expect, it } from "vitest";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  passwordSchema,
} from "@/lib/validations/auth";

describe("loginSchema", () => {
  it("accepts valid credentials and normalizes case/whitespace", () => {
    const result = loginSchema.parse({
      gymCode: "  k7f3xq ",
      email: "  TEST@Example.com ",
      password: "secret",
    });
    expect(result).toMatchObject({
      gymCode: "K7F3XQ",
      email: "test@example.com",
      password: "secret",
    });
  });

  it("rejects a malformed email", () => {
    expect(() => loginSchema.parse({ gymCode: "K7F3XQ", email: "not-an-email", password: "x" })).toThrow();
  });

  it("rejects a missing password", () => {
    expect(() => loginSchema.parse({ gymCode: "K7F3XQ", email: "a@b.com", password: "" })).toThrow();
  });

  it("rejects a too-short gym code", () => {
    expect(() => loginSchema.parse({ gymCode: "AB", email: "a@b.com", password: "x" })).toThrow();
  });
});

describe("forgotPasswordSchema", () => {
  it("accepts gym code + email", () => {
    const result = forgotPasswordSchema.parse({ gymCode: "k7f3xq", email: "A@B.com" });
    expect(result).toMatchObject({ gymCode: "K7F3XQ", email: "a@b.com" });
  });

  it("rejects a malformed email", () => {
    expect(() => forgotPasswordSchema.parse({ gymCode: "K7F3XQ", email: "nope" })).toThrow();
  });

  it("rejects a missing gym code", () => {
    expect(() => forgotPasswordSchema.parse({ gymCode: "", email: "a@b.com" })).toThrow();
  });
});

describe("resetPasswordSchema", () => {
  const good = { token: "tok123", password: "Str0ngPass", confirmPassword: "Str0ngPass" };

  it("accepts a token + matching strong password", () => {
    expect(resetPasswordSchema.parse(good)).toMatchObject(good);
  });

  it("rejects mismatched confirmation with a field-level issue", () => {
    const result = resetPasswordSchema.safeParse({
      ...good,
      confirmPassword: "Different1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("confirmPassword");
    }
  });

  it("rejects a missing token", () => {
    expect(() => resetPasswordSchema.parse({ ...good, token: "" })).toThrow();
  });

  it("rejects a weak password", () => {
    expect(() => resetPasswordSchema.parse({ ...good, password: "weak" })).toThrow();
  });
});

describe("passwordSchema", () => {
  it("requires 10+ chars, upper, lower, and a number", () => {
    expect(passwordSchema.safeParse("Str0ngPass").success).toBe(true);
    expect(passwordSchema.safeParse("alllower1").success).toBe(false);
    expect(passwordSchema.safeParse("ALLUPPER1").success).toBe(false);
    expect(passwordSchema.safeParse("NoNumberHere").success).toBe(false);
    expect(passwordSchema.safeParse("short1A").success).toBe(false);
  });
});
