import type { Metadata } from "next";
import { requireGymScope } from "@/lib/auth/guards";
import { getTrainerConversations } from "@/lib/data/messaging";
import { TrainerMessagingShell } from "@/components/messaging/trainer-messaging-shell";

export const metadata: Metadata = { title: "Messages" };

export default async function TrainerMessagesPage() {
  const { user, gymId } = await requireGymScope("TRAINER");
  const conversations = await getTrainerConversations(user.id, gymId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <p className="text-muted-foreground">Chat with the members currently assigned to you.</p>
      </div>
      <TrainerMessagingShell trainerId={user.id} initialConversations={conversations} />
    </div>
  );
}
