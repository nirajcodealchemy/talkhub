"use client";

import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/src/types/chat";
import {
  Copy,
  Pencil,
  Trash2,
  Loader2,
  Download,
  MoreVertical,
} from "lucide-react";

type Props = {
  isMine: boolean;
  onEdit: () => void;
  message: ChatMessage;
  onDelete: () => void;
  isImageGroup: boolean;
  onDownloadGroup: () => Promise<void>;
};

export default function MessageContextMenu({
  isMine,
  onEdit,
  message,
  onDelete,
  isImageGroup,
  onDownloadGroup,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isDeleted = message.is_deleted_for_everyone || message.deleted_for_me;

  const t = useTranslations("screen.chat.MessageItem");

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const menuWidth = 176;
    const menuHeight = isImageGroup && !isMine ? 160 : 120;

    setPosition({
      top: Math.max(
        12,
        Math.min(rect.bottom + 8, window.innerHeight - menuHeight - 12),
      ),
      left: Math.max(
        12,
        Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12),
      ),
    });

    setIsOpen(true);
  };

  const handleCopy = async () => {
    const content = message.content ?? "";
    if (!content) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = content;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.setAttribute("readonly", "");
        document.body.appendChild(textarea);
        textarea.select();

        const copied = document.execCommand("copy");
        textarea.remove();

        if (!copied) throw new Error("Unable to copy message.");
      }

      setIsOpen(false);
      setCopySuccess(true);
      window.setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error("Copy message failed:", error);
    }
  };

  const handleGroupDownload = async () => {
    setIsOpen(false);
    setIsDownloading(true);

    try {
      await onDownloadGroup();
    } finally {
      setIsDownloading(false);
    }
  };

  if (
    isDeleted ||
    !["text", "image", "file"].includes(message.message_type ?? "")
  ) {
    return null;
  }

  return (
    <>
      {copySuccess && (
        <div className="fixed bottom-6 left-1/2 z-[150] -translate-x-1/2">
          <div className="rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-lg">
            {/* Text copied! */}
            {t("textCopied")}
          </div>
        </div>
      )}

      <div
        ref={triggerRef}
        className={`absolute top-1/2 z-30 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 ${
          isMine ? "-left-[76px]" : "-right-[76px]"
        }`}
      >
        <button
          type="button"
          title="More options"
          onClick={handleToggle}
          aria-expanded={isOpen}
          aria-label="More message options"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground"
        >
          <MoreVertical size={17} />
        </button>

        {message.message_type === "text" && message.content && (
          <button
            type="button"
            title="Copy message"
            aria-label="Copy message"
            onClick={() => void handleCopy()}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground"
          >
            <Copy size={15} />
          </button>
        )}
      </div>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setIsOpen(false)}
            />

            <div
              ref={menuRef}
              className="fixed z-[9999] w-44 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-xl"
              style={{ top: position.top, left: position.left }}
              onClick={(event) => event.stopPropagation()}
            >
              {!isMine && isImageGroup && (
                <button
                  type="button"
                  disabled={isDownloading}
                  onClick={() => void handleGroupDownload()}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDownloading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  {isDownloading ? t("PreparingZip") : t("downloadAll")}
                </button>
              )}

              {isMine && message.message_type === "text" && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onEdit();
                  }}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent"
                >
                  <Pencil size={16} />
                  {t("edit")}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onDelete();
                }}
                className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
              >
                <Trash2 size={16} />
                {t("delete")}
              </button>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
