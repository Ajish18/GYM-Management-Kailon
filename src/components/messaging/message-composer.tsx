"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendMessageAction } from "@/lib/actions/messaging.actions";
import { MAX_ATTACHMENT_BYTES, ALLOWED_ATTACHMENT_TYPES } from "@/lib/validations/messaging";

export function MessageComposer({
  trainerId,
  memberId,
  disabled,
  disabledReason,
  onSent,
}: {
  trainerId: string;
  memberId: string;
  disabled?: boolean;
  disabledReason?: string;
  onSent: () => void;
}) {
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > MAX_ATTACHMENT_BYTES) {
      toast.error("Attachment must be under 10MB");
      e.target.value = "";
      return;
    }
    if (!ALLOWED_ATTACHMENT_TYPES.includes(selected.type as (typeof ALLOWED_ATTACHMENT_TYPES)[number])) {
      toast.error("Only images and PDFs are supported");
      e.target.value = "";
      return;
    }
    setFile(selected);
  }

  function resetFile() {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSend() {
    if (disabled || sending) return;
    if (!body.trim() && !file) return;

    setSending(true);
    const formData = new FormData();
    formData.set("trainerId", trainerId);
    formData.set("memberId", memberId);
    if (body.trim()) formData.set("body", body.trim());
    if (file) formData.set("file", file);

    const result = await sendMessageAction(formData);
    setSending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setBody("");
    resetFile();
    onSent();
  }

  if (disabled) {
    return (
      <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
        {disabledReason ?? "You can no longer send messages in this conversation."}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {file && (
        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm">
          <span className="min-w-0 flex-1 truncate">{file.name}</span>
          <button
            type="button"
            onClick={resetFile}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Remove attachment"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_ATTACHMENT_TYPES.join(",")}
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
          aria-label="Attach image or PDF"
        >
          <ImagePlus />
        </Button>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message…"
          className="min-h-9 flex-1 resize-none py-1.5"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={sending || (!body.trim() && !file)}
          aria-label="Send message"
        >
          {sending ? <Loader2 className="animate-spin" /> : <Send />}
        </Button>
      </div>
    </div>
  );
}
