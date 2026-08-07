import { handle, paginatedOk, parsePagination } from "@/lib/api/response";
import { requireApiGymScope } from "@/lib/api/guard";
import { db } from "@/lib/db";

/** Payments, newest first. Owner/reception see the gym's records; members
 *  only their own. Supports ?from=&to= date range. Amounts are returned as
 *  numbers (Decimal → Number). */
export const GET = handle(async (req) => {
  const { user, gymId } = await requireApiGymScope("GYM_OWNER", "RECEPTIONIST", "MEMBER");
  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);

  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const where = {
    gymId,
    ...(user.role === "MEMBER" ? { memberId: user.id } : {}),
    ...(from ? { paidAt: { gte: new Date(from) } } : {}),
    ...(to ? { paidAt: { lte: new Date(`${to}T23:59:59.999`) } } : {}),
  };

  const [total, payments] = await Promise.all([
    db.payment.count({ where }),
    db.payment.findMany({
      where,
      orderBy: { paidAt: "desc" },
      skip,
      take,
      include: { invoice: { select: { invoiceNumber: true, dueDate: true } } },
    }),
  ]);

  const memberIds = [...new Set(payments.map((p) => p.memberId))];
  const nameById = new Map(
    (await db.user.findMany({ where: { id: { in: memberIds } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]),
  );

  return paginatedOk(
    payments.map((p) => ({
      id: p.id,
      invoiceNumber: p.invoice.invoiceNumber,
      memberId: p.memberId,
      memberName: nameById.get(p.memberId) ?? "Unknown",
      amount: Number(p.amount),
      method: p.method,
      referenceNote: p.referenceNote,
      paidAt: p.paidAt,
      isReversal: p.isReversal,
      dueDate: p.invoice.dueDate,
    })),
    total,
    page,
    pageSize,
  );
});
