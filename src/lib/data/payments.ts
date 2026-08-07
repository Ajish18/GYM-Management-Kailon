import "server-only";
import { db } from "@/lib/db";
import type { InvoiceStatus } from "@prisma/client";

const PAGE_SIZE = 25;

export type PaymentListItem = {
  id: string;
  invoiceNumber: string;
  memberName: string;
  amount: number;
  method: string;
  paidAt: Date;
  status: string;
};

export async function listPayments(params: {
  gymId: string;
  memberId?: string;
  page?: number;
}): Promise<{ items: PaymentListItem[]; total: number; page: number; totalPages: number }> {
  const page = Math.max(1, params.page ?? 1);
  const where = {
    gymId: params.gymId,
    ...(params.memberId ? { memberId: params.memberId } : {}),
  };

  const [rows, total] = await Promise.all([
    db.payment.findMany({
      where,
      orderBy: { paidAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            memberId: true,
            status: true,
          },
        },
      },
    }),
    db.payment.count({ where }),
  ]);

  // Get member names separately
  const memberIds = [...new Set(rows.map((r) => r.memberId))];
  const members = await db.user.findMany({
    where: { id: { in: memberIds } },
    select: { id: true, name: true },
  });
  const memberMap = new Map(members.map((m) => [m.id, m.name]));

  const items: PaymentListItem[] = rows.map((row) => ({
    id: row.id,
    invoiceNumber: row.invoice.invoiceNumber,
    memberName: memberMap.get(row.memberId) ?? "Unknown",
    amount: Number(row.amount),
    method: row.method,
    paidAt: row.paidAt,
    status: row.invoice.status,
  }));

  return { items, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export type InvoiceListItem = {
  id: string;
  invoiceNumber: string;
  memberName: string;
  total: number;
  status: string;
  issuedAt: Date;
  dueDate: Date | null;
  paidAmount: number;
};

export async function listInvoices(params: {
  gymId: string;
  memberId?: string;
  status?: string;
  page?: number;
}): Promise<{ items: InvoiceListItem[]; total: number; page: number; totalPages: number }> {
  const page = Math.max(1, params.page ?? 1);
  const where = {
    gymId: params.gymId,
    ...(params.memberId ? { memberId: params.memberId } : {}),
    ...(params.status ? { status: params.status as InvoiceStatus } : {}),
  };

  const [rows, total] = await Promise.all([
    db.invoice.findMany({
      where,
      orderBy: { issuedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        payments: {
          where: { isReversal: false },
          select: {
            amount: true,
          },
        },
      },
    }),
    db.invoice.count({ where }),
  ]);

  // Get member names separately
  const memberIds = [...new Set(rows.map((r) => r.memberId))];
  const members = await db.user.findMany({
    where: { id: { in: memberIds } },
    select: { id: true, name: true },
  });
  const memberMap = new Map(members.map((m) => [m.id, m.name]));

  const items: InvoiceListItem[] = rows.map((row) => {
    const paidAmount = row.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    return {
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      memberName: memberMap.get(row.memberId) ?? "Unknown",
      total: Number(row.total),
      status: row.status,
      issuedAt: row.issuedAt,
      dueDate: row.dueDate,
      paidAmount,
    };
  });

  return { items, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export type CollectInvoice = {
  id: string;
  invoiceNumber: string;
  memberName: string;
  memberPhone: string | null;
  planName: string | null;
  issuedAt: Date;
  dueDate: Date | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  remaining: number;
  status: string;
  payments: { id: string; amount: number; method: string; paidAt: Date }[];
};

/** One invoice, scoped to a gym, with everything the "Collect payment" page
 *  needs: the member, the plan line-item, and its non-reversal payment
 *  history (used to derive paid/remaining and render the receipt summary). */
export async function getInvoiceForCollection(
  gymId: string,
  invoiceId: string,
): Promise<CollectInvoice | null> {
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, gymId },
    include: {
      payments: {
        where: { isReversal: false },
        orderBy: { paidAt: "asc" },
        select: { id: true, amount: true, method: true, paidAt: true },
      },
      relatedMembership: { select: { plan: { select: { name: true } } } },
    },
  });
  if (!invoice) return null;

  const member = await db.user.findFirst({
    where: { id: invoice.memberId },
    select: { name: true, phone: true },
  });

  const paidAmount = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const total = Number(invoice.total);

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    memberName: member?.name ?? "Unknown",
    memberPhone: member?.phone ?? null,
    planName: invoice.relatedMembership?.plan?.name ?? null,
    issuedAt: invoice.issuedAt,
    dueDate: invoice.dueDate,
    subtotal: Number(invoice.subtotal),
    discountAmount: Number(invoice.discountAmount),
    taxAmount: Number(invoice.taxAmount),
    total,
    paidAmount,
    remaining: Math.max(0, total - paidAmount),
    status: invoice.status,
    payments: invoice.payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      method: p.method,
      paidAt: p.paidAt,
    })),
  };
}

export async function getMemberPaymentSummary(memberId: string, gymId: string) {
  const [invoices, payments] = await Promise.all([
    db.invoice.findMany({
      where: { gymId, memberId },
      orderBy: { issuedAt: "desc" },
      include: {
        payments: {
          where: { isReversal: false },
          select: { amount: true, paidAt: true, method: true },
          orderBy: { paidAt: "desc" },
        },
      },
    }),
    db.payment.findMany({
      where: { gymId, memberId, isReversal: false },
      orderBy: { paidAt: "desc" },
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            total: true,
            status: true,
          },
        },
      },
    }),
  ]);

  const totalPaid = payments.reduce((sum: number, p) => sum + Number(p.amount), 0);
  const totalDue = invoices.reduce((sum: number, inv) => sum + Number(inv.total), 0);
  const outstanding = Math.max(0, totalDue - totalPaid);

  return { invoices, payments, totalPaid, totalDue, outstanding };
}

export async function getRecentPayments(gymId: string, limit = 10) {
  const payments = await db.payment.findMany({
    where: { gymId, isReversal: false },
    orderBy: { paidAt: "desc" },
    take: limit,
    include: {
      invoice: {
        select: {
          invoiceNumber: true,
          memberId: true,
        },
      },
    },
  });

  // Get member info separately
  const memberIds = [...new Set(payments.map((p) => p.memberId))];
  const members = await db.user.findMany({
    where: { id: { in: memberIds } },
    select: { id: true, name: true, phone: true },
  });
  const memberMap = new Map(members.map((m) => [m.id, m]));

  return payments.map((payment) => ({
    ...payment,
    invoice: {
      ...payment.invoice,
      memberId: payment.invoice.memberId,
      member: {
        user: memberMap.get(payment.memberId) ?? { name: "Unknown", phone: null },
      },
    },
  }));
}

export type UnpaidInvoiceRow = {
  id: string;
  invoiceNumber: string;
  memberName: string;
  memberPhone: string | null;
  total: number;
  issuedAt: Date;
  dueDate: Date | null;
  paidAmount: number;
};

export async function listUnpaidInvoices(gymId: string): Promise<UnpaidInvoiceRow[]> {
  const invoices = await db.invoice.findMany({
    where: {
      gymId,
      status: { in: ["UNPAID", "PARTIALLY_PAID"] },
    },
    // Oldest due date first (legacy rows with no dueDate sort last).
    orderBy: { dueDate: { sort: "asc", nulls: "last" } },
    include: {
      payments: {
        where: { isReversal: false },
      },
    },
  });

  // Get member details separately
  const memberIds = invoices.map((inv) => inv.memberId);
  const members = await db.user.findMany({
    where: { id: { in: memberIds } },
    select: { id: true, name: true, phone: true },
  });
  const memberMap = new Map(members.map((m) => [m.id, m]));

  return invoices.map((inv) => {
    const paidAmount = inv.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const member = memberMap.get(inv.memberId);
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      memberName: member?.name ?? "Unknown",
      memberPhone: member?.phone ?? null,
      total: Number(inv.total),
      issuedAt: inv.issuedAt,
      dueDate: inv.dueDate,
      paidAmount,
    };
  });
}