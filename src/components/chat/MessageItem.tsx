"use client";

import { useEffect, useRef, useState } from "react";
import { MessageItemProps } from "@/src/types/chat";
import { useLocale, useTranslations } from "next-intl";
import { useDeleteMessage } from "@/src/hooks/useDelete";
import {
  X,
  Copy,
  Check,
  Trash2,
  Pencil,
  Loader2,
  Download,
  FileText,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
} from "lucide-react";

const MESSAGE_LINE_LIMIT = 10;

type ContextMenuPosition = {
  x: number;
  y: number;
};

export default function MessageItem({
  message,
  isMine,
  groupMessages,
  onEditRequest,
}: MessageItemProps) {
  const t = useTranslations("screen.chat.MessageItem");
  const locale = useLocale();

  const [isExpanded, setIsExpanded] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(
    null,
  );
  const [copySuccess, setCopySuccess] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const contextMenuRef = useRef<HTMLDivElement>(null);

  const { mutateAsync: deleteMessage, isPending: isDeleting } =
    useDeleteMessage();

  const time = new Date(message.created_at).toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const isRead = !!message.read_at || message.status === "read";

  const isDelivered =
    isRead || !!message.delivered_at || message.status === "delivered";

  const isImageGroup =
    message.message_type === "image" &&
    !!groupMessages &&
    groupMessages.length > 1;

  const images = isImageGroup ? groupMessages : [message];

  const visibleImages = images.slice(0, 4);
  const remainingCount = images.length - 4;

  const caption = images.find((image) => image.content?.trim())?.content ?? "";

  const messageLines = (message.content ?? "").split(/\r?\n/);

  const isLongMessage =
    message.message_type === "text" && messageLines.length > MESSAGE_LINE_LIMIT;

  const displayedMessage =
    isLongMessage && !isExpanded
      ? `${messageLines.slice(0, MESSAGE_LINE_LIMIT).join("\n")}\n...`
      : message.content;

  // Close context menu when clicking outside or pressing Escape.
  useEffect(() => {
    if (!contextMenu) return;

    const handleOutsideClick = (event: PointerEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target as Node)
      ) {
        setContextMenu(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };

    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [contextMenu]);

  // Navigate through every image in the group and close the gallery with Escape.
  useEffect(() => {
    if (activeImageIndex === null) return;

    const handleGalleryKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveImageIndex(null);
      } else if (event.key === "ArrowRight") {
        setActiveImageIndex((current) =>
          current === null ? 0 : (current + 1) % images.length,
        );
      } else if (event.key === "ArrowLeft") {
        setActiveImageIndex((current) =>
          current === null ? 0 : (current - 1 + images.length) % images.length,
        );
      }
    };

    document.addEventListener("keydown", handleGalleryKeyDown);
    return () => document.removeEventListener("keydown", handleGalleryKeyDown);
  }, [activeImageIndex, images.length]);

  // Open the custom menu only for text messages.
  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    if (
      message.message_type !== "text" &&
      message.message_type !== "image" &&
      message.message_type !== "file"
    ) {
      return;
    }

    event.preventDefault();

    const menuWidth = 160;
    const menuHeight = 55;

    setContextMenu({
      x: Math.max(
        8,
        Math.min(event.clientX, window.innerWidth - menuWidth - 8),
      ),
      y: Math.max(
        8,
        Math.min(event.clientY, window.innerHeight - menuHeight - 8),
      ),
    });
  };

  // Copy text message.
  // const handleCopy = async () => {
  //   try {
  //     await navigator.clipboard.writeText(message.content ?? "");
  //     setContextMenu(null);
  //   } catch (error) {
  //     console.error("Copy message failed:", error);
  //   }
  // };

  const handleCopy = async () => {
    const text = message.content ?? "";

    if (!text) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");

        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "0";
        textarea.setAttribute("readonly", "");

        document.body.appendChild(textarea);
        textarea.select();

        const copied = document.execCommand("copy");
        textarea.remove();

        if (!copied) {
          throw new Error("Unable to copy message.");
        }
      }

      setContextMenu(false);
      setCopySuccess(true);

      window.setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (error) {
      console.error("Copy message failed:", error);
    }
  };

  // Open delete confirmation.
  const handleOpenDeleteModal = () => {
    setContextMenu(null);
    setDeleteError("");
    setIsDeleteModalOpen(true);
  };

  // Delete message.
  const handleDelete = async (deleteForEveryoneValue: boolean) => {
    if (isDeleting) return;

    try {
      setDeleteError("");

      await deleteMessage({
        messageId: message.id,
        conversationId: message.conversation_id,
        deleteForEveryone: deleteForEveryoneValue,
      });

      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error("Message deletion failed:", error);

      setDeleteError(
        error instanceof Error
          ? error.message
          : "Unable to delete this message.",
      );
    }
  };

  const handleEdit = () => {
    if (!isMine || message.message_type !== "text") return;

    setContextMenu(null);
    setContextMenu(null);
    onEditRequest?.(message);
  };

  // Download image.
  const handleDownload = async (imageUrl: string, fileName?: string | null) => {
    try {
      const response = await fetch(imageUrl);

      if (!response.ok) {
        throw new Error("Image download failed");
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName || "image";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      console.error("Image download failed:", error);
    }
  };

  // Format file size.
  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return "";

    if (bytes < 1024) return `${bytes} B`;

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const fileExtension =
    message.attachment_name?.split(".").pop()?.toUpperCase() || "FILE";

  const fileDate = new Date(message.created_at).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <>
      <div
        className={`group flex w-full min-w-0 ${
          isMine ? "justify-end" : "justify-start"
        }`}
        // onContextMenu={handleContextMenu}
      >
        {copySuccess && (
          <div className="fixed bottom-6 left-1/2 z-[150] -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-lg">
              Text copied!
            </div>
          </div>
        )}
        <div className="relative w-fit min-w-[120px] max-w-[75%]">
          {/* Hover action buttons */}
          {(message.message_type === "text" ||
            message.message_type === "image" ||
            message.message_type === "file") && (
            <div
              ref={contextMenuRef}
              className={`absolute top-1/2 z-30 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 ${
                isMine ? "-left-[76px]" : "-right-[76px]"
              }`}
            >
              {/* More button */}
              <button
                type="button"
                onClick={() => setContextMenu((prev) => !prev)}
                aria-label="More message options"
                title="More options"
                // aria-expanded={contextMenu}
                aria-expanded={Boolean(contextMenu)}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground"
              >
                <MoreVertical size={17} />
              </button>

              {/* Copy button */}
              {message.message_type === "text" && message.content && (
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  aria-label="Copy message"
                  title="Copy message"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground"
                >
                  <Copy size={15} />
                </button>
              )}

              {/* Edit and Delete menu */}
              {contextMenu && (
                <div className="absolute -right-10 -top-25 z-[100] w-36 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-xl">
                  {isMine && message.message_type === "text" && (
                    <button
                      type="button"
                      onClick={handleEdit}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent"
                    >
                      <Pencil size={16} />
                      Edit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleOpenDeleteModal}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}

          <div
            className={`relative rounded-[18px] shadow-sm ${
              isMine
                ? "bg-chart-4 text-primary-foreground"
                : "bg-conversation-item-bg text-foreground"
            } ${
              message.message_type === "image"
                ? "px-1 pt-1 pb-2"
                : "px-4 py-2.5"
            }`}
          >
            {/* Grouped images */}
            {isImageGroup && (
              <>
                <div
                  className={`grid max-w-[340px] gap-1 overflow-hidden rounded-xl ${
                    images.length === 2
                      ? "grid-cols-2 aspect-[4/3]"
                      : images.length === 3
                        ? "grid-cols-2 grid-rows-2 aspect-[4/3]"
                        : "grid-cols-2 grid-rows-2 aspect-square"
                  }`}
                >
                  {visibleImages.map((image, index) => {
                    const isThreeImageLayout = images.length === 3;

                    return (
                      <div
                        key={image.id}
                        aria-label={`View image ${index + 1} of ${images.length}`}
                        onClick={() => setActiveImageIndex(index)}
                        className={`group/image relative min-h-0 min-w-0 cursor-zoom-in overflow-hidden bg-background ${
                          isThreeImageLayout && index === 0 ? "row-span-2" : ""
                        }`}
                      >
                        {image.attachment_url ? (
                          <>
                            <img
                              src={image.attachment_url}
                              alt={
                                image.attachment_name || t("sharedAttachment")
                              }
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />

                            {!isMine && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();

                                  if (image.attachment_url) {
                                    void handleDownload(
                                      image.attachment_url,
                                      image.attachment_name,
                                    );
                                  }
                                }}
                                aria-label="Download image"
                                title="Download image"
                                className="absolute left-1/2 top-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full bg-black/30 px-3 py-2 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/50"
                              >
                                <span className="text-xs font-semibold">
                                  {formatFileSize(image.attachment_size) ||
                                    "Image"}
                                </span>
                                <Download size={17} />
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <span className="text-xs text-muted-foreground">
                              Loading image...
                            </span>
                          </div>
                        )}

                        {index === 3 && remainingCount > 0 && (
                          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/55">
                            <span className="text-2xl font-semibold text-white">
                              +{remainingCount}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {caption && (
                  <div className="px-3 pt-2">
                    <p className="whitespace-pre-wrap break-words text-[14.5px] leading-[1.4]">
                      {caption}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Single image */}
            {!isImageGroup &&
              message.message_type === "image" &&
              message.attachment_url && (
                <>
                  <div className="relative mb-2 overflow-hidden rounded-xl bg-background">
                    <img
                      src={message.attachment_url}
                      alt={message.attachment_name || t("sharedAttachment")}
                      loading="lazy"
                      className="max-h-[320px] w-full rounded-lg object-contain"
                    />

                    {!isMine && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();

                          if (message.attachment_url) {
                            void handleDownload(
                              message.attachment_url,
                              message.attachment_name,
                            );
                          }
                        }}
                        aria-label="Download image"
                        title="Download image"
                        className="absolute left-1/2 top-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full bg-black/35 px-4 py-2.5 text-white backdrop-blur-sm transition hover:bg-black/50"
                      >
                        <span className="text-sm font-semibold">
                          {formatFileSize(message.attachment_size) || "Image"}
                        </span>
                        <Download size={19} />
                      </button>
                    )}
                  </div>

                  {message.content && (
                    <div className="px-3 pt-2">
                      <p className="whitespace-pre-wrap break-words text-[14.5px] leading-[1.4]">
                        {message.content}
                      </p>
                    </div>
                  )}
                </>
              )}

            {/* File attachment */}
            {message.message_type === "file" && message.attachment_url && (
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
                  <FileText
                    size={25}
                    className="text-red-500"
                    strokeWidth={2}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">
                    {message.attachment_name || message.content}
                  </p>

                  <p
                    className={`mt-1 text-[10px] ${
                      isMine
                        ? "text-primary-foreground/75"
                        : "text-muted-foreground"
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
            )}

            {/* Text message */}
            {message.message_type === "text" && (
              <div className="min-w-0">
                <>
                  {message.content && (
                    <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[14.5px] leading-[1.4]">
                      {displayedMessage}
                    </p>
                  )}

                  {message.edited_at && (
                    <span className="ml-1 text-[10px] opacity-70">
                      (edited)
                    </span>
                  )}

                  {isLongMessage && (
                    <button
                      type="button"
                      onClick={() => setIsExpanded((prev) => !prev)}
                      className={`mt-1 cursor-pointer text-[13px] font-semibold hover:underline ${
                        isMine ? "text-primary-foreground" : "text-chart-4"
                      }`}
                    >
                      {isExpanded ? t("readLess") : t("readMore")}
                    </button>
                  )}
                </>
                {/* )} */}
              </div>
            )}

            {/* Time and delivery status */}
            <div
              className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${
                isMine ? "text-primary-foreground/80" : "text-muted-foreground"
              }`}
            >
              <span className={message.message_type === "image" ? "mr-2" : ""}>
                {time}
              </span>

              {isMine &&
                (isRead ? (
                  <CheckCheck
                    size={15}
                    className="text-conversation-item-reads"
                    strokeWidth={2.5}
                  />
                ) : isDelivered ? (
                  <CheckCheck
                    size={15}
                    className="text-primary-foreground/60"
                    strokeWidth={2.5}
                  />
                ) : (
                  <Check
                    size={15}
                    className="text-primary-foreground/60"
                    strokeWidth={2.5}
                  />
                ))}
            </div>
          </div>

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="mt-1 flex items-center gap-1">
              {message.reactions.map((reaction, index) => (
                <span
                  key={`${message.id}-${index}`}
                  className="rounded-full border border-border bg-background px-2 py-0.5 text-xs shadow-sm"
                >
                  {reaction}
                </span>
              ))}
            </div>
          )}

          {/* Replies */}
          {message.reply_count ? (
            <div className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
              <span className="text-[13px]">↳</span>
              <span>{t("replies", { count: message.reply_count })}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Full-screen gallery for every image in this message group */}
      {activeImageIndex !== null && (
        <div
          className="fixed inset-0 z-[120] flex flex-col bg-black/95 p-3 text-white sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-label="Image gallery"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setActiveImageIndex(null);
            }
          }}
        >
          <div className="flex shrink-0 items-center justify-between gap-3">
            <span className="text-sm font-medium">
              {activeImageIndex + 1} / {images.length}
            </span>
            <div className="flex items-center gap-2">
              {images[activeImageIndex]?.attachment_url && (
                <button
                  type="button"
                  onClick={() => {
                    const selectedImage = images[activeImageIndex];
                    if (selectedImage?.attachment_url) {
                      void handleDownload(
                        selectedImage.attachment_url,
                        selectedImage.attachment_name,
                      );
                    }
                  }}
                  className="flex h-10 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-medium transition hover:bg-white/25"
                  aria-label="Download current image"
                >
                  <Download size={18} />
                  <span>Download</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveImageIndex(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
                aria-label="Close gallery"
              >
                <X size={21} />
              </button>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center gap-2 py-4">
            {images.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setActiveImageIndex(
                    (activeImageIndex - 1 + images.length) % images.length,
                  )
                }
                className="absolute left-0 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25 sm:left-2 sm:h-12 sm:w-12"
                aria-label="Previous image"
              >
                <ChevronLeft size={26} />
              </button>
            )}

            {images[activeImageIndex]?.attachment_url ? (
              <img
                key={images[activeImageIndex].id}
                src={images[activeImageIndex].attachment_url!}
                alt={
                  images[activeImageIndex].attachment_name ||
                  `Image ${activeImageIndex + 1}`
                }
                className="max-h-full max-w-full select-none object-contain"
              />
            ) : (
              <p className="text-sm text-white/70">Image is unavailable.</p>
            )}

            {images.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setActiveImageIndex((activeImageIndex + 1) % images.length)
                }
                className="absolute right-0 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25 sm:right-2 sm:h-12 sm:w-12"
                aria-label="Next image"
              >
                <ChevronRight size={26} />
              </button>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex shrink-0 justify-center gap-2 overflow-x-auto pb-1">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setActiveImageIndex(index)}
                  aria-label={`Show image ${index + 1}`}
                  aria-current={activeImageIndex === index}
                  className={`h-12 w-12 shrink-0 overflow-hidden rounded-md border-2 transition sm:h-14 sm:w-14 ${
                    activeImageIndex === index
                      ? "border-white opacity-100"
                      : "border-transparent opacity-55 hover:opacity-100"
                  }`}
                >
                  {image.attachment_url && (
                    <img
                      src={image.attachment_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation modal */}
      {isDeleteModalOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isDeleting)
              setIsDeleteModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-message-title"
            className="w-full max-w-[380px] overflow-hidden rounded-2xl border border-border bg-background shadow-xl"
          >
            {/* Header with icon */}
            <div className="flex flex-col items-center px-6 pt-7 pb-2 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <h2
                id="delete-message-title"
                className="text-lg font-semibold tracking-tight"
              >
                Delete this message?
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                This action can’t be undone.
              </p>
            </div>

            <div className="space-y-2 px-5 pb-5 pt-4">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void handleDelete(false)}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background py-3 text-sm font-medium transition hover:bg-accent disabled:opacity-50"
              >
                Delete for me
              </button>

              <button
                type="button"
                disabled={isDeleting || !isMine}
                onClick={() => void handleDelete(true)}
                className="flex w-full cursor-pointer items-center text-white justify-center gap-2 rounded-xl bg-destructive py-3 text-sm font-semibold text-destructive-foreground transition hover:bg-destructive/80 disabled:opacity-50"
              >
                Delete for everyone
              </button>

              {!isMine && (
                <p className="pt-1 text-center text-xs text-muted-foreground">
                  You can only delete someone else’s message for yourself.
                </p>
              )}

              {deleteError && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
                  {deleteError}
                </p>
              )}

              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsDeleteModalOpen(false)}
                className="w-full cursor-pointer rounded-xl py-2.5 border border-border text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                Cancel
              </button>

              {isDeleting && (
                <div className="flex items-center justify-center gap-2 pt-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting…
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
