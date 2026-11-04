"use client";

import { CheckCheck, FileText, Image as ImageIcon, Video } from "lucide-react";
import type { ChatConversation } from "@/src/types/chat";

type Props = {
  conversation: ChatConversation;
  isSelected: boolean;
  onClick: () => void;
};

export default function ConversationListItem({
  conversation,
  isSelected,
  onClick,
}: Props) {
  const name = conversation.name || "User";

  const avatar =
    conversation.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6545db&color=fff`;

  const getPreview = () => {
    if (!conversation.last_message) {
      return "Start a conversation";
    }

    switch (conversation.last_message_type) {
      case "image":
        return "Photo";
      case "video":
        return "Video";
      case "file":
        return conversation.last_message || "Document";
      default:
        return conversation.last_message;
    }
  };

  const unreadCount = conversation.unread_count || 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[68px] w-full items-center gap-3 border-b border-conversation-item-border px-4 text-left transition-colors ${
        isSelected
          ? "bg-muted"
          : "bg-background hover:bg-conversation-item-hover"
      }`}
    >
      <div className="relative h-[44px] w-[44px] shrink-0">
        <img
          src={avatar}
          alt={name}
          className="h-full w-full rounded-full object-cover"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-[14px] font-semibold text-foreground">
            {name}
          </h3>

          <span className="shrink-0 text-[11px] text-conversation-item-time">
            {conversation.last_message_time}
          </span>
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1">
            {conversation.last_message_sender === "You" &&
              conversation.last_message && (
                <CheckCheck
                  size={14}
                  className={`shrink-0 ${
                    conversation.last_message_read
                      ? "text-conversation-item-read"
                      : "text-conversation-item-unread-tick"
                  }`}
                />
              )}

            {conversation.last_message_type === "image" && (
              <ImageIcon
                size={13}
                className="shrink-0 text-conversation-item-time"
              />
            )}

            {conversation.last_message_type === "video" && (
              <Video
                size={13}
                className="shrink-0 text-conversation-item-time"
              />
            )}

            {conversation.last_message_type === "file" && (
              <FileText
                size={13}
                className="shrink-0 text-conversation-item-time"
              />
            )}

            <p
              className={`truncate text-[12px] ${
                unreadCount > 0
                  ? "font-medium text-conversation-item-unread-text"
                  : "text-conversation-item-preview"
              }`}
            >
              {getPreview()}
            </p>
          </div>

          {unreadCount > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-conversation-item-read px-1.5 text-[10px] font-semibold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
