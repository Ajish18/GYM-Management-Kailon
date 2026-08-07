"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText, ImageOff, Loader2 } from "lucide-react";
import { getAttachmentSignedUrlAction } from "@/lib/actions/messaging.actions";

/** Fetches a short-lived signed URL for a private attachment on demand and
 *  caches it client-side for close to its 1hr TTL — the storage path never
 *  needs to be re-resolved on every 5-10s thread poll this way. */
export function AttachmentPreview({ path, kind }: { path: string; kind: "IMAGE" | "PDF" }) {
  const { data: url, isLoading, isError } = useQuery({
    queryKey: ["message-attachment-url", path],
    queryFn: async () => {
      const result = await getAttachmentSignedUrlAction(path);
      if (!result.success) throw new Error(result.error);
      return result.data.url;
    },
    staleTime: 45 * 60 * 1000,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="mb-1 flex h-28 w-40 items-center justify-center rounded-lg bg-background/40">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !url) {
    return (
      <div className="mb-1 flex items-center gap-1.5 rounded-lg bg-background/40 px-2 py-1.5 text-xs text-muted-foreground">
        <ImageOff className="size-3.5" /> Attachment unavailable
      </div>
    );
  }

  if (kind === "IMAGE") {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mb-1 block">
        {/* Private, signed, gym-uploaded content — not an optimizable next/image asset. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Attachment" className="max-h-60 max-w-full rounded-lg object-cover" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mb-1 flex items-center gap-1.5 rounded-lg bg-background/40 px-2 py-1.5 text-sm underline underline-offset-2"
    >
      <FileText className="size-4" /> View PDF
    </a>
  );
}
