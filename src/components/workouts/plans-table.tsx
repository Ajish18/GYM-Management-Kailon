"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { markPlanCompleteAction, cancelPlanAction } from "@/lib/actions/workouts.actions";
import { formatDate } from "@/lib/format";
import type { WorkoutPlanListItem } from "@/lib/data/workouts";

const STATUS_VARIANT = {
  ACTIVE: "default",
  COMPLETED: "secondary",
  CANCELLED: "outline",
} as const;

export function PlansTable({ plans }: { plans: WorkoutPlanListItem[] }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(action: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error ?? "Something went wrong");
        return;
      }
      router.refresh();
    });
  }

  if (plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
        <p className="font-medium">No workout plans assigned yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Assign a template to a member to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Template</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Start date</TableHead>
            <TableHead>Assigned by</TableHead>
            <TableHead className="w-44" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {plans.map((plan) => (
            <TableRow key={plan.id}>
              <TableCell className="font-medium">{plan.memberName}</TableCell>
              <TableCell className="text-muted-foreground">{plan.templateName}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[plan.status]}>{plan.status}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(plan.startDate)}</TableCell>
              <TableCell className="text-muted-foreground">{plan.assignedByName}</TableCell>
              <TableCell>
                {plan.status === "ACTIVE" && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => run(() => markPlanCompleteAction(plan.id))}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Complete
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => run(() => cancelPlanAction(plan.id))}
                    >
                      <XCircle className="h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
