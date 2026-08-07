import "server-only";
import type { MessageType } from "@prisma/client";
import { db } from "@/lib/db";

export type ConversationSummary = {
  memberId: string;
  memberName: string;
  memberImage: string | null;
  conversationId: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null; // ISO
  unreadCount: number;
};

export type ThreadMessage = {
  id: string;
  type: MessageType;
  body: string | null;
  attachmentStoragePath: string | null;
  relatedWorkoutPlanId: string | null;
  relatedDietPlanId: string | null;
  senderId: string;
  isMine: boolean;
  readAt: string | null; // ISO
  createdAt: string; // ISO
};

function previewFor(message: { type: MessageType; body: string | null }): string {
  switch (message.type) {
    case "TEXT":
      return message.body ?? "";
    case "IMAGE":
      return "📷 Photo";
    case "PDF":
      return "📄 PDF";
    case "WORKOUT_NOTE":
      return "📋 Workout note";
    case "DIET_NOTE":
      return "🥗 Diet note";
    default:
      return "";
  }
}

/** Trainer's conversation list — only members *currently* assigned to this
 *  trainer show up here, re-checked live on every call (docs/09 §10.16): if
 *  a member gets reassigned away, the thread simply drops off this list for
 *  the old trainer. The old `Conversation` row itself is left untouched
 *  (nothing to delete/archive — see the send-time guard in
 *  messaging.actions.ts for how re-sends into a stale pairing are blocked). */
export async function getTrainerConversations(
  trainerId: string,
  gymId: string,
): Promise<ConversationSummary[]> {
  const members = await db.memberProfile.findMany({
    where: { gymId, assignedTrainerId: trainerId },
    include: { user: { select: { id: true, name: true, image: true } } },
  });
  if (members.length === 0) return [];

  const memberIds = members.map((m) => m.userId);

  const conversations = await db.conversation.findMany({
    where: { gymId, trainerId, memberId: { in: memberIds } },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const convByMember = new Map(conversations.map((c) => [c.memberId, c]));

  const unreadCounts = await db.message.groupBy({
    by: ["conversationId"],
    where: {
      conversation: { gymId, trainerId, memberId: { in: memberIds } },
      readAt: null,
      senderId: { not: trainerId },
    },
    _count: { _all: true },
  });
  const unreadByConv = new Map(unreadCounts.map((u) => [u.conversationId, u._count._all]));

  return members
    .map((m) => {
      const conv = convByMember.get(m.userId);
      const lastMessage = conv?.messages[0];
      return {
        memberId: m.userId,
        memberName: m.user.name,
        memberImage: m.user.image,
        conversationId: conv?.id ?? null,
        lastMessagePreview: lastMessage ? previewFor(lastMessage) : null,
        lastMessageAt: lastMessage ? lastMessage.createdAt.toISOString() : null,
        unreadCount: conv ? (unreadByConv.get(conv.id) ?? 0) : 0,
      };
    })
    .sort((a, b) => {
      const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      if (at !== bt) return bt - at;
      return a.memberName.localeCompare(b.memberName);
    });
}

/** Member's single conversation with their *current* assigned trainer — no
 *  list needed, and (unlike the trainer side) a member never sees any past
 *  trainer's thread once reassigned. */
export async function getMemberConversation(
  memberId: string,
  gymId: string,
): Promise<{ trainerId: string; trainerName: string; trainerImage: string | null } | null> {
  const profile = await db.memberProfile.findUnique({
    where: { userId: memberId },
    select: { assignedTrainerId: true },
  });
  if (!profile?.assignedTrainerId) return null;

  const trainer = await db.user.findFirst({
    where: { id: profile.assignedTrainerId, gymId },
    select: { id: true, name: true, image: true },
  });
  if (!trainer) return null;

  return { trainerId: trainer.id, trainerName: trainer.name, trainerImage: trainer.image };
}

export async function getConversationMessages(
  conversationId: string,
  viewerId: string,
): Promise<ThreadMessage[]> {
  const messages = await db.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });

  return messages.map((m) => ({
    id: m.id,
    type: m.type,
    body: m.body,
    attachmentStoragePath: m.attachmentStoragePath,
    relatedWorkoutPlanId: m.relatedWorkoutPlanId,
    relatedDietPlanId: m.relatedDietPlanId,
    senderId: m.senderId,
    isMine: m.senderId === viewerId,
    readAt: m.readAt ? m.readAt.toISOString() : null,
    createdAt: m.createdAt.toISOString(),
  }));
}

/** Unread count across every conversation this user is part of, regardless
 *  of whether they're the trainer or member side of it — a role-agnostic
 *  equivalent of the per-role inline counts already computed in
 *  lib/data/dashboard.ts (getTrainerDashboardStats/getMemberDashboardStats),
 *  kept here as a reusable building block rather than touching that file. */
export async function getUnreadMessageCount(userId: string): Promise<number> {
  return db.message.count({
    where: {
      conversation: { OR: [{ trainerId: userId }, { memberId: userId }] },
      readAt: null,
      senderId: { not: userId },
    },
  });
}
