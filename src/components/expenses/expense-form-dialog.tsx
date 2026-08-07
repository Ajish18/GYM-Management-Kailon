"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  createExpenseSchema,
  type CreateExpenseInput,
  type CreateExpenseFormInput,
  type UpdateExpenseInput,
} from "@/lib/validations/expenses";
import { createExpenseAction, updateExpenseAction } from "@/lib/actions/expenses.actions";
import type { ExpenseCategoryItem, ExpenseListItem } from "@/lib/data/expenses";

/** Formats a stored (already date-only/UTC-midnight) Expense date for an
 *  <input type="date">. Safe to use toISOString here since the value came
 *  from z.coerce.date() on a date-only string, so it's UTC midnight already. */
function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Today's date in the browser's local timezone, formatted for
 *  <input type="date"> — deliberately NOT toISOString(), which can roll back
 *  to "yesterday" for users east of UTC during early morning hours. */
function todayLocalInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  categories,
  expense,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ExpenseCategoryItem[];
  expense?: ExpenseListItem;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const isEdit = Boolean(expense);
  const activeCategories = categories.filter((c) => c.isActive || c.id === expense?.categoryId);

  const form = useForm<CreateExpenseFormInput, unknown, CreateExpenseInput>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      categoryId: expense?.categoryId ?? activeCategories[0]?.id ?? "",
      amount: expense?.amount ?? 0,
      expenseDate: expense ? toDateInputValue(expense.expenseDate) : todayLocalInputValue(),
      vendorNote: expense?.vendorNote ?? "",
    },
  });

  async function onSubmit(values: CreateExpenseInput) {
    setLoading(true);
    const result = expense
      ? await updateExpenseAction({ ...values, id: expense.id } as UpdateExpenseInput)
      : await createExpenseAction(values);
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(isEdit ? "Expense updated" : "Expense recorded");
    onOpenChange(false);
    if (!isEdit) form.reset();
    router.refresh();
  }

  if (activeCategories.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No categories yet</DialogTitle>
            <DialogDescription>
              Add an expense category first, then come back to record an expense.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit expense" : "Record expense"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this expense entry." : "Log a gym expense against a category."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} value={field.value as number} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expenseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value as string} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="vendorNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor / note (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g. ABC Electricals — August bill" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? "Save changes" : "Record expense"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
