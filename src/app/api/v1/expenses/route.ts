import { handle, paginatedOk, parsePagination } from "@/lib/api/response";
import { requireApiGymScope } from "@/lib/api/guard";
import { db } from "@/lib/db";

/** Expenses, newest first. Owner/reception only (permission matrix). */
export const GET = handle(async (req) => {
  const { gymId } = await requireApiGymScope("GYM_OWNER", "RECEPTIONIST");
  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);

  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const where = {
    gymId,
    ...(from ? { expenseDate: { gte: new Date(from) } } : {}),
    ...(to ? { expenseDate: { lte: new Date(`${to}T23:59:59.999`) } } : {}),
  };

  const [total, expenses] = await Promise.all([
    db.expense.count({ where }),
    db.expense.findMany({
      where,
      orderBy: { expenseDate: "desc" },
      skip,
      take,
      include: { category: { select: { name: true } } },
    }),
  ]);

  return paginatedOk(
    expenses.map((e) => ({
      id: e.id,
      category: e.category.name,
      amount: Number(e.amount),
      expenseDate: e.expenseDate,
      vendorNote: e.vendorNote,
    })),
    total,
    page,
    pageSize,
  );
});
