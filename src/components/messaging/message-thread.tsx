"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageBubble } from "@/components/messaging/message-bubble";
import { MessageComposer } from "@/components/messaging/message-composer";
import { getThreadMessagesAction, markThreadReadAction } from "@/lib/actions/messaging.actions";

// No WebSocket infra exists yet — short-interval polling via react-query is
// the pragmatic v1 approach for a thread that needs to feel "live".
const POLL_INTERVAL_MS = 6000;

export function MessageThread({
  trainerId,
  memberId,
  partnerName,
  partnerImage,
}: {
  trainerId: string;
  memberId: string;
  partnerName: string;
  partnerImage?: string | null;
}) {
  const queryClient = useQueryClient();
  const queryKey = ["message-thread", trainerId, memberId];
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMarkedRef = useRef<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await getThreadMessagesAction({ trainerId, memberId });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });

  const messages = useMemo(() => data?.messages ?? [], [data]);
  const conversationId = data?.conversationId ?? null;
  const latestMessageId = messages[messages.length - 1]?.id ?? null;
  const hasUnread = useMemo(() => messages.some((m) => !m.isMine && !m.readAt), [messages]);

  // Mark the other party's unread messages read whenever the thread is open
  // and shows something new — guarded by a ref so this fires once per
  // "batch" of incoming messages rather than on every 6s poll.
  useEffect(() => {
    if (!conversationId || !hasUnread) return;
    const marker = `${conversationId}:${latestMessageId}`;
    if (lastMarkedRef.current === marker) return;
    lastMarkedRef.current = marker;
    void markThreadReadAction({ trainerId, memberId });
  }, [conversationId, latestMessageId, hasUnread, trainerId, memberId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function handleSent() {
    queryClient.invalidateQueries({ queryKey });
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center rounded-xl border">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-[60vh] flex-col rounded-xl border">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Avatar size="sm">
          <AvatarImage src={partnerImage ?? undefined} alt={partnerName} />
          <AvatarFallback>{partnerName.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="font-medium">{partnerName}</span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No messages yet — say hello!</p>
        )}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} partnerName={partnerName} partnerImage={partnerImage} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-3">
        <MessageComposer
          trainerId={trainerId}
          memberId={memberId}
          disabled={data ? !data.canSend : false}
          disabledReason={
            data && !data.canSend
              ? "This trainer/member pairing has changed — this thread is read-only."
              : undefined
          }
          onSent={handleSent}
        />
      </div>
    </div>
  );
}
