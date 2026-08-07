import "server-only";
import { db } from "@/lib/db";

const PAGE_SIZE = 20;

export type ExpenseCategoryItem = {
  id: string;
  name: string;
  isActive: boolean;
  isGlobal: boolean;
};

/** All categories visible to a gym: its own gym-scoped categories plus the
 *  shared global defaults (gymId: null) seeded once for every gym. */
export async function listExpenseCategories(gymId: string): Promise<ExpenseCategoryItem[]> {
  const rows = await db.expenseCategory.findMany({
    where: { OR: [{ gymId }, { gymId: null }] },
    orderBy: [{ name: "asc" }],
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    isActive: row.isActive,
    isGlobal: row.gymId === null,
  }));
}

export async function listActiveExpenseCategories(gymId: string): Promise<ExpenseCategoryItem[]> {
  const categories = await listExpenseCategories(gymId);
  return categories.filter((c) => c.isActive);
}

export type ExpenseListItem = {
  id: string;
  amount: number;
  expenseDate: Date;
  vendorNote: string | null;
  categoryId: string;
  categoryName: string;
  recordedByName: string | null;
  receiptStoragePath: string | null;
};

export async function listExpenses(params: {
  gymId: string;
  search?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
}): Promise<{
  items: ExpenseListItem[];
  total: number;
  page: number;
  totalPages: number;
  filteredTotal: number;
}> {
  const page = Math.max(1, params.page ?? 1);

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (params.dateFrom) dateFilter.gte = new Date(params.dateFrom);
  if (params.dateTo) dateFilter.lte = new Date(params.dateTo);

  const where = {
    gymId: params.gymId,
    ...(params.categoryId ? { categoryId: params.categoryId } : {}),
    ...(params.search
      ? { vendorNote: { contains: params.search, mode: "insensitive" as const } }
      : {}),
    ...(params.dateFrom || params.dateTo ? { expenseDate: dateFilter } : {}),
  };

  const [rows, total, totalAgg] = await Promise.all([
    db.expense.findMany({
      where,
      orderBy: { expenseDate: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        category: { select: { name: true } },
        recordedBy: { select: { name: true } },
      },
    }),
    db.expense.count({ where }),
    db.expense.aggregate({ where, _sum: { amount: true } }),
  ]);

  const items: ExpenseListItem[] = rows.map((row) => ({
    id: row.id,
    amount: Number(row.amount),
    expenseDate: row.expenseDate,
    vendorNote: row.vendorNote,
    categoryId: row.categoryId,
    categoryName: row.category.name,
    recordedByName: row.recordedBy?.name ?? null,
    receiptStoragePath: row.receiptStoragePath,
  }));

  return {
    items,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    filteredTotal: Number(totalAgg._sum.amount ?? 0),
  };
}

export type CategoryBreakdownRow = {
  categoryId: string;
  categoryName: string;
  amount: number;
  percent: number;
};

/** Category-wise expense totals for the half-open range [monthStart, monthEnd). */
export async function getMonthlyCategoryBreakdown(
  gymId: string,
  monthStart: Date,
  monthEnd: Date,
): Promise<{ rows: CategoryBreakdownRow[]; total: number }> {
  const grouped = await db.expense.groupBy({
    by: ["categoryId"],
    where: { gymId, expenseDate: { gte: monthStart, lt: monthEnd } },
    _sum: { amount: true },
  });

  if (grouped.length === 0) return { rows: [], total: 0 };

  const categories = await db.expenseCategory.findMany({
    where: { id: { in: grouped.map((g) => g.categoryId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(categories.map((c) => [c.id, c.name]));

  const total = grouped.reduce((sum, g) => sum + Number(g._sum.amount ?? 0), 0);

  const rows: CategoryBreakdownRow[] = grouped
    .map((g) => {
      const amount = Number(g._sum.amount ?? 0);
      return {
        categoryId: g.categoryId,
        categoryName: nameById.get(g.categoryId) ?? "Unknown category",
        amount,
        percent: total > 0 ? (amount / total) * 100 : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return { rows, total };
}

export type PnlSummary = {
  revenue: number;
  expenses: number;
  netProfit: number;
  prevRevenue: number;
  prevExpenses: number;
  prevNetProfit: number;
};

/** P&L = Revenue (Payment, isReversal: false) − Expenses, for the month
 *  containing `monthStart`, compared against the prior calendar month.
 *  Mirrors the revenue aggregation pattern in getOwnerDashboardStats. */
export async function getPnlSummary(gymId: string, monthStart: Date): Promise<PnlSummary> {
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
  const prevMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);

  const [revenue, expenses, prevRevenue, prevExpenses] = await Promise.all([
    db.payment.aggregate({
      where: { gymId, paidAt: { gte: monthStart, lt: monthEnd }, isReversal: false },
      _sum: { amount: true },
    }),
    db.expense.aggregate({
      where: { gymId, expenseDate: { gte: monthStart, lt: monthEnd } },
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: { gymId, paidAt: { gte: prevMonthStart, lt: monthStart }, isReversal: false },
      _sum: { amount: true },
    }),
    db.expense.aggregate({
      where: { gymId, expenseDate: { gte: prevMonthStart, lt: monthStart } },
      _sum: { amount: true },
    }),
  ]);

  const rev = Number(revenue._sum.amount ?? 0);
  const exp = Number(expenses._sum.amount ?? 0);
  const prevRev = Number(prevRevenue._sum.amount ?? 0);
  const prevExp = Number(prevExpenses._sum.amount ?? 0);

  return {
    revenue: rev,
    expenses: exp,
    netProfit: rev - exp,
    prevRevenue: prevRev,
    prevExpenses: prevExp,
    prevNetProfit: prevRev - prevExp,
  };
}
