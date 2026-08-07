"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Mirrors `ConversationSummary` from `lib/data/messaging.ts` structurally —
 *  see the note in message-bubble.tsx on why this isn't imported directly. */
export type ConversationSummary = {
  memberId: string;
  memberName: string;
  memberImage: string | null;
  conversationId: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

export function ConversationList({
  conversations,
  selectedMemberId,
  onSelect,
}: {
  conversations: ConversationSummary[];
  selectedMemberId: string | null;
  onSelect: (memberId: string) => void;
}) {
  if (conversations.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        No members assigned to you yet.
      </p>
    );
  }

  return (
    <div className="max-h-[60vh] space-y-1 overflow-y-auto rounded-xl border p-1.5">
      {conversations.map((c) => (
        <button
          key={c.memberId}
          type="button"
          onClick={() => onSelect(c.memberId)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted",
            selectedMemberId === c.memberId && "bg-muted",
          )}
        >
          <Avatar>
            <AvatarImage src={c.memberImage ?? undefined} alt={c.memberName} />
            <AvatarFallback>{c.memberName.slice(0, 1).toUpperCase()}</AvatarFallback>
            {c.unreadCount > 0 && <AvatarBadge />}
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{c.memberName}</span>
              {c.lastMessageAt && (
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {formatDistanceToNowStrict(new Date(c.lastMessageAt))}
                </span>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">{c.lastMessagePreview ?? "No messages yet"}</p>
          </div>
          {c.unreadCount > 0 && (
            <Badge variant="default" className="shrink-0">
              {c.unreadCount}
            </Badge>
          )}
        </button>
      ))}
    </div>
  );
}
