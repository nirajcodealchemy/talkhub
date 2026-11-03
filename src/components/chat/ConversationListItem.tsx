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
      className={`flex h-[68px] w-full items-center gap-3 border-b border-[#f0f0f0] px-4 text-left transition-colors ${
        isSelected ? "bg-[#f4f4f5]" : "bg-white hover:bg-[#fafafa]"
      }`}
    >
      {/* Avatar */}
      <div className="relative h-[44px] w-[44px] shrink-0">
        <img
          src={avatar}
          alt={name}
          className="h-full w-full rounded-full object-cover"
        />
      </div>

      {/* Conversation details */}
      <div className="min-w-0 flex-1">
        {/* Name and time */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-[14px] font-semibold text-[#171717]">
            {name}
          </h3>

          <span className="shrink-0 text-[11px] text-[#888]">
            {conversation.last_message_time}
          </span>
        </div>

        {/* Last message and unread count */}
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1">
            {conversation.last_message_sender === "You" &&
              conversation.last_message && (
                <CheckCheck
                  size={14}
                  className={`shrink-0 ${
                    conversation.last_message_read
                      ? "text-[#6246ea]"
                      : "text-[#9ca3af]"
                  }`}
                />
              )}

            {conversation.last_message_type === "image" && (
              <ImageIcon size={13} className="shrink-0 text-[#888]" />
            )}

            {conversation.last_message_type === "video" && (
              <Video size={13} className="shrink-0 text-[#888]" />
            )}

            {conversation.last_message_type === "file" && (
              <FileText size={13} className="shrink-0 text-[#888]" />
            )}

            <p
              className={`truncate text-[12px] ${
                unreadCount > 0 ? "font-medium text-[#333]" : "text-[#777]"
              }`}
            >
              {getPreview()}
            </p>
          </div>

          {/* Unread count */}
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#6246ea] px-1.5 text-[10px] font-semibold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
