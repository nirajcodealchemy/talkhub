"use client";

import { useLocale } from "next-intl";
import { Download, FileText } from "lucide-react";
import type { ChatAttachmentProps } from "@/src/types/chat";

function formatFileSize(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MessageAttachment({
  message,
  isMine,
}: ChatAttachmentProps) {
  const locale = useLocale();

  if (message.message_type !== "file" || !message.attachment_url) {
    return null;
  }

  const fileName = message.attachment_name || message.content || "File";
  const fileExtension =
    message.attachment_name?.split(".").pop()?.toUpperCase() || "FILE";

  const fileDate = new Date(message.created_at).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <a
      href={message.attachment_url}
      target="_blank"
      rel="noopener noreferrer"
      download={message.attachment_name || true}
      className={`flex w-[230px] max-w-full items-center gap-3 rounded-xl p-2.5 transition-colors ${
        isMine
          ? "bg-white/15 hover:bg-white/20"
          : "bg-background/80 hover:bg-background"
      }`}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white">
        <FileText size={25} className="text-red-500" strokeWidth={2} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold">{fileName}</p>

        <p
          className={`mt-1 text-[10px] ${
            isMine ? "text-primary-foreground/75" : "text-muted-foreground"
          }`}
        >
          {fileDate}
          {message.attachment_size
            ? ` · ${formatFileSize(message.attachment_size)}`
            : ""}
          {` · ${fileExtension}`}
        </p>
      </div>

      <Download
        size={17}
        className={`shrink-0 ${
          isMine ? "text-primary-foreground/80" : "text-chart-4"
        }`}
      />
    </a>
  );
}
