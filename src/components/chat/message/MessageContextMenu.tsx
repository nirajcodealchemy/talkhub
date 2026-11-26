"use client";

import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/src/types/chat";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";
import {
  Copy,
  Plus,
  Reply,
  Pencil,
  Trash2,
  Loader2,
  Forward,
  Download,
  MoreVertical,
} from "lucide-react";

type Props = {
  isMine: boolean;
  onEdit: () => void;
  message: ChatMessage;
  onDelete: () => void;
  onReply?: () => void;
  isImageGroup: boolean;
  onForward?: () => void;
  quickReactions: string[];
  onReact: (emoji: string) => void;
  onDownloadGroup: () => Promise<void>;
};

export default function MessageContextMenu({
  isMine,
  onEdit,
  onReply,
  message,
  onDelete,
  onForward,
  isImageGroup,
  quickReactions,
  onDownloadGroup,
  onReact,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isReactionOpen, setIsReactionOpen] = useState(false);
  const [isAllEmojiOpen, setIsAllEmojiOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [emojiPickerPosition, setEmojiPickerPosition] = useState({
    top: 0,
    left: 0,
    width: 350,
    height: 350,
  });

  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);
  const allEmojiPickerRef = useRef<HTMLDivElement>(null);

  const isDeleted = message.is_deleted_for_everyone || message.deleted_for_me;

  const t = useTranslations("screen.chat.MessageItem");
  // const t2 = useTranslations("screen.chat.ConversationInfoModal");

  useEffect(() => {
    if (!isOpen && !isReactionOpen && !isAllEmojiOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target) &&
        !reactionPickerRef.current?.contains(target) &&
        !allEmojiPickerRef.current?.contains(target)
      ) {
        setIsOpen(false);
        setIsReactionOpen(false);
        setIsAllEmojiOpen(false);
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
  }, [isOpen, isReactionOpen, isAllEmojiOpen]);

  useEffect(() => {
    if (!isAllEmojiOpen) return;

    const updateEmojiPickerPosition = () => {
      const reactionBounds = reactionPickerRef.current?.getBoundingClientRect();

      if (!reactionBounds) return;

      const margin = 8;
      const gap = 8;

      const width = Math.min(350, window.innerWidth - margin * 2);
      const height = Math.min(350, window.innerHeight - margin * 2);

      const left = Math.max(
        margin,
        Math.min(reactionBounds.left, window.innerWidth - width - margin),
      );

      const belowTop = reactionBounds.bottom + gap;
      const top =
        belowTop + height <= window.innerHeight - margin
          ? belowTop
          : Math.max(margin, reactionBounds.top - height - gap);

      setEmojiPickerPosition({ top, left, width, height });
    };

    updateEmojiPickerPosition();

    window.addEventListener("resize", updateEmojiPickerPosition);
    window.addEventListener("scroll", updateEmojiPickerPosition, true);

    return () => {
      window.removeEventListener("resize", updateEmojiPickerPosition);
      window.removeEventListener("scroll", updateEmojiPickerPosition, true);
    };
  }, [isAllEmojiOpen]);

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
    const content = message.content || message.attachment_url || "";
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

  const handleOpenAllEmojis = () => {
    setIsAllEmojiOpen((open) => !open);
  };

  if (
    isDeleted ||
    !["text", "image", "file", "sticker"].includes(message.message_type ?? "")
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
        className={`absolute top-1/2 z-1 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 ${
          isMine ? "-left-[112px]" : "-right-[112px]"
        }`}
      >
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={handleToggle}
          title={t("moreOptions")}
          aria-label={t("moreMessageOptions")}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground"
        >
          <MoreVertical size={17} />
        </button>

        {/* {message.message_type === "file" || "sticker" || "image" ? (
          ""
        ) : (
          <button
            type="button"
            title={t("copyMessage")}
            aria-label={t("copyMessage")}
            disabled={!message.content && !message.attachment_url}
            onClick={() => void handleCopy()}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Copy size={15} />
          </button>
        )} */}
        {message.message_type !== "image" &&
          message.message_type !== "sticker" && (
            <button
              type="button"
              title={t("copyMessage")}
              aria-label={t("copyMessage")}
              disabled={!message.content && !message.attachment_url}
              onClick={() => void handleCopy()}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy size={15} />
            </button>
          )}

        <button
          type="button"
          aria-label="Add reaction"
          aria-expanded={isReactionOpen}
          onClick={() => {
            setIsReactionOpen((open) => !open);
            setIsAllEmojiOpen(false);
          }}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground"
        >
          <Plus size={17} />
        </button>

        {isReactionOpen && (
          <div
            ref={reactionPickerRef}
            className={`absolute bottom-full z-10000 mb-2 flex items-center gap-1 rounded-full border border-border bg-popover p-1.5 shadow-lg ${
              isMine ? "left-0" : "right-0"
            }`}
          >
            {quickReactions.map((emoji) => (
              <button
                key={emoji}
                type="button"
                aria-label={`React with ${emoji}`}
                onClick={() => {
                  onReact(emoji);
                  setIsReactionOpen(false);
                }}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-xl transition hover:scale-125 hover:bg-accent"
              >
                {emoji}
              </button>
            ))}
            <button
              type="button"
              aria-label="Choose another emoji"
              onClick={handleOpenAllEmojis}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <Plus size={19} />
            </button>
          </div>
        )}
      </div>

      {isAllEmojiOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={allEmojiPickerRef}
            style={{
              position: "fixed",
              top: emojiPickerPosition.top,
              left: emojiPickerPosition.left,
              width: emojiPickerPosition.width,
              height: emojiPickerPosition.height,
            }}
            className="z-10001 overflow-hidden rounded-lg shadow-xl"
          >
            <EmojiPicker
              width="100%"
              height="100%"
              onEmojiClick={(emojiData: EmojiClickData) => {
                onReact(emojiData.emoji);
                setIsReactionOpen(false);
                setIsAllEmojiOpen(false);
              }}
              previewConfig={{ showPreview: false }}
            />
          </div>,
          document.body,
        )}

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-9998"
              onClick={() => setIsOpen(false)}
            />

            <div
              ref={menuRef}
              onClick={(event) => event.stopPropagation()}
              style={{ top: position.top, left: position.left }}
              className="fixed z-9999 w-44 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-xl"
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
                  onReply?.();
                }}
                className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent"
              >
                <Reply size={16} />
                Reply
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onForward?.();
                }}
                className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent"
              >
                <Forward size={16} />
                Forward
              </button>

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
