import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireGymScope } from "@/lib/auth/guards";
import {
  listExpenseCategories,
  listActiveExpenseCategories,
  listExpenses,
  getMonthlyCategoryBreakdown,
  getPnlSummary,
} from "@/lib/data/expenses";
import { PnlSummaryCard } from "@/components/expenses/pnl-summary-card";
import { CategoryManager } from "@/components/expenses/category-manager";
import { CategoryBreakdown } from "@/components/expenses/category-breakdown";
import { CreateExpenseButton } from "@/components/expenses/create-expense-button";
import { ExpenseFilters } from "@/components/expenses/expense-filters";
import { ExpenseTable } from "@/components/expenses/expense-table";

export const metadata: Metadata = { title: "Expenses" };

function monthStartFromParam(param?: string): Date {
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [year, month] = param.split("-").map(Number);
    if (!Number.isNaN(year) && !Number.isNaN(month)) {
      return new Date(year, month - 1, 1);
    }
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function monthParamValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(date);
}

export default async function OwnerExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    categoryId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
    month?: string;
  }>;
}) {
  const { gymId } = await requireGymScope("GYM_OWNER");
  const { q, categoryId, dateFrom, dateTo, page, month } = await searchParams;

  const reportMonthStart = monthStartFromParam(month);
  const reportMonthEnd = new Date(
    reportMonthStart.getFullYear(),
    reportMonthStart.getMonth() + 1,
    1,
  );

  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [allCategories, activeCategories, expenseList, breakdown, pnl] = await Promise.all([
    listExpenseCategories(gymId),
    listActiveExpenseCategories(gymId),
    listExpenses({
      gymId,
      search: q,
      categoryId,
      dateFrom,
      dateTo,
      page: page ? Number(page) : 1,
    }),
    getMonthlyCategoryBreakdown(gymId, reportMonthStart, reportMonthEnd),
    getPnlSummary(gymId, currentMonthStart),
  ]);

  const filterQuery = new URLSearchParams();
  if (q) filterQuery.set("q", q);
  if (categoryId) filterQuery.set("categoryId", categoryId);
  if (dateFrom) filterQuery.set("dateFrom", dateFrom);
  if (dateTo) filterQuery.set("dateTo", dateTo);

  function pageHref(targetPage: number) {
    const params = new URLSearchParams(filterQuery);
    params.set("page", String(targetPage));
    return `?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">Track spending, manage categories, and see your P&amp;L.</p>
        </div>
        <CreateExpenseButton categories={activeCategories} />
      </div>

      <PnlSummaryCard pnl={pnl} monthLabel={monthLabel(currentMonthStart)} />

      <Tabs defaultValue="expenses">
        <TabsList>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="report">Monthly report</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-4 pt-4">
          <ExpenseFilters categories={activeCategories} />
          <ExpenseTable expenses={expenseList.items} categories={activeCategories} />

          {expenseList.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={expenseList.page <= 1}
                nativeButton={false}
                render={<Link href={pageHref(expenseList.page - 1)}>Previous</Link>}
              />
              <span className="text-sm text-muted-foreground">
                Page {expenseList.page} of {expenseList.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={expenseList.page >= expenseList.totalPages}
                nativeButton={false}
                render={<Link href={pageHref(expenseList.page + 1)}>Next</Link>}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories" className="pt-4">
          <CategoryManager categories={allCategories} />
        </TabsContent>

        <TabsContent value="report" className="pt-4">
          <CategoryBreakdown
            month={monthParamValue(reportMonthStart)}
            rows={breakdown.rows}
            total={breakdown.total}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
