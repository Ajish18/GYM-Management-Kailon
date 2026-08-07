"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  FormDescription,
} from "@/components/ui/form";
import {
  collectPaymentSchema,
  type CollectPaymentInput,
  type CollectPaymentFormInput,
} from "@/lib/validations/payments";
import { collectPaymentAction } from "@/lib/actions/payments.actions";
import { formatCurrency } from "@/lib/format";

/** Collects a payment against an existing invoice (the "Collect" button on
 *  the reception Payments page). Amount defaults to the full remaining
 *  balance; partial payments flip the invoice to PARTIALLY_PAID, the final
 *  one closes it as PAID (see collectPaymentAction). */
export function CollectPaymentForm({
  invoiceId,
  remaining,
  total,
}: {
  invoiceId: string;
  remaining: number;
  total: number;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<CollectPaymentFormInput, unknown, CollectPaymentInput>({
    resolver: zodResolver(collectPaymentSchema),
    defaultValues: {
      invoiceId,
      amount: remaining,
      method: "CASH",
      referenceNote: "",
    },
  });

  async function onSubmit(values: CollectPaymentInput) {
    setLoading(true);
    const result = await collectPaymentAction(values);
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(result.data.invoiceStatus === "PAID" ? "Invoice fully paid" : "Payment recorded");
    router.push("/reception/payments");
    router.refresh();
  }

  const entered = Number(form.watch("amount") ?? 0);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input type="number" step="0.01" min="0.01" max={remaining} {...field} value={field.value as number} />
                </FormControl>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={remaining <= 0}
                  onClick={() => form.setValue("amount", remaining)}
                >
                  Full balance
                </Button>
              </div>
              <FormDescription>
                {remaining > 0 && remaining < total
                  ? `Balance due: ${formatCurrency(remaining)} of ${formatCurrency(total)}`
                  : formatCurrency(remaining)}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment method</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="referenceNote"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reference note (optional)</FormLabel>
              <FormControl>
                <Input placeholder="UTR / transaction ID" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={loading || entered <= 0}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Collect {entered > 0 ? formatCurrency(entered) : ""}
        </Button>
      </form>
    </Form>
  );
}
