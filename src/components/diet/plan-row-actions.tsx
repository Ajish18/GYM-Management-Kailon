"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updatePlanStatusAction } from "@/lib/actions/diet.actions";

export function PlanRowActions({ planId, status }: { planId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function updateStatus(nextStatus: "COMPLETED" | "CANCELLED") {
    startTransition(async () => {
      const result = await updatePlanStatusAction({ planId, status: nextStatus });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(nextStatus === "COMPLETED" ? "Plan marked complete" : "Plan cancelled");
      router.refresh();
    });
  }

  if (status !== "ACTIVE") return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={pending} aria-label="Plan actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => updateStatus("COMPLETED")}>
          <CheckCircle2 className="h-4 w-4" />
          Mark complete
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => updateStatus("CANCELLED")}>
          <XCircle className="h-4 w-4" />
          Cancel plan
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
