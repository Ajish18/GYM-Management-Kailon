import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const BCRYPT_COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Generates a random token for invites/password-resets. Only the SHA-256
 * hash is ever persisted — the raw token exists solely in the emailed link,
 * so a DB read (or leak) can never be replayed as a valid token.
 */
export function generateSecureToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// ── Brute-force protection ────────────────────────────────────────────────
//
// DB-backed sliding-window rate limiting (no Redis dependency). Two axes are
// checked independently so both "one account getting hammered" and "one IP
// spraying many accounts" are caught:
//   - identifier axis: 5 failed attempts / 15 min -> that identifier locked
//   - IP axis:        20 failed attempts / 15 min -> that IP locked
const IDENTIFIER_MAX_ATTEMPTS = 5;
const IP_MAX_ATTEMPTS = 20;
const WINDOW_MINUTES = 15;

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: "account_locked" | "ip_locked"; retryAfterSeconds: number };

export async function checkLoginRateLimit(
  identifier: string,
  ipAddress: string,
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);

  const [identifierFailures, ipFailures] = await Promise.all([
    db.loginAttempt.count({
      where: { identifier, success: false, createdAt: { gte: windowStart } },
    }),
    db.loginAttempt.count({
      where: { ipAddress, success: false, createdAt: { gte: windowStart } },
    }),
  ]);

  if (identifierFailures >= IDENTIFIER_MAX_ATTEMPTS) {
    return { allowed: false, reason: "account_locked", retryAfterSeconds: WINDOW_MINUTES * 60 };
  }
  if (ipFailures >= IP_MAX_ATTEMPTS) {
    return { allowed: false, reason: "ip_locked", retryAfterSeconds: WINDOW_MINUTES * 60 };
  }
  return { allowed: true };
}

export async function recordLoginAttempt(params: {
  identifier: string;
  ipAddress: string;
  success: boolean;
  userId?: string;
}): Promise<void> {
  await db.loginAttempt.create({
    data: {
      identifier: params.identifier,
      ipAddress: params.ipAddress,
      success: params.success,
      userId: params.userId,
    },
  });
}
