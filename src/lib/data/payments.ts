import "server-only";
import { unstable_cache } from "next/cache";
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

// Payments change only when a payment action runs — and those already call
// revalidatePath("/owner/payments" | "/reception/payments"), which clears the
// cached entries. 15s caching turns every repeat visit / sidebar click into a
// cache read instead of a 3-round-trip DB render.
export const listPayments = unstable_cache(
  async (params: {
    gymId: string;
    memberId?: string;
    page?: number;
  }): Promise<{ items: PaymentListItem[]; total: number; page: number; totalPages: number }> => {
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
  },
  ["payments-list"],
  { revalidate: 15 },
);

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

export const listInvoices = unstable_cache(
  async (params: {
    gymId: string;
    memberId?: string;
    status?: string;
    page?: number;
  }): Promise<{ items: InvoiceListItem[]; total: number; page: number; totalPages: number }> => {
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
  },
  ["invoices-list"],
  { revalidate: 15 },
);

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
 *  history (used to derive paid/remaining and render the receipt summary).
 *  Cached 15s — payments actions revalidate /owner/payments, /reception/payments. */
export const getInvoiceForCollection = unstable_cache(
  async (gymId: string, invoiceId: string): Promise<CollectInvoice | null> => {
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
  },
  ["payments-invoice-collection"],
  { revalidate: 15 },
);

export type MemberInvoiceFlat = {
  id: string;
  invoiceNumber: string;
  total: number;
  status: string;
  issuedAt: Date;
  dueDate: Date | null;
  payments: { amount: number; paidAt: Date; method: string }[];
};

export type MemberPaymentFlat = {
  id: string;
  amount: number;
  method: string;
  paidAt: Date;
  invoiceNumber: string;
  invoiceTotal: number;
  invoiceStatus: string;
};

export const getMemberPaymentSummary = unstable_cache(
  async (memberId: string, gymId: string) => {
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

  const flatInvoices: MemberInvoiceFlat[] = invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    total: Number(inv.total),
    status: inv.status,
    issuedAt: inv.issuedAt,
    dueDate: inv.dueDate,
    payments: inv.payments.map((p) => ({
      amount: Number(p.amount),
      paidAt: p.paidAt,
      method: p.method,
    })),
  }));

  const flatPayments: MemberPaymentFlat[] = payments.map((p) => ({
    id: p.id,
    amount: Number(p.amount),
    method: p.method,
    paidAt: p.paidAt,
    invoiceNumber: p.invoice.invoiceNumber,
    invoiceTotal: Number(p.invoice.total),
    invoiceStatus: p.invoice.status,
  }));

  const totalPaid = flatPayments.reduce((sum: number, p) => sum + p.amount, 0);
  const totalDue = flatInvoices.reduce((sum: number, inv) => sum + inv.total, 0);
  const outstanding = Math.max(0, totalDue - totalPaid);

  return { invoices: flatInvoices, payments: flatPayments, totalPaid, totalDue, outstanding };
  },
  ["payments-member-summary"],
  { revalidate: 15 },
);

export const getRecentPayments = unstable_cache(
  async (gymId: string, limit = 10) => {
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
  },
  ["payments-recent"],
  { revalidate: 15 },
);

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

export const listUnpaidInvoices = unstable_cache(
  async (gymId: string): Promise<UnpaidInvoiceRow[]> => {
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
  },
  ["payments-unpaid-invoices"],
  { revalidate: 15 },
);