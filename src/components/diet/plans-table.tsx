import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlanDetailSheet } from "@/components/diet/plan-detail-sheet";
import { PlanRowActions } from "@/components/diet/plan-row-actions";
import type { DietPlanListItem } from "@/lib/data/diet";
import { formatDate } from "@/lib/format";

const STATUS_VARIANT: Record<DietPlanListItem["status"], "default" | "secondary" | "destructive"> = {
  ACTIVE: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

export function PlansTable({ plans }: { plans: DietPlanListItem[] }) {
  if (plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
        <p className="font-medium">No diet plans yet</p>
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
            <TableHead>Plan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Start date</TableHead>
            <TableHead className="w-32" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {plans.map((plan) => (
            <TableRow key={plan.id}>
              <TableCell className="font-medium">{plan.memberName}</TableCell>
              <TableCell className="text-muted-foreground">{plan.templateName ?? "Custom plan"}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[plan.status]}>{plan.status}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(plan.startDate)}</TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <PlanDetailSheet
                    planId={plan.id}
                    memberName={plan.memberName}
                    trigger={
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    }
                  />
                  <PlanRowActions planId={plan.id} status={plan.status} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
