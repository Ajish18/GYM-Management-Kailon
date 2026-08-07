"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getMyNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/actions/notifications.actions";
import type { NotificationListItem } from "@/lib/data/notifications";
import { getTypeIcon } from "@/components/notifications/notification-type";

const POLL_INTERVAL_MS = 60_000;

export function NotificationBellClient({
  initialItems,
  initialUnreadCount,
}: {
  initialItems: NotificationListItem[];
  initialUnreadCount: number;
}) {
  const [items, setItems] = useState(initialItems);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    const result = await getMyNotificationsAction();
    if (result.success) {
      setItems(result.data.items);
      setUnreadCount(result.data.unreadCount);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) void refresh();
  }

  function handleItemClick(notification: NotificationListItem) {
    if (notification.readAt) return;
    setItems((prev) =>
      prev.map((item) => (item.id === notification.id ? { ...item, readAt: new Date() } : item)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    startTransition(async () => {
      const result = await markNotificationReadAction({ notificationId: notification.id });
      if (!result.success) toast.error(result.error);
    });
  }

  function handleMarkAllRead() {
    if (unreadCount === 0) return;
    setItems((prev) => prev.map((item) => (item.readAt ? item : { ...item, readAt: new Date() })));
    setUnreadCount(0);
    startTransition(async () => {
      const result = await markAllNotificationsReadAction();
      if (!result.success) toast.error(result.error);
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        className="relative rounded-full outline-none ring-primary/50 focus-visible:ring-2"
        render={
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </Button>
        }
      >
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px] leading-none"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-1.5 py-1">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          </DropdownMenuGroup>
          {unreadCount > 0 && (
            <DropdownMenuItem
              closeOnClick={false}
              onClick={handleMarkAllRead}
              className="w-auto gap-1 px-1.5 py-0.5 text-xs text-muted-foreground"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </DropdownMenuItem>
          )}
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 && (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
            You&apos;re all caught up.
          </div>
        )}
        {items.map((notification) => {
          const Icon = getTypeIcon(notification.type);
          const isUnread = !notification.readAt;
          return (
            <DropdownMenuItem
              key={notification.id}
              onClick={() => handleItemClick(notification)}
              className="flex-col items-start gap-0.5 whitespace-normal py-2"
            >
              <div className="flex w-full items-start gap-2">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("truncate text-sm", isUnread ? "font-medium" : "text-muted-foreground")}>
                      {notification.title}
                    </span>
                    {isUnread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>
                  <span className="text-[11px] text-muted-foreground/70">
                    {formatDistanceToNowStrict(notification.createdAt, { addSuffix: true })}
                  </span>
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
