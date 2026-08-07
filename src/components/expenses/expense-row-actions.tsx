"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog";
import { deleteExpenseAction } from "@/lib/actions/expenses.actions";
import type { ExpenseCategoryItem, ExpenseListItem } from "@/lib/data/expenses";

export function ExpenseRowActions({
  expense,
  categories,
}: {
  expense: ExpenseListItem;
  categories: ExpenseCategoryItem[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();

  async function onDelete() {
    if (!confirm("Delete this expense entry? This can't be undone.")) return;
    const result = await deleteExpenseAction(expense.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Expense deleted");
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Expense actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ExpenseFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        categories={categories}
        expense={expense}
      />
    </>
  );
}
