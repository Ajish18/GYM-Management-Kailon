import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExpenseRowActions } from "@/components/expenses/expense-row-actions";
import type { ExpenseCategoryItem, ExpenseListItem } from "@/lib/data/expenses";
import { formatCurrency, formatDate } from "@/lib/format";

export function ExpenseTable({
  expenses,
  categories,
}: {
  expenses: ExpenseListItem[];
  categories: ExpenseCategoryItem[];
}) {
  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
        <p className="font-medium">No expenses found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Record your first expense or adjust the filters above.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Vendor / note</TableHead>
            <TableHead>Recorded by</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => (
            <TableRow key={expense.id}>
              <TableCell className="text-muted-foreground">{formatDate(expense.expenseDate)}</TableCell>
              <TableCell className="font-medium">{expense.categoryName}</TableCell>
              <TableCell className="text-muted-foreground">{expense.vendorNote ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{expense.recordedByName ?? "—"}</TableCell>
              <TableCell className="text-right font-medium">{formatCurrency(expense.amount)}</TableCell>
              <TableCell>
                <ExpenseRowActions expense={expense} categories={categories} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
