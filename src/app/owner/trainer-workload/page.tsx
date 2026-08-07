import type { Metadata } from "next";
import { requireGymScope } from "@/lib/auth/guards";
import { getTrainerWorkload } from "@/lib/data/trainer-workload";
import { TrainerWorkloadTable } from "@/components/trainer/workload-table";
import { Users, Dumbbell, UserCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Trainer Workload" };

export default async function OwnerTrainerWorkloadPage() {
  const { gymId } = await requireGymScope("GYM_OWNER");
  const rows = await getTrainerWorkload(gymId);

  const totalAssigned = rows.reduce((s, r) => s + r.assignedMembers, 0);
  const totalPlans = rows.reduce((s, r) => s + r.activeWorkoutPlans + r.activeDietPlans, 0);
  const totalToday = rows.reduce((s, r) => s + r.todayCheckIns, 0);
  const overloaded = rows.filter((r) => r.utilizationPercent !== null && r.utilizationPercent >= 100).length;

  const stats = [
    { label: "Trainers", value: rows.length, icon: Users },
    { label: "Members assigned", value: totalAssigned, icon: Users },
    { label: "Active plans", value: totalPlans, icon: Dumbbell },
    { label: "Checked in today", value: totalToday, icon: UserCheck },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trainer Workload</h1>
        <p className="text-muted-foreground">
          How members and plans are spread across your trainers
          {overloaded > 0 && ` — ${overloaded} at or above capacity`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">{s.value}</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <TrainerWorkloadTable rows={rows} />
    </div>
  );
}
