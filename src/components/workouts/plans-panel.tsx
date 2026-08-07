"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssignPlanDialog } from "@/components/workouts/assign-plan-dialog";
import { PlansTable } from "@/components/workouts/plans-table";
import type { WorkoutPlanListItem } from "@/lib/data/workouts";

type Option = { id: string; name: string };

export function PlansPanel({
  plans,
  members,
  templates,
}: {
  plans: WorkoutPlanListItem[];
  members: Option[];
  templates: Option[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Assign plan
        </Button>
      </div>
      <PlansTable plans={plans} />
      <AssignPlanDialog open={open} onOpenChange={setOpen} members={members} templates={templates} />
    </div>
  );
}
