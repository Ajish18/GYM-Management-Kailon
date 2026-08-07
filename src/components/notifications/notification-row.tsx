"use client";

import { useRouter } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { Check, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getTypeIcon, getTypeLabel } from "@/components/notifications/notification-type";
import {
  deleteNotificationAction,
  markNotificationReadAction,
} from "@/lib/actions/notifications.actions";
import type { NotificationListItem } from "@/lib/data/notifications";

/** One notification row on the Inbox tab. The actions call the revalidating
 *  server actions and then router.refresh() so the list (and the header
 *  badge) reflect the change immediately. */
export function NotificationRow({ notification }: { notification: NotificationListItem }) {
  const router = useRouter();
  const Icon = getTypeIcon(notification.type);
  const isUnread = !notification.readAt;

  async function handleMarkRead() {
    const result = await markNotificationReadAction({ notificationId: notification.id });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  async function handleDelete() {
    const result = await deleteNotificationAction({ notificationId: notification.id });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 transition-colors",
        isUnread && "bg-secondary/40",
      )}
    >
      <div className="mt-0.5 shrink-0 rounded-lg bg-secondary/60 p-1.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p
            className={cn(
              "truncate text-sm",
              isUnread ? "font-semibold text-foreground" : "text-muted-foreground",
            )}
          >
            {notification.title}
          </p>
          {isUnread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
        </div>
        <p className="text-sm text-muted-foreground">{notification.body}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground/80">
          <Badge variant="secondary" className="px-1.5 py-0 text-[11px] font-normal">
            {getTypeLabel(notification.type)}
          </Badge>
          {notification.memberName && (
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" />
              {notification.memberName}
            </span>
          )}
          <span>{formatDistanceToNowStrict(notification.createdAt, { addSuffix: true })}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {isUnread && (
          <Button size="icon-sm" variant="ghost" title="Mark as read" onClick={handleMarkRead}>
            <Check />
          </Button>
        )}
        <Button size="icon-sm" variant="ghost" title="Delete" onClick={handleDelete}>
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}
