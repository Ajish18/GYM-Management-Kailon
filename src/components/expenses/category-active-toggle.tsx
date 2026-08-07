"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { toggleCategoryActiveAction } from "@/lib/actions/expenses.actions";

export function CategoryActiveToggle({
  categoryId,
  isActive,
  disabled,
}: {
  categoryId: string;
  isActive: boolean;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Switch
      checked={isActive}
      disabled={disabled || pending}
      onCheckedChange={(checked) =>
        startTransition(async () => {
          const result = await toggleCategoryActiveAction(categoryId, checked);
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
