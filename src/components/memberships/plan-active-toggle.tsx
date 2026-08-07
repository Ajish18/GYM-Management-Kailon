"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { togglePlanActiveAction } from "@/lib/actions/memberships.actions";

export function PlanActiveToggle({ planId, isActive }: { planId: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Switch
      checked={isActive}
      disabled={pending}
      onCheckedChange={(checked) =>
        startTransition(async () => {
          const result = await togglePlanActiveAction(planId, checked);
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          router.refresh();
        })
      }
    />
  );
}
