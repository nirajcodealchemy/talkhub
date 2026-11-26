/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useTranslations } from "next-intl";
import { MessageInputProps } from "@/src/types";
import { useRef, useState, DragEvent, useEffect } from "react";
import { FileIcon, MicIcon, PlusIcon, SendIcon } from "../icons";
import { X, Paperclip, Loader2, ShieldAlert } from "lucide-react";
import { AttachmentPreviewList, EmojiPickerPopover } from "./message-input";
import {
  MAX_FILE_SIZE,
  ALLOWED_EXTENSIONS,
  ALLOWED_FILE_TYPES,
} from "@/src/constant/attachmentFile";
import { useMessages } from "@/src/hooks";
import { MESSAGE_SUGGESTIONS } from "@/src/constant/messageSuggestions";
import GiphyStickerPicker from "./message-input/GiphyStickerPicker";

export default function MessageInput({
  onSend,
  replyTo,
  onTyping,
  onAttachment,
  onCancelEdit,
  onEditSubmit,
  onStopTyping,
  onAttachments,
  onCancelReply,
  conversationId,
  editingMessage,
  suggestedReply,
  isBanned = false,
  onSuggestionApplied,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [selectedStickerUrl, setSelectedStickerUrl] = useState<string | null>(
    null,
  );

  const dragCounter = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const t = useTranslations("screen.chat.MessageInput");

  useEffect(() => {
    if (!editingMessage) return;

    setMessage(editingMessage.content ?? "");
    setSelectedFiles([]);
    setAttachmentOpen(false);

    requestAnimationFrame(() => {
      const textarea = textareaRef.current;

      if (!textarea) return;

      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);

      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    });
  }, [editingMessage]);

  // Reset input whenever the active conversation changes
  useEffect(() => {
    setMessage("");
    setSelectedFiles([]);
    setSelectedSticker(null);
    setAttachmentOpen(false);
    setIsStickerPickerOpen(false);

    setIsDragging(false);

    dragCounter.current = 0;

    if (textareaRef.current) {
      textareaRef.current.style.height = "24px";
    }
  }, [conversationId]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [conversationId]);

  useEffect(() => {
    setSuggestionsDismissed(false);
  }, [conversationId]);

  useEffect(() => {
    if (!suggestedReply) return;

    setMessage(suggestedReply);

    requestAnimationFrame(() => {
      const textarea = textareaRef.current;

      if (!textarea) return;

      textarea.focus();
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;

      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    });

    onSuggestionApplied?.();
  }, [suggestedReply, onSuggestionApplied]);

  // Track whether suggestions were dismissed in this conversation

  // Get messages for the currently selected conversation
  const {
    data: messagesData,
    isLoading: isMessagesLoading,
    isError: isMessagesError,
  } = useMessages(conversationId ?? "");

  // Check whether this conversation already has messages
  const hasMessages =
    messagesData?.pages.some((page) => page.length > 0) ?? false;

  // Show suggestions only for a new conversation
  const showSuggestions =
    !!conversationId &&
    !isMessagesLoading &&
    !isMessagesError &&
    !hasMessages &&
    !suggestionsDismissed &&
    !editingMessage &&
    !isBanned;

  function validateAttachment(file: File): string | null {
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name} exceeds the maximum file size of 20 MB.`;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();

    const isAllowedType = ALLOWED_FILE_TYPES.includes(file.type);
    const isAllowedExtension =
      !!extension && ALLOWED_EXTENSIONS.includes(extension);

    if (!isAllowedType || !isAllowedExtension) {
      return `${file.name} is not a supported file type.`;
    }

    return null;
  }

  const addFiles = (files: FileList | File[]) => {
    if (isBanned) return;
    const newFiles = Array.from(files);

    setSelectedFiles((previous) => {
      const uniqueFiles = newFiles.filter(
        (newFile) =>
          !previous.some(
            (file) =>
              file.name === newFile.name &&
              file.size === newFile.size &&
              file.lastModified === newFile.lastModified,
          ),
      );

      return [...previous, ...uniqueFiles];
    });

    setAttachmentOpen(false);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((previous) => previous.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (isBanned) return;
    const value = message.trim();

    if (editingMessage) {
      if (isSending || !value) return;

      setIsSending(true);

      try {
        await onEditSubmit(value);
        setMessage("");
        setSelectedFiles([]);
        setSelectedSticker(null);

        if (textareaRef.current) {
          textareaRef.current.style.height = "24px";
        }
      } catch (error) {
        console.error("Message editing failed:", error);
      } finally {
        setIsSending(false);
      }

      return;
    }
    onStopTyping?.();

    if (isSending || (!value && selectedFiles.length === 0 && !selectedSticker))
      return;

    setIsSending(true);

    try {
      const imageFiles = selectedFiles.filter((file) =>
        file.type.startsWith("image/"),
      );

      const otherFiles = selectedFiles.filter(
        (file) => !file.type.startsWith("image/"),
      );

      // if (selectedSticker) {
      //   await onSend(selectedSticker, replyTo?.id, "sticker");
      // }

      // // Send all images as one group.
      // if (imageFiles.length > 0) {
      //   await onAttachments?.(imageFiles, value);
      // } else if (value) {
      //   await onSend(value, replyTo?.id);
      // }

      // // Send other files individually.
      // for (const file of otherFiles) {
      //   await onAttachment?.(file);
      // }
      if (selectedSticker) {
        // Send sticker and caption as one message.
        await onSend(value, replyTo?.id, "sticker", selectedSticker);
      } else {
        // Keep existing image and file behavior when no sticker is selected.
        if (imageFiles.length > 0) {
          await onAttachments?.(imageFiles, value);
        } else if (value) {
          await onSend(value, replyTo?.id);
        }

        for (const file of otherFiles) {
          await onAttachment?.(file);
        }
      }
      // Hide suggestions after the first successful send
      setSuggestionsDismissed(true);

      setMessage("");
      setSelectedFiles([]);
      setSelectedSticker(null);

      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (error) {
      console.error("Message sending failed:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleStickerSelect = (stickerUrl: string) => {
    if (!stickerUrl) return;
    setSelectedSticker(stickerUrl);
    textareaRef.current?.focus();
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounter.current += 1;

    if (event.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounter.current -= 1;

    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    dragCounter.current = 0;
    setIsDragging(false);

    if (event.dataTransfer.files.length > 0) {
      addFiles(event.dataTransfer.files);
    }
  };

  const canSend =
    !!message.trim() || selectedFiles.length > 0 || !!selectedSticker;

  if (isBanned) {
    return (
      <div className="m-3 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-4">
        <div className="rounded-full bg-destructive/10 p-2">
          <ShieldAlert className="h-5 w-5 text-destructive" />
        </div>

        <div>
          <p className="text-sm font-semibold text-destructive">
            {t("bannedFromGroup")}
          </p>

          <p className="text-xs text-muted-foreground">
            {t("bannedFromGroupDescription")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {showSuggestions && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide bg-transparent px-5 py-3">
          {MESSAGE_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                setMessage(suggestion);

                requestAnimationFrame(() => {
                  const textarea = textareaRef.current;

                  if (!textarea) return;

                  textarea.focus();
                  textarea.style.height = "auto";
                  textarea.style.height = `${Math.min(
                    textarea.scrollHeight,
                    120,
                  )}px`;
                });
              }}
              className="shrink-0 cursor-pointer rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        className="relative m-3 shrink-0 rounded-md bg-background px-6 py-3"
      >
        {isDragging && (
          <div className="absolute inset-2 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-chart-4 bg-chart-4/5">
            <div className="flex flex-col items-center gap-2 text-chart-4">
              <Paperclip size={28} />
              <p className="text-sm font-semibold">{t("dropFiles")}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {replyTo && !editingMessage && (
            <div className="flex items-center justify-between rounded-lg border-l-4 border-chart-4 bg-chart-4/5 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-chart-4">
                  Replying to{" "}
                  {replyTo.sender_profile?.full_name ||
                    replyTo.sender_profile?.username ||
                    "Unknown user"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {replyTo.content || "Attachment"}
                </p>
              </div>

              <button
                type="button"
                onClick={onCancelReply}
                className="ml-3 shrink-0 rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Cancel reply"
              >
                <X size={18} />
              </button>
            </div>
          )}
          {/* Editing message indicator */}
          {editingMessage && (
            <div className="flex items-center justify-between rounded-lg border-l-4 border-chart-4 bg-chart-4/5 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-chart-4">
                  {t("editingMessage")}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {editingMessage.content}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMessage("");
                  setSelectedFiles([]);
                  onCancelEdit();
                  textareaRef.current?.focus();
                }}
                className="ml-3 shrink-0 cursor-pointer rounded-full p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                aria-label="Cancel editing"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* <AttachmentPreviewList files={selectedFiles} onRemove={removeFile} /> */}
          <AttachmentPreviewList files={selectedFiles} onRemove={removeFile} />

          {/* Quick Message Suggestions */}
          {selectedSticker && !editingMessage && (
            <div className="flex items-center gap-2">
              <img
                src={selectedSticker}
                alt="Sticker preview"
                className="max-h-20 max-w-20 rounded object-contain"
              />
              <button
                type="button"
                onClick={() => setSelectedSticker(null)}
                className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Remove selected sticker"
              >
                <X size={16} />
              </button>
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(event) => {
              const value = event.target.value;

              setMessage(value);

              if (!editingMessage) {
                if (value.trim()) {
                  onTyping?.();
                } else {
                  onStopTyping?.();
                }
              }

              event.target.style.height = "auto";
              event.target.style.height = `${Math.min(
                event.target.scrollHeight,
                120,
              )}px`;
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;

              // Shift + Enter = New line
              if (event.shiftKey) {
                event.stopPropagation();
                return;
              }

              // Don't send while composing text (IME)
              if (event.nativeEvent.isComposing) return;

              // Enter = Send message
              event.preventDefault();
              event.stopPropagation();
              handleSend();
            }}
            placeholder={t("typeMessage")}
            rows={1}
            className=" w-full max-h-30 min-h-6 resize-none overflow-y-auto bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
          />

          <hr className="-mx-6 w-auto border-0 border-t border-border" />

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="relative">
                <button
                  type="button"
                  aria-label={t("addAttachment")}
                  onClick={() => setAttachmentOpen(!attachmentOpen)}
                  className="cursor-pointer rounded-full p-1 text-grey-400 transition-colors hover:text-chart-4"
                >
                  {attachmentOpen ? <X size={20} /> : <PlusIcon />}
                </button>

                {attachmentOpen && (
                  <div className="absolute bottom-9 left-0 z-30 w-40 rounded-lg border border-border bg-popover p-1.5 shadow-lg">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex w-full cursor-pointer items-center gap-2 rounded px-2.5 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-accent"
                    >
                      <Paperclip size={15} />
                      {t("attachFiles")}
                    </button>
                  </div>
                )}
              </div>

              <input
                ref={fileRef}
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.webp,.zip,.pdf,.xls,.xlsx,.csv,.doc,.docx,.ppt,.pptx"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);

                  for (const file of files) {
                    const error = validateAttachment(file);

                    if (error) {
                      // Replace with your existing toast notification if available.
                      alert(error);
                      e.target.value = "";
                      return;
                    }
                  }

                  // Continue with your existing attachment selection logic.
                  addFiles(files);

                  e.target.value = "";
                }}
              />

              <button
                type="button"
                aria-label={t("voiceMessage")}
                disabled
                className="cursor-not-allowed rounded-full p-1 text-grey-400 transition-colors hover:text-grey-600"
              >
                <MicIcon />
              </button>

              <EmojiPickerPopover
                onEmojiSelect={(emoji) =>
                  setMessage((previous) => previous + emoji)
                }
              />

              <button
                type="button"
                aria-label={t("sticker")}
                onClick={() => setIsStickerPickerOpen((open) => !open)}
                aria-pressed={isStickerPickerOpen}
                className="rounded-full cursor-pointer p-1 transition-colors hover:text-grey-600"
              >
                <FileIcon />
              </button>
              {isStickerPickerOpen && (
                <div className="absolute bottom-full left-0 z-50 mb-2 w-[min(340px,calc(100vw-24px))] overflow-hidden rounded-xl border bg-background shadow-xl">
                  <GiphyStickerPicker
                    onSelect={(stickerUrl) => {
                      handleStickerSelect(stickerUrl);
                      setIsStickerPickerOpen(false);
                    }}
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              aria-label={t("sendMessage")}
              onClick={handleSend}
              disabled={!canSend}
              className={`flex cursor-pointer items-center justify-center rounded-full transition-colors ${
                canSend
                  ? "bg-chart-4 text-white hover:bg-chart-5"
                  : "bg-grey-100 text-grey-300"
              } disabled:cursor-not-allowed`}
            >
              {isSending ? (
                <Loader2 size={19} className="animate-spin" />
              ) : (
                <>
                  {message.length === 0 && selectedFiles.length === 0 ? (
                    <SendIcon color={null} />
                  ) : (
                    <SendIcon color="var(--chart-4)" />
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
