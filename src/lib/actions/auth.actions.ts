"use server";

import { db } from "@/lib/db";
import { hashPassword, generateSecureToken, hashToken } from "@/lib/auth/security";
import { signIn } from "@/lib/auth/config";
import { requireGymScope } from "@/lib/auth/guards";
import {
  registerGymSchema,
  inviteStaffSchema,
  acceptInvitePasswordSchema,
  selfSignupSchema,
  gymCodeSchema,
  type RegisterGymInput,
  type InviteStaffInput,
  type AcceptInvitePasswordInput,
  type SelfSignupInput,
} from "@/lib/validations/auth";
import { sendEmail, inviteEmailHtml } from "@/lib/email/send";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function uniqueGymSlug(name: string): Promise<string> {
  const base = slugify(name) || "gym";
  let slug = base;
  let suffix = 0;
  // Small, bounded loop over an indexed unique column — cheap even at scale.
  while (await db.gym.findUnique({ where: { slug }, select: { id: true } })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  return slug;
}

const GYM_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — easy to read aloud

async function uniqueGymCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += GYM_CODE_CHARS[Math.floor(Math.random() * GYM_CODE_CHARS.length)];
    }
    const exists = await db.gym.findUnique({ where: { gymCode: code }, select: { id: true } });
    if (!exists) return code;
  }
  throw new Error("Could not generate a unique gym code — try again");
}

/** Gym Owner self-service signup — the only role that registers itself. */
export async function registerGymAction(
  input: RegisterGymInput,
): Promise<ActionResult<{ gymCode: string }>> {
  const parsed = registerGymSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { gymName, ownerName, email, password, timezone, currency } = parsed.data;

  const existing = await db.user.findFirst({
    where: { email, role: "GYM_OWNER" },
    select: { id: true },
  });
  if (existing) {
    return { success: false, error: "An account with this email already exists" };
  }

  const passwordHash = await hashPassword(password);
  const slug = await uniqueGymSlug(gymName);
  const gymCode = await uniqueGymCode();

  await db.$transaction(async (tx) => {
    const owner = await tx.user.create({
      data: {
        role: "GYM_OWNER",
        name: ownerName,
        email,
        passwordHash,
        status: "ACTIVE",
      },
    });

    const gym = await tx.gym.create({
      data: {
        name: gymName,
        slug,
        gymCode,
        ownerUserId: owner.id,
        timezone,
        currency,
        status: "TRIAL",
      },
    });

    await tx.user.update({ where: { id: owner.id }, data: { gymId: gym.id } });
    await tx.gymSettings.create({ data: { gymId: gym.id } });

    const defaultCategories = [
      "Trainer Salary",
      "Rent",
      "Electricity",
      "Equipment",
      "Maintenance",
      "Marketing",
      "Cleaning",
      "Miscellaneous",
    ];
    await tx.expenseCategory.createMany({
      data: defaultCategories.map((categoryName) => ({ gymId: gym.id, name: categoryName })),
    });
  });

  await signIn("credentials", { gymCode, email, password, redirect: false });

  return { success: true, data: { gymCode } };
}

/** Owner/Receptionist pre-creates the person's account + invite in one step.
 *  Trainer/Member can then complete it via Google OR set a password;
 *  Receptionist always sets a password. This is the "curated" onboarding
 *  path — the alternative is self-signup via Join Gym using the Gym ID. */
export async function inviteStaffAction(input: InviteStaffInput): Promise<ActionResult<{ acceptUrl: string }>> {
  const { user, gymId } = await requireGymScope("GYM_OWNER", "RECEPTIONIST");
  if (input.role !== "MEMBER" && user.role !== "GYM_OWNER") {
    return { success: false, error: "Only the gym owner can invite staff" };
  }

  const parsed = inviteStaffSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { email, role, name } = parsed.data;

  const existingUser = await db.user.findFirst({ where: { gymId, email } });
  if (existingUser) {
    return { success: false, error: "This email is already part of your gym" };
  }

  const { raw, hash } = generateSecureToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const gym = await db.gym.findUniqueOrThrow({ where: { id: gymId }, select: { name: true } });

  await db.$transaction(async (tx) => {
    const invitedUser = await tx.user.create({
      data: { gymId, role, name, email, status: "INVITED" },
    });
    if (role === "MEMBER") {
      await tx.memberProfile.create({ data: { userId: invitedUser.id, gymId } });
      await tx.memberStreak.create({ data: { memberId: invitedUser.id, gymId } });
    }
    if (role === "TRAINER") {
      await tx.trainerProfile.create({ data: { userId: invitedUser.id, gymId } });
    }
    await tx.invite.create({
      data: { gymId, email, role, invitedBy: user.id, tokenHash: hash, expiresAt },
    });
  });

  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/invite/${raw}`;
  await sendEmail({
    to: email,
    subject: `You're invited to ${gym.name} on Kailon`,
    html: inviteEmailHtml({ gymName: gym.name, role, acceptUrl }),
  });

  return { success: true, data: { acceptUrl } };
}

async function loadValidInvite(rawToken: string) {
  const invite = await db.invite.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) return null;
  return invite;
}

export async function getInvitePreview(rawToken: string) {
  const invite = await loadValidInvite(rawToken);
  if (!invite) return null;
  const gym = await db.gym.findUnique({ where: { id: invite.gymId }, select: { name: true, gymCode: true } });
  return { role: invite.role, email: invite.email, gymName: gym?.name ?? "your gym", gymCode: gym?.gymCode };
}

/** Password-based invite acceptance — works for Receptionist, Trainer, or
 *  Member. Trainer/Member also see a "Continue with Google" option on the
 *  same invite page; this action handles whichever of them chooses a
 *  password instead. */
export async function acceptInvitePasswordAction(
  input: AcceptInvitePasswordInput,
): Promise<ActionResult> {
  const parsed = acceptInvitePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const invite = await loadValidInvite(parsed.data.token);
  if (!invite) {
    return { success: false, error: "This invitation link is invalid or has expired" };
  }

  const gym = await db.gym.findUniqueOrThrow({ where: { id: invite.gymId }, select: { gymCode: true } });
  const passwordHash = await hashPassword(parsed.data.password);

  await db.$transaction(async (tx) => {
    await tx.user.updateMany({
      where: { gymId: invite.gymId, email: invite.email, role: invite.role },
      data: { passwordHash, status: "ACTIVE" },
    });
    await tx.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
  });

  await signIn("credentials", {
    gymCode: gym.gymCode,
    email: invite.email,
    password: parsed.data.password,
    redirect: false,
  });

  return { success: true, data: undefined };
}

/** Public lookup used by the Join Gym page's first step. Rate-limited by IP
 *  since a Gym ID, while not secret in the same way a password is, still
 *  shouldn't be casually enumerable. */
export async function findGymByCodeAction(
  rawCode: string,
): Promise<ActionResult<{ gymId: string; gymName: string }>> {
  const parsed = gymCodeSchema.safeParse(rawCode);
  if (!parsed.success) {
    return { success: false, error: "Enter your gym's ID" };
  }
  const gym = await db.gym.findUnique({
    where: { gymCode: parsed.data },
    select: { id: true, name: true, status: true },
  });
  if (!gym || gym.status === "SUSPENDED") {
    return { success: false, error: "No gym found with that ID" };
  }
  return { success: true, data: { gymId: gym.id, gymName: gym.name } };
}

/** Self-service Trainer/Member account creation from the Join Gym page,
 *  gated by the gym's shared Gym ID rather than a per-person invite from
 *  the owner. Members are active immediately (low blast radius — they only
 *  ever see their own data); Trainers land as "pending" and need the owner
 *  to approve them from the Staff page before they can log in, since a
 *  Trainer can see assigned members' data. */
export async function selfSignupAction(
  input: SelfSignupInput,
): Promise<ActionResult<{ pendingApproval: boolean }>> {
  const parsed = selfSignupSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { role, name, email, phone, password } = parsed.data;
  const gymCode = parsed.data.gymCode.toUpperCase();

  const gym = await db.gym.findUnique({ where: { gymCode } });
  if (!gym || gym.status === "SUSPENDED") {
    return { success: false, error: "No gym found with that ID" };
  }

  const existing = await db.user.findUnique({
    where: { gymId_email: { gymId: gym.id, email } },
  });
  if (existing) {
    return {
      success: false,
      error: existing.passwordHash
        ? "An account already exists for this email at this gym — sign in instead."
        : "This email already has a pending invite at this gym — check your invite link, or ask your gym owner.",
    };
  }

  const passwordHash = await hashPassword(password);
  const status = role === "MEMBER" ? "ACTIVE" : "INVITED";

  await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { gymId: gym.id, role, name, email, phone: phone || null, passwordHash, status },
    });
    if (role === "MEMBER") {
      await tx.memberProfile.create({ data: { userId: created.id, gymId: gym.id } });
      await tx.memberStreak.create({ data: { memberId: created.id, gymId: gym.id } });
    } else {
      await tx.trainerProfile.create({ data: { userId: created.id, gymId: gym.id } });
    }
  });

  if (status === "ACTIVE") {
    await signIn("credentials", { gymCode, email, password, redirect: false });
  }

  return { success: true, data: { pendingApproval: status !== "ACTIVE" } };
}

/** Owner approves a self-signed-up Trainer (see selfSignupAction), letting
 *  them log in for the first time. */
export async function approveTrainerAction(userId: string): Promise<ActionResult> {
  const { gymId } = await requireGymScope("GYM_OWNER");
  const trainer = await db.user.findFirst({
    where: { id: userId, gymId, role: "TRAINER", status: "INVITED" },
  });
  if (!trainer) {
    return { success: false, error: "Trainer not found or already active" };
  }
  await db.user.update({ where: { id: userId }, data: { status: "ACTIVE" } });
  return { success: true, data: undefined };
}

/** Owner rejects/removes a self-signed-up Trainer that's still pending. */
export async function rejectTrainerAction(userId: string): Promise<ActionResult> {
  const { gymId } = await requireGymScope("GYM_OWNER");
  const trainer = await db.user.findFirst({
    where: { id: userId, gymId, role: "TRAINER", status: "INVITED" },
  });
  if (!trainer) {
    return { success: false, error: "Trainer not found or already active" };
  }
  await db.user.update({
    where: { id: userId },
    data: { status: "INACTIVE", deletedAt: new Date() },
  });
  return { success: true, data: undefined };
}
