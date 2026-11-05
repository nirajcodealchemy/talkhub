"use client";
import { UserListItemProps } from "@/src/types/chat";
import { useLocale, useTranslations } from "next-intl";
import {
  Check,
  CheckCheck,
  Loader2,
  Image as ImageIcon,
  FileText,
} from "lucide-react";

export default function UserListItem({
  user,
  onClick,
  lastMessage,
  isCurrentUser,
  lastMessageAt,
  currentUserId,
  unreadCount = 0,
  lastMessageType,
  isOpening = false,
  lastMessageReadAt,
  lastMessageSenderId,
  lastMessageDeliveredAt,
}: UserListItemProps) {
  const t = useTranslations("screen.chat.UserListItem");
  const locale = useLocale();

  const name = user.full_name || user.username || t("defaultUser");

  const avatar =
    user.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8b34d7&color=fff`;

  const isOwnMessage = !!currentUserId && lastMessageSenderId === currentUserId;

  const formatTime = (date?: string | null) => {
    if (!date) return "";

    const messageDate = new Date(date);

    if (Number.isNaN(messageDate.getTime())) return "";

    return messageDate.toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const renderMessageStatus = () => {
    if (!isOwnMessage) return null;

    if (lastMessageReadAt) {
      return (
        <CheckCheck
          size={15}
          className="shrink-0 text-conversation-item-reads"
        />
      );
    }

    if (lastMessageDeliveredAt) {
      return <CheckCheck size={15} className="shrink-0 text-grey-400" />;
    }

    return <Check size={15} className="shrink-0 text-grey-400" />;
  };

  const renderLastMessage = () => {
    if (!lastMessage) return user.username ? `@${user.username}` : "";

    // Image message
    if (lastMessageType === "image" || lastMessage.startsWith("[Image]")) {
      return (
        <span className="flex items-center gap-1">
          <ImageIcon size={13} className="shrink-0" />
          <span>{t("image")}</span>
        </span>
      );
    }

    // File message
    if (lastMessageType === "file") {
      return (
        <span className="flex items-center gap-1">
          <FileText size={13} className="shrink-0" />
          <span>{t("document")}</span>
        </span>
      );
    }

    // Normal text message
    return lastMessage;
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isCurrentUser || isOpening}
      className="flex h-[68px] w-full cursor-pointer items-center gap-3 bg-background px-4 text-left transition-colors hover:bg-muted disabled:cursor-default disabled:hover:bg-background"
    >
      <div className="relative h-[48px] w-[48px] shrink-0">
        <img
          src={avatar}
          alt={name}
          className="h-full w-full rounded-full object-cover"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-[15px] font-semibold text-foreground">
            {name}
          </h3>
          {lastMessageAt && (
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {formatTime(lastMessageAt)}
            </span>
          )}
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1 text-muted-foreground">
            {renderMessageStatus()}

            <p className="truncate text-[12px]">{renderLastMessage()}</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-chart-4 px-1.5 text-[11px] font-semibold text-primary-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}

            {isOpening && (
              <Loader2 size={15} className="animate-spin text-chart-4" />
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
