"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireGymScope } from "@/lib/auth/guards";
import {
  collectPaymentSchema,
  type CollectPaymentInput,
} from "@/lib/validations/payments";
import { getNotificationPreferences } from "@/lib/data/notifications";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

/** Records a payment against an existing invoice — the reception "Collect"
 *  flow that links to /reception/payments/[id]/collect. Partial payments flip
 *  the invoice to PARTIALLY_PAID; the final payment closes it as PAID.
 *  Atomic + audited, mirroring assignMembershipAction, and fires the same
 *  PAYMENT_SUCCESS in-app notification (honouring the member's opt-out). */
export async function collectPaymentAction(
  input: CollectPaymentInput,
): Promise<ActionResult<{ invoiceStatus: string }>> {
  const { user, gymId } = await requireGymScope("GYM_OWNER", "RECEPTIONIST");
  const parsed = collectPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { invoiceId, amount, method, referenceNote } = parsed.data;

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, gymId },
    include: {
      payments: { where: { isReversal: false }, select: { amount: true } },
      relatedMembership: { select: { plan: { select: { name: true } } } },
    },
  });
  if (!invoice) return { success: false, error: "Invoice not found" };
  if (invoice.status === "VOID") return { success: false, error: "Cannot collect against a void invoice" };
  if (invoice.status === "PAID") return { success: false, error: "Invoice is already paid" };

  const memberPrefs = await getNotificationPreferences(invoice.memberId);

  // The already-paid sum MUST be computed inside the transaction under a row
  // lock: two concurrent "Collect" clicks on the same invoice would otherwise
  // both read the same remaining balance and both insert a full payment
  // (double-charge). `FOR UPDATE` on the invoice row makes the second request
  // block until the first commits, then re-read the payments and see them.
  const result = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "invoices" WHERE id = ${invoiceId} FOR UPDATE`;

    const current = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: { where: { isReversal: false }, select: { amount: true } } },
    });
    if (!current) return { ok: false as const, error: "Invoice not found" };
    if (current.status === "VOID")
      return { ok: false as const, error: "Cannot collect against a void invoice" };
    if (current.status === "PAID")
      return { ok: false as const, error: "Invoice is already paid" };

    const alreadyPaid = current.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const total = Number(current.total);
    const remaining = total - alreadyPaid;
    if (amount > remaining + 0.001) {
      return {
        ok: false as const,
        error: `Amount exceeds the remaining balance of ${remaining.toFixed(2)}`,
      };
    }
    const invoiceStatus = alreadyPaid + amount >= total ? "PAID" : "PARTIALLY_PAID";

    const payment = await tx.payment.create({
      data: {
        gymId,
        invoiceId,
        memberId: invoice.memberId,
        amount,
        method,
        referenceNote,
        collectedById: user.id,
      },
    });

    await tx.invoice.update({
      where: { id: invoiceId },
      data: { status: invoiceStatus },
    });

    if (memberPrefs.PAYMENT_SUCCESS !== false) {
      const planName = invoice.relatedMembership?.plan?.name;
      await tx.notification.create({
        data: {
          gymId,
          userId: invoice.memberId,
          type: "PAYMENT_SUCCESS",
          title: "Payment received",
          body: `Your payment of ${amount}${planName ? ` for ${planName}` : ""} was successful. Invoice ${invoice.invoiceNumber}.`,
          relatedEntityType: "Invoice",
          relatedEntityId: invoiceId,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        gymId,
        actorId: user.id,
        action: "payment.collect",
        targetType: "payment",
        targetId: payment.id,
        afterState: { invoiceId, amount, invoiceStatus },
      },
    });

    return { ok: true as const, invoiceStatus };
  });

  if (!result.ok) return { success: false, error: result.error };

  revalidatePath("/reception/payments");
  revalidatePath("/reception/members");
  revalidatePath("/owner/payments");
  revalidatePath("/", "layout");
  return { success: true, data: { invoiceStatus: result.invoiceStatus } };
}

/** Reverses a mistaken payment. Creates a compensating reversal row (the
 *  schema's Payment.isReversal / reversedPaymentId pair — docs/12 §12.14),
 *  then recomputes the invoice status from the remaining non-reversed
 *  payments. */
export async function reversePaymentAction(
  paymentId: string,
): Promise<ActionResult<{ invoiceStatus: string }>> {
  const { user, gymId } = await requireGymScope("GYM_OWNER", "RECEPTIONIST");
  if (!paymentId) return { success: false, error: "Payment not found" };

  const payment = await db.payment.findFirst({
    where: { id: paymentId, gymId },
    include: { invoice: { select: { id: true, invoiceNumber: true, total: true } } },
  });
  if (!payment) return { success: false, error: "Payment not found" };
  if (payment.isReversal) return { success: false, error: "This is already a reversal record" };

  // The "already reversed" check happens inside the transaction under a row
  // lock — two concurrent reverse clicks would otherwise both pass the outer
  // check and create two reversal rows (double credit). The schema's
  // @@unique([reversedPaymentId]) is the backstop.
  const result = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "payments" WHERE id = ${payment.id} FOR UPDATE`;
    const existingReversal = await tx.payment.findFirst({
      where: { reversedPaymentId: payment.id },
      select: { id: true },
    });
    if (existingReversal)
      return { ok: false as const, error: "This payment has already been reversed" };

    const reversal = await tx.payment.create({
      data: {
        gymId,
        invoiceId: payment.invoiceId,
        memberId: payment.memberId,
        amount: payment.amount,
        method: payment.method,
        referenceNote: `Reversal of payment ${payment.id.slice(0, 8)}`,
        collectedById: user.id,
        isReversal: true,
        reversedPaymentId: payment.id,
      },
    });

    const remainingRows = await tx.payment.findMany({
      where: { invoiceId: payment.invoiceId, isReversal: false },
      select: { amount: true },
    });
    const remaining = remainingRows.reduce((sum, p) => sum + Number(p.amount), 0);
    const invoiceTotal = Number(payment.invoice.total);
    const invoiceStatus = remaining >= invoiceTotal ? "PAID" : remaining > 0 ? "PARTIALLY_PAID" : "UNPAID";

    await tx.invoice.update({
      where: { id: payment.invoiceId },
      data: { status: invoiceStatus },
    });

    await tx.auditLog.create({
      data: {
        gymId,
        actorId: user.id,
        action: "payment.reverse",
        targetType: "payment",
        targetId: reversal.id,
        afterState: { reversedPaymentId: payment.id, invoiceStatus },
      },
    });

    return { ok: true as const, invoiceStatus };
  });

  if (!result.ok) return { success: false, error: result.error };

  revalidatePath("/reception/payments");
  revalidatePath("/reception/members");
  revalidatePath("/owner/payments");
  return { success: true, data: { invoiceStatus: result.invoiceStatus } };
}

/** Voids an unpaid invoice (e.g. a cancelled membership). Owner-only; refuses
 *  when any non-reversed payment exists — those must be reversed first so no
 *  money is silently written off. */
export async function voidInvoiceAction(invoiceId: string): Promise<ActionResult> {
  const { user, gymId } = await requireGymScope("GYM_OWNER");
  if (!invoiceId) return { success: false, error: "Invoice not found" };

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, gymId },
    include: { payments: { where: { isReversal: false }, select: { id: true } } },
  });
  if (!invoice) return { success: false, error: "Invoice not found" };
  if (invoice.status === "VOID") return { success: false, error: "Invoice is already void" };
  if (invoice.payments.length > 0) {
    return { success: false, error: "Reverse this invoice's payments before voiding it" };
  }

  await db.$transaction(async (tx) => {
    await tx.invoice.update({ where: { id: invoiceId }, data: { status: "VOID" } });
    await tx.auditLog.create({
      data: {
        gymId,
        actorId: user.id,
        action: "invoice.void",
        targetType: "invoice",
        targetId: invoiceId,
        afterState: { invoiceNumber: invoice.invoiceNumber },
      },
    });
  });

  revalidatePath("/owner/payments");
  revalidatePath("/reception/payments");
  return { success: true, data: undefined };
}
