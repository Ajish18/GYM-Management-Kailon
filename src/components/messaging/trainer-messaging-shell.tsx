"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ConversationList, type ConversationSummary } from "@/components/messaging/conversation-list";
import { MessageThread } from "@/components/messaging/message-thread";
import { getTrainerConversationsAction } from "@/lib/actions/messaging.actions";

const POLL_INTERVAL_MS = 10000;

export function TrainerMessagingShell({
  trainerId,
  initialConversations,
}: {
  trainerId: string;
  initialConversations: ConversationSummary[];
}) {
  const { data } = useQuery({
    queryKey: ["trainer-conversations", trainerId],
    queryFn: async () => {
      const result = await getTrainerConversationsAction();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    initialData: initialConversations,
    refetchInterval: POLL_INTERVAL_MS,
  });

  const conversations = data ?? initialConversations;
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(
    initialConversations[0]?.memberId ?? null,
  );

  // Keep a selection even if the initial list was empty at first paint and
  // fills in from the poll, or the previously-selected member disappears
  // (e.g. reassigned away mid-session).
  useEffect(() => {
    if (conversations.length === 0) {
      if (selectedMemberId !== null) setSelectedMemberId(null);
      return;
    }
    if (!selectedMemberId || !conversations.some((c) => c.memberId === selectedMemberId)) {
      setSelectedMemberId(conversations[0].memberId);
    }
  }, [conversations, selectedMemberId]);

  const selected = conversations.find((c) => c.memberId === selectedMemberId);

  if (conversations.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No members assigned to you yet — once someone is assigned, you&apos;ll be able to message them here.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
      <ConversationList
        conversations={conversations}
        selectedMemberId={selectedMemberId}
        onSelect={setSelectedMemberId}
      />
      {selected && (
        <MessageThread
          key={selected.memberId}
          trainerId={trainerId}
          memberId={selected.memberId}
          partnerName={selected.memberName}
          partnerImage={selected.memberImage}
        />
      )}
    </div>
  );
}
