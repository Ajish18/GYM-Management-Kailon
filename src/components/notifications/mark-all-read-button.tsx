"use client";

import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markAllNotificationsReadAction } from "@/lib/actions/notifications.actions";

/** Marks the current user's OWN notifications read (the action is
 *  userId-scoped), then refreshes. Only shown on own-scope inboxes — the
 *  owner's gym-wide view hides it because "mark all" there would be
 *  ambiguous (it can't touch other members' read state). */
export function MarkAllReadButton({ unreadCount }: { unreadCount: number }) {
  const router = useRouter();

  if (unreadCount === 0) return null;

  async function handleClick() {
    const result = await markAllNotificationsReadAction();
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <Button size="sm" variant="ghost" onClick={handleClick}>
      <CheckCheck className="h-4 w-4" />
      Mark all read
    </Button>
  );
}
