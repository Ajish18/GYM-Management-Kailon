import type { Metadata } from "next";
import { MessageSquareOff } from "lucide-react";
import { requireGymScope } from "@/lib/auth/guards";
import { getMemberConversation } from "@/lib/data/messaging";
import { MessageThread } from "@/components/messaging/message-thread";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Chat" };

export default async function MemberChatPage() {
  const { user, gymId } = await requireGymScope("MEMBER");
  const conversation = await getMemberConversation(user.id, gymId);

  if (!conversation) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>
          <p className="text-muted-foreground">Message your trainer directly.</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <MessageSquareOff className="size-8 text-muted-foreground" />
            <p className="font-medium">You don&apos;t have a trainer assigned yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Once the gym assigns you a trainer, you&apos;ll be able to chat with them here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>
        <p className="text-muted-foreground">Your conversation with {conversation.trainerName}.</p>
      </div>
      <MessageThread
        trainerId={conversation.trainerId}
        memberId={user.id}
        partnerName={conversation.trainerName}
        partnerImage={conversation.trainerImage}
      />
    </div>
  );
}
