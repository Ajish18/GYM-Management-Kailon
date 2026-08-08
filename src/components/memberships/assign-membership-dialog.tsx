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
  FormDescription,
} from "@/components/ui/form";
import {
  assignMembershipSchema,
  type AssignMembershipInput,
  type AssignMembershipFormInput,
} from "@/lib/validations/memberships";
import { assignMembershipAction } from "@/lib/actions/memberships.actions";
import { formatCurrency } from "@/lib/format";
import type { ActivePlan } from "@/lib/data/members";

export function AssignMembershipDialog({
  open,
  onOpenChange,
  memberId,
  memberName,
  plans,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  plans: ActivePlan[];
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<AssignMembershipFormInput, unknown, AssignMembershipInput>({
    resolver: zodResolver(assignMembershipSchema),
    defaultValues: {
      memberId,
      planId: plans[0]?.id ?? "",
      amountPaid: Number(plans[0]?.price ?? 0),
      method: "CASH",
      discountAmount: 0,
      discountReason: "",
      referenceNote: "",
    },
  });

  const selectedPlan = plans.find((p) => p.id === form.watch("planId"));

  async function onSubmit(values: AssignMembershipInput) {
    setLoading(true);
    const result = await assignMembershipAction({ ...values, memberId });
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`Invoice ${result.data.invoiceNumber} created`);
    onOpenChange(false);
    router.refresh();
  }

  if (plans.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No membership plans yet</DialogTitle>
            <DialogDescription>
              Create a membership plan first, then come back to assign one to {memberName}.
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
          <DialogTitle>Assign membership — {memberName}</DialogTitle>
          <DialogDescription>Creates the membership, invoice, and payment together.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="planId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      const plan = plans.find((p) => p.id === value);
                      if (plan) form.setValue("amountPaid", Number(plan.price));
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} — {formatCurrency(Number(plan.price))} / {plan.durationDays}d
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
                name="amountPaid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount collected</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} value={field.value as number} />
                    </FormControl>
                    <FormDescription>
                      Plan price: {selectedPlan ? formatCurrency(Number(selectedPlan.price)) : "—"}
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
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="discountAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} value={field.value as number} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="discountReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount reason</FormLabel>
                    <FormControl>
                      <Input placeholder="If applying a discount" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm & collect payment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
