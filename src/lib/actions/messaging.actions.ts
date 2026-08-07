"use server";

import { revalidatePath } from "next/cache";
import type { MessageType } from "@prisma/client";
import { db } from "@/lib/db";
import { requireGymScope } from "@/lib/auth/guards";
import { uploadFile, getSignedUrl } from "@/lib/storage";
import {
  sendMessageSchema,
  threadParamsSchema,
  MAX_ATTACHMENT_BYTES,
  ALLOWED_ATTACHMENT_TYPES,
  type ThreadParamsInput,
} from "@/lib/validations/messaging";
import {
  getTrainerConversations,
  getConversationMessages,
  type ConversationSummary,
  type ThreadMessage,
} from "@/lib/data/messaging";
import { getNotificationPreferences } from "@/lib/data/notifications";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

/** Confirms `viewerId` is one half of the trainer/member pair before any
 *  read/write on that pair proceeds — the client sends both ids as plain
 *  form fields, so this stops a trainer/member from passing someone else's
 *  id and reaching a conversation they're not part of. */
function assertParticipant(
  role: string,
  viewerId: string,
  trainerId: string,
  memberId: string,
): { success: false; error: string } | null {
  if (role === "TRAINER" && viewerId !== trainerId) {
    return { success: false, error: "Not authorized for this conversation" };
  }
  if (role === "MEMBER" && viewerId !== memberId) {
    return { success: false, error: "Not authorized for this conversation" };
  }
  return null;
}

/** A pairing may only *send* while the member's current assignedTrainerId
 *  still matches this thread's trainerId — this is what makes a
 *  reassignment take effect immediately (docs/12 §12.17): the old trainer's
 *  thread (and the member's view of it) becomes read-only the moment the
 *  member is reassigned, with no separate migration step needed. */
async function canSendMessage(gymId: string, trainerId: string, memberId: string): Promise<boolean> {
  const member = await db.memberProfile.findFirst({
    where: { userId: memberId, gymId },
    select: { assignedTrainerId: true },
  });
  return member?.assignedTrainerId === trainerId;
}

export async function getTrainerConversationsAction(): Promise<ActionResult<ConversationSummary[]>> {
  const { user, gymId } = await requireGymScope("TRAINER");
  const conversations = await getTrainerConversations(user.id, gymId);
  return { success: true, data: conversations };
}

export async function getThreadMessagesAction(
  input: ThreadParamsInput,
): Promise<ActionResult<{ messages: ThreadMessage[]; canSend: boolean; conversationId: string | null }>> {
  const { user, gymId } = await requireGymScope("TRAINER", "MEMBER");
  const parsed = threadParamsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid conversation" };
  const { trainerId, memberId } = parsed.data;

  const denied = assertParticipant(user.role, user.id, trainerId, memberId);
  if (denied) return denied;

  const conversation = await db.conversation.findUnique({
    where: { gymId_trainerId_memberId: { gymId, trainerId, memberId } },
  });
  const canSend = await canSendMessage(gymId, trainerId, memberId);

  if (!conversation) {
    return { success: true, data: { messages: [], canSend, conversationId: null } };
  }

  const messages = await getConversationMessages(conversation.id, user.id);
  return { success: true, data: { messages, canSend, conversationId: conversation.id } };
}

/** Sends a TEXT/IMAGE/PDF message, lazily creating the Conversation on first
 *  send if it doesn't exist yet (docs/12 §12.17 — this stands in for
 *  auto-creating one on trainer assignment, since that assignment action
 *  lives in a different module we don't own). Structured WORKOUT_NOTE /
 *  DIET_NOTE messages aren't composed from this UI in v1, but other modules
 *  can create them directly via `db.message.create` with this same
 *  conversation-upsert pattern later. */
export async function sendMessageAction(
  formData: FormData,
): Promise<ActionResult<{ conversationId: string; messageId: string }>> {
  const { user, gymId } = await requireGymScope("TRAINER", "MEMBER");

  const trainerId = String(formData.get("trainerId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  const bodyRaw = formData.get("body");
  const body = typeof bodyRaw === "string" && bodyRaw.trim() ? bodyRaw.trim() : undefined;
  const fileEntry = formData.get("file");
  const file = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;

  const parsed = sendMessageSchema.safeParse({ trainerId, memberId, body, hasAttachment: !!file });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const denied = assertParticipant(user.role, user.id, trainerId, memberId);
  if (denied) return denied;

  const canSend = await canSendMessage(gymId, trainerId, memberId);
  if (!canSend) {
    return {
      success: false,
      error:
        user.role === "TRAINER"
          ? "You're no longer this member's trainer"
          : "This trainer is no longer assigned to you",
    };
  }

  if (file) {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return { success: false, error: "Attachment must be under 10MB" };
    }
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type as (typeof ALLOWED_ATTACHMENT_TYPES)[number])) {
      return { success: false, error: "Only images and PDFs are supported" };
    }
  }

  const conversation = await db.conversation.upsert({
    where: { gymId_trainerId_memberId: { gymId, trainerId, memberId } },
    update: {},
    create: { gymId, trainerId, memberId },
  });

  let attachmentStoragePath: string | undefined;
  let type: MessageType = "TEXT";
  if (file) {
    type = file.type === "application/pdf" ? "PDF" : "IMAGE";
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `messages/${gymId}/${conversation.id}/${Date.now()}-${safeName}`;
    attachmentStoragePath = await uploadFile(path, file, file.type);
  }

  const message = await db.message.create({
    data: {
      gymId,
      conversationId: conversation.id,
      senderId: user.id,
      type,
      body,
      attachmentStoragePath,
    },
  });

  // TRAINER_MESSAGE in-app notification to the other party (docs/09 §10.15).
  // Each message notifies once (relatedEntityId = message.id); the member's
  // opt-out is honoured via their preference toggle.
  const recipientId = user.role === "TRAINER" ? memberId : trainerId;
  const recipientPrefs = await getNotificationPreferences(recipientId);
  if (recipientPrefs.TRAINER_MESSAGE !== false) {
    await db.notification.create({
      data: {
        gymId,
        userId: recipientId,
        type: "TRAINER_MESSAGE",
        title: user.role === "TRAINER" ? "New message from your trainer" : "New message",
        body: body ?? (file ? "New attachment" : "New message"),
        relatedEntityType: "Message",
        relatedEntityId: message.id,
      },
    });
  }

  revalidatePath("/trainer/messages");
  revalidatePath("/member/chat");
  // Message notification renders in the header on every route.
  revalidatePath("/", "layout");

  return { success: true, data: { conversationId: conversation.id, messageId: message.id } };
}

/** Marks the other party's unread messages read when the viewer opens/views
 *  the thread. Reading an old, reassigned conversation is always allowed
 *  (only *sending* into one is blocked), so this doesn't re-check
 *  canSendMessage. */
export async function markThreadReadAction(input: ThreadParamsInput): Promise<ActionResult> {
  const { user, gymId } = await requireGymScope("TRAINER", "MEMBER");
  const parsed = threadParamsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid conversation" };
  const { trainerId, memberId } = parsed.data;

  const denied = assertParticipant(user.role, user.id, trainerId, memberId);
  if (denied) return denied;

  const conversation = await db.conversation.findUnique({
    where: { gymId_trainerId_memberId: { gymId, trainerId, memberId } },
    select: { id: true },
  });
  if (!conversation) return { success: true, data: undefined };

  await db.message.updateMany({
    where: { conversationId: conversation.id, readAt: null, senderId: { not: user.id } },
    data: { readAt: new Date() },
  });

  revalidatePath("/trainer/messages");
  revalidatePath("/member/chat");
  return { success: true, data: undefined };
}

/** Attachments are stored under a private bucket path; the client never
 *  gets a bare storage path to render directly, only a short-lived signed
 *  URL fetched on demand and re-checked against conversation membership. */
export async function getAttachmentSignedUrlAction(storagePath: string): Promise<ActionResult<{ url: string }>> {
  const { user, gymId } = await requireGymScope("TRAINER", "MEMBER");
  if (!storagePath.startsWith(`messages/${gymId}/`)) {
    return { success: false, error: "Not authorized" };
  }

  const message = await db.message.findFirst({
    where: { gymId, attachmentStoragePath: storagePath },
    select: { conversation: { select: { trainerId: true, memberId: true } } },
  });
  if (!message) return { success: false, error: "Attachment not found" };
  if (user.id !== message.conversation.trainerId && user.id !== message.conversation.memberId) {
    return { success: false, error: "Not authorized" };
  }

  const url = await getSignedUrl(storagePath, 3600);
  return { success: true, data: { url } };
}
