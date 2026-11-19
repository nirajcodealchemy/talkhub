"use client";

import { useTranslations } from "next-intl";
import { AttachmentPreviewListProps } from "@/src/types/chat";
import { FileText, Image as ImageIcon, File, X } from "lucide-react";

export default function AttachmentPreviewList({
  files,
  onRemove,
}: AttachmentPreviewListProps) {
  const t = useTranslations("screen.chat.MessageInput");

  if (files.length === 0) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} ${t("fileSizeBytes")}`;

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} ${t("fileSizeKilobytes")}`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} ${t("fileSizeMegabytes")}`;
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <ImageIcon size={20} />;
    }

    if (
      file.type.includes("pdf") ||
      file.type.includes("document") ||
      file.type.includes("text")
    ) {
      return <FileText size={20} />;
    }

    return <File size={20} />;
  };

  return (
    <div className="flex flex-wrap gap-2 pb-1">
      {files.map((file, index) => (
        <div
          key={`${file.name}-${file.lastModified}-${index}`}
          className="group relative flex max-w-[220px] items-center gap-2 rounded-xl border border-grey-200 bg-grey-50 px-3 py-2"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-chart-4/10 text-chart-4">
            {getFileIcon(file)}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">
              {file.name}
            </p>

            <p className="text-[10px] text-grey-400">
              {formatFileSize(file.size)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onRemove(index)}
            aria-label={t("removeFile", { name: file.name })}
            className="flex h-6 w-6 cursor-pointer shrink-0 items-center justify-center rounded-full bg-grey-200 text-grey-600 transition hover:bg-logout-red-light hover:text-destructive"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
