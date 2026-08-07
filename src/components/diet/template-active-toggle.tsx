"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { toggleTemplateActiveAction } from "@/lib/actions/diet.actions";

export function TemplateActiveToggle({
  templateId,
  isActive,
}: {
  templateId: string;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Switch
      checked={isActive}
      disabled={pending}
      onCheckedChange={(checked) =>
        startTransition(async () => {
          const result = await toggleTemplateActiveAction(templateId, checked);
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
