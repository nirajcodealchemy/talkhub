"use client";

import MicIcon from "../icons/MicIcon";
import PlusIcon from "../icons/PlusIcon";
import FileIcon from "../icons/FileIcon";
import EmojiIcon from "../icons/EmojiIcon";
import { useTranslations } from "next-intl";
import { MessageInputProps } from "@/src/types/chat";
import SendIcon from "@/src/components/icons/SendIcon";
import { useRef, useState, DragEvent, useEffect } from "react";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";
import { X, FileText, Image as ImageIcon, File, Paperclip } from "lucide-react";

export default function MessageInput({
  conversationId,
  onSend,
  onAttachment,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const dragCounter = useRef(0);
  const emojiRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const t = useTranslations("screen.chat.MessageInput");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        emojiRef.current &&
        !emojiRef.current.contains(event.target as Node)
      ) {
        setEmojiOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Reset input whenever the active conversation changes
  useEffect(() => {
    setMessage("");
    setSelectedFiles([]);
    setAttachmentOpen(false);
    setEmojiOpen(false);
    setIsDragging(false);

    dragCounter.current = 0;

    if (textareaRef.current) {
      textareaRef.current.style.height = "24px";
    }
  }, [conversationId]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [conversationId]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage((previous) => previous + emojiData.emoji);
  };

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

  const addFiles = (files: FileList | File[]) => {
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

  const handleSend = () => {
    const value = message.trim();

    if (!value && selectedFiles.length === 0) return;

    selectedFiles.forEach((file) => {
      onAttachment?.(file);
    });

    if (value) {
      onSend(value);
    }

    setMessage("");
    setSelectedFiles([]);
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

  const canSend = !!message.trim() || selectedFiles.length > 0;

  return (
    <div
      className="relative m-3 shrink-0 rounded-md bg-background px-6 py-3"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
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
        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-1">
            {selectedFiles.map((file, index) => (
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
                  onClick={() => removeFile(index)}
                  aria-label={t("removeFile", { name: file.name })}
                  className="flex h-6 w-6 cursor-pointer shrink-0 items-center justify-center rounded-full bg-grey-200 text-grey-600 transition hover:bg-logout-red-light hover:text-destructive"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* <input
          type="text"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type your message..."
          className="w-full bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
        /> */}

        <textarea
          ref={textareaRef}
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);

            // Auto resize textarea
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
          className="
    w-full
    max-h-[120px]
    min-h-[24px]
    resize-none
    overflow-y-auto
    bg-transparent
    text-[14px]
    text-foreground
    outline-none
    placeholder:text-muted-foreground
  "
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
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files) {
                  addFiles(event.target.files);
                }

                event.target.value = "";
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

            <div className="relative" ref={emojiRef}>
              <button
                type="button"
                aria-label={t("insertEmoji")}
                aria-expanded={emojiOpen}
                onClick={() => setEmojiOpen((previous) => !previous)}
                className="cursor-pointer rounded-full p-1 text-grey-400 transition-colors hover:text-chart-4"
              >
                <EmojiIcon />
              </button>

              {emojiOpen && (
                <div
                  className="
                    fixed bottom-[90px] left-1/2 z-[100]
                    w-[calc(100vw-24px)] max-w-[270px]
                    -translate-x-1/2
                    sm:absolute sm:bottom-12 sm:left-0
                    sm:w-[350px] sm:translate-x-0
                  "
                >
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    width="100%"
                    height={300}
                    searchPlaceholder={t("searchEmoji")}
                    previewConfig={{
                      showPreview: false,
                    }}
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              aria-label={t("sticker")}
              disabled
              className="cursor-not-allowed rounded-full p-1 text-grey-400 transition-colors hover:text-grey-600"
            >
              <FileIcon />
            </button>
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
            {message.length === 0 && selectedFiles.length === 0 ? (
              <SendIcon color={null} />
            ) : (
              <SendIcon color="var(--chart-4)" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
