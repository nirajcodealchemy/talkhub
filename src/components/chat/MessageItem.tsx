"use client";

import JSZip from "jszip";
import { useState } from "react";
import { MessageItemProps } from "@/src/types";
import { useDeleteMessage } from "@/src/hooks";
import { Ban, Check, CheckCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  MessageContextMenu,
  MessageImageGallery,
  MessageAttachment,
  MessageTextContent,
  DeleteMessageModal,
} from "./message";
import {
  useMyTopReactions,
  useMessageReactions,
  useSaveMessageReaction,
} from "@/src/hooks/useMessageReaction";

export default function MessageItem({
  message,
  isMine,
  isGroup,
  groupMessages,
  onEditRequest,
  onReply,
  onForward,
}: MessageItemProps) {
  const locale = useLocale();
  const [deleteError, setDeleteError] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showAllGroupReactions, setShowAllGroupReactions] = useState(false);

  const { mutateAsync: deleteMessage, isPending: isDeleting } =
    useDeleteMessage();
  const { mutate: saveReaction } = useSaveMessageReaction();

  const { data: quickReactions = ["👍", "❤️", "😂", "😮", "🙏", "🔥"] } =
    useMyTopReactions();
  const { data: reactionData } = useMessageReactions(message.id);
  const reactionCounts = reactionData?.counts ?? {};
  const myReactions = reactionData?.myEmojis ?? [];

  const time = new Date(message.created_at).toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const repliedMessage = message.reply_to_message;
  const t = useTranslations("screen.chat.MessageItem");
  const isRead = !!message.read_at || message.status === "read";

  const isDelivered =
    isRead || !!message.delivered_at || message.status === "delivered";

  const isImageGroup =
    message.message_type === "image" &&
    !!groupMessages &&
    groupMessages.length > 1;

  const isDeleted = message.is_deleted_for_everyone || message.deleted_for_me;

  const handleReaction = (emoji: string) => {
    saveReaction({
      messageId: message.id,
      emoji,
    });
  };

  const handleEdit = () => {
    if (!isMine || message.message_type !== "text") return;

    onEditRequest?.(message);
  };

  const handleOpenDeleteModal = () => {
    setDeleteError("");
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async (deleteForEveryone: boolean) => {
    if (isDeleting) return;

    try {
      setDeleteError("");

      await deleteMessage({
        messageId: message.id,
        conversationId: message.conversation_id,
        deleteForEveryone,
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

  const handleDownloadImageGroupAsZip = async () => {
    if (!isImageGroup || !groupMessages) return;

    const downloadableImages = groupMessages.filter(
      (image) => !!image.attachment_url,
    );

    if (downloadableImages.length === 0) return;

    try {
      const zip = new JSZip();

      await Promise.all(
        downloadableImages.map(async (image, index) => {
          const response = await fetch(image.attachment_url!);

          if (!response.ok) {
            throw new Error(`Failed to download image ${index + 1}`);
          }

          const blob = await response.blob();

          const originalName =
            image.attachment_name?.trim() || `image-${index + 1}`;

          const safeName = originalName.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");

          zip.file(safeName, blob);
        }),
      );

      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
          level: 6,
        },
      });

      const blobUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");

      link.href = blobUrl;
      link.download = `talkhub-images-${message.id}.zip`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      console.error("Image ZIP download failed:", error);
    }
  };

  if (message.is_system) {
    return (
      <div className="flex w-full justify-center py-2">
        <div className="max-w-[85%] rounded-md px-4 py-2 text-center bg-white text-xs text-muted-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex w-full min-w-0 ${
        isMine ? "justify-end" : "justify-start"
      }`}
    >
      <div className="relative w-fit min-w-30 max-w-[75%]">
        {/* Message context menu */}
        {/* {message.message_type !== "sticker" && ( */}
        <MessageContextMenu
          isMine={isMine}
          message={message}
          onEdit={handleEdit}
          onReact={handleReaction}
          isImageGroup={isImageGroup}
          quickReactions={quickReactions}
          onReply={() => onReply(message)}
          onDelete={handleOpenDeleteModal}
          onForward={() => onForward(message)}
          onDownloadGroup={handleDownloadImageGroupAsZip}
        />
        {/* )} */}

        {/* Message bubble */}
        {isGroup && !isMine && (
          <p className="mb-1 px-2 text-xs font-semibold text-chart-4">
            {message.sender_profile?.full_name ||
              message.sender_profile?.username ||
              "Unknown member"}
          </p>
        )}
        <div
          className={`relative rounded-[18px] shadow-sm ${
            isMine
              ? "bg-chart-4 text-primary-foreground"
              : "bg-conversation-item-bg text-foreground"
          } ${
            message.message_type === "image" ? "px-1 pb-2 pt-1" : "px-4 py-2.5"
          }`}
        >
          {/* Group sender name */}

          {isDeleted ? (
            <div
              className={`flex items-center gap-2 px-3 py-2 text-sm italic ${
                isMine ? "text-white" : "text-black"
              }`}
            >
              <Ban size={15} />

              <span>
                {message.is_deleted_for_everyone
                  ? t("thisMessageWasDeleted")
                  : t("youDeletedThisMessage")}
              </span>
            </div>
          ) : (
            <>
              {message.reply_to_message && (
                <button
                  type="button"
                  onClick={() => {
                    document
                      .getElementById(`message-${message.reply_to_message!.id}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  className={`mb-2 flex w-full items-center gap-2 overflow-hidden rounded-md border-l-4 px-3 py-2 text-left ${
                    isMine
                      ? "border-white/70 bg-chart-0"
                      : "border-chart-4 bg-background/70"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-xs font-semibold ${
                        isMine ? "text-white" : "text-chart-4"
                      }`}
                    >
                      {message.reply_to_message.sender_profile?.full_name ||
                        message.reply_to_message.sender_profile?.username ||
                        "Unknown user"}
                    </p>

                    <p
                      className={`truncate text-xs ${
                        isMine ? "text-white/80" : "text-muted-foreground"
                      }`}
                    >
                      {message.reply_to_message.message_type === "image"
                        ? "Photo"
                        : message.reply_to_message.message_type === "sticker"
                          ? "Sticker"
                          : message.reply_to_message.content || "Attachment"}
                    </p>
                  </div>

                  {/* Replied image preview */}
                  {message.reply_to_message.message_type === "image" && (
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded">
                      {repliedMessage?.message_type === "image" &&
                        repliedMessage.attachment_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={repliedMessage.attachment_url}
                            alt="Replied image"
                            className="h-12 w-12 shrink-0 rounded object-cover"
                          />
                        )}
                    </div>
                  )}

                  {/* Replied sticker preview */}
                  {message.reply_to_message.message_type === "sticker" && (
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded">
                      {repliedMessage?.message_type === "sticker" &&
                        (repliedMessage.sticker_url ||
                          repliedMessage.content) && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={
                              repliedMessage.sticker_url ||
                              repliedMessage.content
                            }
                            alt="Replied sticker"
                            className="h-12 w-12 shrink-0 rounded object-contain"
                          />
                        )}
                    </div>
                  )}
                </button>
              )}
              {message.forwarded_from_id && (
                <p className="mb-1 text-xs italic opacity-70">Forwarded</p>
              )}
              {/* Image message */}
              {message.message_type === "image" && (
                <MessageImageGallery
                  isMine={isMine}
                  message={message}
                  groupMessages={groupMessages}
                />
              )}
              {message.message_type === "sticker" &&
                (message.sticker_url || message.content) && (
                  <div className="max-w-[220px]">
                    <img
                      src={message.sticker_url || message.content}
                      alt="Sticker"
                      className="block h-auto max-h-[220px] w-auto max-w-full object-contain"
                      loading="lazy"
                    />
                  </div>
                )}
              {message.message_type === "sticker" &&
                message.content &&
                message.content !==
                  (message.sticker_url || message.content) && (
                  <MessageTextContent message={message} isMine={isMine} />
                )}

              {/* File attachment */}
              <MessageAttachment message={message} isMine={isMine} />

              {/* Text message */}
              {message.message_type === "text" && (
                <MessageTextContent message={message} isMine={isMine} />
              )}
            </>
          )}

          {/* Timestamp and delivery/read status */}
          <div
            className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${
              isMine ? "text-primary-foreground/80" : "text-muted-foreground"
            }`}
          >
            {message.edited_at && !isDeleted && (
              <span className="ml-1 text-[10px] opacity-70">
                ({t("edited")})
              </span>
            )}

            <span className={message.message_type === "image" ? "mr-2" : ""}>
              {time}
            </span>

            {!isDeleted &&
              isMine &&
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
        {Object.keys(reactionCounts).length > 0 && (
          <div className="mt-1 flex items-center gap-1">
            {Object.entries(reactionCounts)
              .slice(0, isGroup && !showAllGroupReactions ? 3 : undefined)
              .map(([emoji, count]) => (
                <button
                  key={`${message.id}-${emoji}`}
                  type="button"
                  aria-label={`${count} reactions with ${emoji}`}
                  aria-pressed={myReactions.includes(emoji)}
                  onClick={() => handleReaction(emoji)}
                  className={`flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-xs shadow-sm transition hover:bg-accent ${
                    myReactions.includes(emoji)
                      ? "border-chart-4 bg-chart-4/10 text-chart-4"
                      : "border-border bg-background"
                  }`}
                >
                  <span>{emoji}</span>
                  {count > 1 && <span>{count}</span>}
                </button>
              ))}
            {isGroup &&
              !showAllGroupReactions &&
              Object.keys(reactionCounts).length > 3 && (
                <button
                  type="button"
                  aria-label={`Show ${Object.keys(reactionCounts).length - 3} more reactions`}
                  onClick={() => setShowAllGroupReactions(true)}
                  className="flex cursor-pointer items-center rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground shadow-sm transition hover:bg-accent"
                >
                  +{Object.keys(reactionCounts).length - 3}
                </button>
              )}
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

      {/* Delete confirmation modal */}
      <DeleteMessageModal
        isMine={isMine}
        isDeleting={isDeleting}
        onDelete={handleDelete}
        deleteError={deleteError}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}
