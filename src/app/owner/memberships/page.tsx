import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { requireGymScope } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { CreatePlanDialog } from "@/components/memberships/create-plan-dialog";
import { PlanActiveToggle } from "@/components/memberships/plan-active-toggle";
import { formatCurrency } from "@/lib/format";

export const metadata: Metadata = { title: "Membership Plans" };

export default async function MembershipPlansPage() {
  const { gymId } = await requireGymScope("GYM_OWNER");
  const plans = await db.membershipPlan.findMany({
    where: { gymId },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Membership plans</h1>
          <p className="text-muted-foreground">The plans your front desk can assign to members.</p>
        </div>
        <CreatePlanDialog />
      </div>

      {plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <p className="font-medium">No plans yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create your first plan — e.g. Monthly, Quarterly, Yearly.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">{plan.durationDays} days</p>
                  </div>
                  <PlanActiveToggle planId={plan.id} isActive={plan.isActive} />
                </div>
                <p className="text-2xl font-semibold tracking-tight">{formatCurrency(Number(plan.price))}</p>
                {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
                {plan.includesTrainer && (
                  <p className="text-xs font-medium text-primary">Includes personal trainer</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
