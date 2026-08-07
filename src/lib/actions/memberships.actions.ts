"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireGymScope } from "@/lib/auth/guards";
import {
  createPlanSchema,
  assignMembershipSchema,
  type CreatePlanInput,
  type AssignMembershipInput,
} from "@/lib/validations/memberships";
import { getNotificationPreferences } from "@/lib/data/notifications";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createPlanAction(input: CreatePlanInput): Promise<ActionResult> {
  const { gymId } = await requireGymScope("GYM_OWNER");
  const parsed = createPlanSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await db.membershipPlan.findUnique({
    where: { gymId_name: { gymId, name: parsed.data.name } },
  });
  if (existing) {
    return { success: false, error: "A plan with this name already exists" };
  }

  await db.membershipPlan.create({
    data: { gymId, ...parsed.data },
  });

  revalidatePath("/owner/memberships");
  return { success: true, data: undefined };
}

export async function togglePlanActiveAction(planId: string, isActive: boolean): Promise<ActionResult> {
  const { gymId } = await requireGymScope("GYM_OWNER");
  const plan = await db.membershipPlan.findFirst({ where: { id: planId, gymId } });
  if (!plan) return { success: false, error: "Plan not found" };

  await db.membershipPlan.update({ where: { id: planId }, data: { isActive } });
  revalidatePath("/owner/memberships");
  return { success: true, data: undefined };
}

/** Assigns/renews a membership: membership + invoice + payment, one atomic
 *  operation (FR-PLAN-003, docs/12 §12.13 — payments are never partial writes). */
export async function assignMembershipAction(
  input: AssignMembershipInput,
): Promise<ActionResult<{ invoiceNumber: string }>> {
  const { user, gymId } = await requireGymScope("GYM_OWNER", "RECEPTIONIST");
  const parsed = assignMembershipSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { memberId, planId, amountPaid, method, discountAmount, discountReason, referenceNote } =
    parsed.data;

  const [member, plan, settings, memberPrefs] = await Promise.all([
    db.user.findFirst({ where: { id: memberId, gymId, role: "MEMBER" } }),
    db.membershipPlan.findFirst({ where: { id: planId, gymId, isActive: true } }),
    db.gymSettings.findUniqueOrThrow({ where: { gymId } }),
    getNotificationPreferences(memberId),
  ]);
  if (!member) return { success: false, error: "Member not found" };
  if (!plan) return { success: false, error: "Membership plan not found" };

  const subtotal = Number(plan.price);
  if (discountAmount > subtotal) {
    return { success: false, error: "Discount can't exceed the plan price" };
  }
  if (discountAmount > 0 && !discountReason) {
    return { success: false, error: "A reason is required when applying a discount" };
  }

  const taxableAmount = subtotal - discountAmount;
  const taxAmount = Math.round(taxableAmount * (Number(settings.defaultTaxPercent) / 100) * 100) / 100;
  const total = taxableAmount + taxAmount;

  if (amountPaid > total) {
    return { success: false, error: "Amount paid can't exceed the invoice total" };
  }

  // `currentActive` + the date math must live inside the transaction under a
  // per-member row lock: two concurrent "Renew" clicks would otherwise both
  // read the same ACTIVE membership (or none) and create two overlapping
  // ACTIVE memberships + two invoices. Locking the member row serializes them
  // so the second request sees the first's new membership and chains a
  // sequential renewal instead.
  const result = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "users" WHERE id = ${memberId} FOR UPDATE`;

    const currentActive = await tx.memberMembership.findFirst({
      where: { gymId, memberId, status: "ACTIVE" },
      orderBy: { endDate: "desc" },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate =
      currentActive && currentActive.endDate >= today
        ? new Date(currentActive.endDate.getTime() + 24 * 60 * 60 * 1000)
        : today;
    const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
    // Invoice is due after the gym's configurable grace period (paymentDueInDays).
    const dueDate = new Date(today.getTime() + settings.paymentDueInDays * 24 * 60 * 60 * 1000);

    if (currentActive) {
      await tx.memberMembership.update({
        where: { id: currentActive.id },
        data: { status: "UPGRADED" },
      });
    }

    const membership = await tx.memberMembership.create({
      data: {
        gymId,
        memberId,
        planId,
        startDate,
        endDate,
        status: "ACTIVE",
        pricePaid: total,
        previousMembershipId: currentActive?.id,
        createdById: user.id,
      },
    });

    const settingsRow = await tx.gymSettings.update({
      where: { gymId },
      data: { invoiceNextSeq: { increment: 1 } },
    });
    const invoiceNumber = `${settingsRow.invoicePrefix}-${String(settingsRow.invoiceNextSeq - 1).padStart(6, "0")}`;

    const invoiceStatus = amountPaid >= total ? "PAID" : amountPaid > 0 ? "PARTIALLY_PAID" : "UNPAID";

    const invoice = await tx.invoice.create({
      data: {
        gymId,
        memberId,
        invoiceNumber,
        relatedMembershipId: membership.id,
        subtotal,
        discountAmount,
        discountReason,
        taxAmount,
        total,
        status: invoiceStatus,
        dueDate,
      },
    });

    if (amountPaid > 0) {
      await tx.payment.create({
        data: {
          gymId,
          invoiceId: invoice.id,
          memberId,
          amount: amountPaid,
          method,
          referenceNote,
          collectedById: user.id,
        },
      });
    }

    // PAYMENT_SUCCESS in-app notification (docs/09 §10.15) — created inside
    // the same transaction so the receipt and its notification can never
    // diverge. Honours the member's opt-out toggle.
    if (amountPaid > 0 && memberPrefs.PAYMENT_SUCCESS !== false) {
      await tx.notification.create({
        data: {
          gymId,
          userId: memberId,
          type: "PAYMENT_SUCCESS",
          title: "Payment received",
          body: `Your payment of ${amountPaid} for ${plan.name} was successful. Invoice ${invoiceNumber}.`,
          relatedEntityType: "Invoice",
          relatedEntityId: invoice.id,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        gymId,
        actorId: user.id,
        action: "membership.assign",
        targetType: "member_membership",
        targetId: membership.id,
        afterState: { planId, total, amountPaid },
      },
    });

    return invoice;
  });

  revalidatePath("/owner/members");
  revalidatePath("/reception/members");
  // Payment receipt notification renders in the header on every route.
  revalidatePath("/", "layout");
  return { success: true, data: { invoiceNumber: result.invoiceNumber } };
}
