"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { reversePaymentAction } from "@/lib/actions/payments.actions";

/** Reverses a mistaken payment. Writes a compensating reversal row and
 *  recomputes the invoice status — the money is never deleted, just
 *  un-applied (see reversePaymentAction). */
export function ReversePaymentButton({
  paymentId,
  invoiceNumber,
  memberName,
}: {
  paymentId: string;
  invoiceNumber: string;
  memberName: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onConfirm() {
    setLoading(true);
    const result = await reversePaymentAction(paymentId);
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Payment reversed");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Undo2 className="h-3.5 w-3.5" />
        Reverse
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reverse this payment?</DialogTitle>
            <DialogDescription>
              {memberName} — invoice {invoiceNumber}. The payment will be un-applied
              from the invoice, which may become partially paid or unpaid again.
              This cannot be undone except by re-collecting the amount.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onConfirm} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Reverse payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
