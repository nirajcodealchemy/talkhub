"use client";

import { Check, CheckCheck, Loader2 } from "lucide-react";
import type { ChatUser } from "@/src/hooks/useUsers";

type Props = {
  user: ChatUser;
  isCurrentUser: boolean;
  isOpening?: boolean;
  unreadCount?: number;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  lastMessageSenderId?: string | null;
  lastMessageDeliveredAt?: string | null;
  lastMessageReadAt?: string | null;
  currentUserId?: string;
  onClick: () => void;
};

export default function UserListItem({
  user,
  isCurrentUser,
  isOpening = false,
  unreadCount = 0,
  lastMessage,
  lastMessageAt,
  lastMessageSenderId,
  lastMessageDeliveredAt,
  lastMessageReadAt,
  currentUserId,
  onClick,
}: Props) {
  const name = user.full_name || user.username || "User";

  const avatar =
    user.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6545db&color=fff`;

  const isOwnMessage = !!currentUserId && lastMessageSenderId === currentUserId;

  const formatTime = (date?: string | null) => {
    if (!date) return "";

    const messageDate = new Date(date);

    if (Number.isNaN(messageDate.getTime())) return "";

    return messageDate.toLocaleTimeString("en-US", {
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

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isCurrentUser || isOpening}
      className="flex h-[68px] w-full cursor-pointer items-center gap-3 bg-background px-4 text-left transition-colors hover:bg-muted disabled:cursor-default disabled:hover:bg-background"
    >
      <div className="relative h-[48px] w-[48px] shrink-0 ">
        <img
          src={avatar}
          alt={name}
          className="h-full w-full rounded-full object-cover "
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-[15px] font-semibold text-foreground">
            {name}
          </h3>

          <div className="flex shrink-0 items-center gap-2">
            {lastMessageAt && (
              <span className="text-[11px] text-muted-foreground">
                {formatTime(lastMessageAt)}
              </span>
            )}
          </div>
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1">
            {renderMessageStatus()}

            <p className="truncate text-[12px] text-muted-foreground">
              {lastMessage || (user.username ? `@${user.username}` : "")}
            </p>
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
