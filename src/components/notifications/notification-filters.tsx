"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TYPE_OPTIONS } from "@/components/notifications/notification-type";
import { buildNotificationQuery } from "@/components/notifications/notification-query";

const ALL = "__all";

/** Filter bar for the notification-center Inbox tab. Every control pushes a
 *  fresh query string onto the page URL (resetting to page 1), so filtering
 *  is fully server-driven via the page's searchParams — no client state to
 *  desync. The owner's gym-wide view also gets a member dropdown. */
export function NotificationFilters({
  memberOptions = [],
}: {
  memberOptions?: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const type = searchParams.get("type") ?? "";
  const unread = searchParams.get("unread") === "true";
  const memberId = searchParams.get("memberId") ?? "";

  function push(patch: Parameters<typeof buildNotificationQuery>[1]) {
    router.push(`${pathname}?${buildNotificationQuery(searchParams, { ...patch, page: 1 })}`);
  }

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    push({ q: q.trim() });
  }

  return (
    <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-52 flex-1">
        <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search notifications…"
          className="pl-9"
          aria-label="Search notifications"
        />
      </div>
      <Button type="submit" size="sm" variant="secondary">
        Search
      </Button>
      {q !== "" && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setQ("");
            push({ q: "" });
          }}
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}

      <Select
        value={type || ALL}
        onValueChange={(value) => push({ type: value === ALL || value === null ? "" : value })}
      >
        <SelectTrigger className="w-44" aria-label="Filter by type">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All types</SelectItem>
          {TYPE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        size="sm"
        variant="outline"
        className={cn(unread && "bg-secondary text-secondary-foreground")}
        onClick={() => push({ unread: !unread })}
      >
        Unread only
      </Button>

      {memberOptions.length > 0 && (
        <Select
          value={memberId || ALL}
          onValueChange={(value) => push({ memberId: value === ALL || value === null ? "" : value })}
        >
          <SelectTrigger className="w-44" aria-label="Filter by member">
            <SelectValue placeholder="All members" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All members</SelectItem>
            {memberOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </form>
  );
}
