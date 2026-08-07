"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog";
import type { ExpenseCategoryItem } from "@/lib/data/expenses";

export function CreateExpenseButton({ categories }: { categories: ExpenseCategoryItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add expense
      </Button>
      <ExpenseFormDialog open={open} onOpenChange={setOpen} categories={categories} />
    </>
  );
}
