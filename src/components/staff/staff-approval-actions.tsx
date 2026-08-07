"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approveTrainerAction, rejectTrainerAction } from "@/lib/actions/auth.actions";

export function StaffApprovalActions({ userId, name }: { userId: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function approve() {
    startTransition(async () => {
      const result = await approveTrainerAction(userId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${name} approved`);
      router.refresh();
    });
  }

  function reject() {
    if (!confirm(`Reject ${name}'s trainer account? This can't be undone from here.`)) return;
    startTransition(async () => {
      const result = await rejectTrainerAction(userId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${name} rejected`);
      router.refresh();
    });
  }

  return (
    <div className="mt-2 flex w-full gap-2">
      <Button size="sm" className="flex-1" disabled={pending} onClick={approve}>
        <Check className="h-3.5 w-3.5" />
        Approve
      </Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={reject}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
