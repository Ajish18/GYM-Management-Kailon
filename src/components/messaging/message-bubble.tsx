"use client";

import { format } from "date-fns";
import { Dumbbell, Salad } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AttachmentPreview } from "@/components/messaging/attachment-preview";
import { cn } from "@/lib/utils";

/** Mirrors `ThreadMessage` from `lib/data/messaging.ts` structurally — kept
 *  as a plain local type (rather than importing across the server/client
 *  boundary) to match the house pattern already used for dialog props
 *  (see `Plan` in components/memberships/assign-membership-dialog.tsx). */
export type ThreadMessage = {
  id: string;
  type: "TEXT" | "IMAGE" | "PDF" | "WORKOUT_NOTE" | "DIET_NOTE";
  body: string | null;
  attachmentStoragePath: string | null;
  isMine: boolean;
  readAt: string | null;
  createdAt: string;
};

export function MessageBubble({
  message,
  partnerName,
  partnerImage,
}: {
  message: ThreadMessage;
  partnerName: string;
  partnerImage?: string | null;
}) {
  const isNote = message.type === "WORKOUT_NOTE" || message.type === "DIET_NOTE";

  return (
    <div className={cn("flex items-end gap-2", message.isMine && "flex-row-reverse")}>
      {!message.isMine && (
        <Avatar size="sm" className="mb-1">
          <AvatarImage src={partnerImage ?? undefined} alt={partnerName} />
          <AvatarFallback>{partnerName.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
          message.isMine ? "bg-primary text-primary-foreground" : "bg-muted",
          isNote && "border border-dashed border-current/20",
        )}
      >
        {isNote && (
          <Badge variant={message.isMine ? "secondary" : "outline"} className="mb-1">
            {message.type === "WORKOUT_NOTE" ? (
              <>
                <Dumbbell /> Workout note
              </>
            ) : (
              <>
                <Salad /> Diet note
              </>
            )}
          </Badge>
        )}

        {message.attachmentStoragePath && message.type === "IMAGE" && (
          <AttachmentPreview path={message.attachmentStoragePath} kind="IMAGE" />
        )}
        {message.attachmentStoragePath && message.type === "PDF" && (
          <AttachmentPreview path={message.attachmentStoragePath} kind="PDF" />
        )}

        {message.body && <p className="whitespace-pre-wrap">{message.body}</p>}

        <p
          className={cn(
            "mt-1 text-[10px] opacity-70",
            message.isMine ? "text-primary-foreground" : "text-muted-foreground",
          )}
        >
          {format(new Date(message.createdAt), "MMM d, h:mm a")}
        </p>
      </div>
    </div>
  );
}
