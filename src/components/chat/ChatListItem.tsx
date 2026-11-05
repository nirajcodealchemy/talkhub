"use client";

import { CheckCheck } from "lucide-react";
import { ChatListItemProps } from "@/src/types/chat";

export default function ChatListItem({
  onClick,
  selected,
  conversation,
}: ChatListItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[72px] w-full items-center gap-3 border-b border-border px-4 text-left transition-colors ${
        selected ? "bg-accent" : "bg-background hover:bg-accent"
      }`}
    >
      {/* Avatar */}
      <div className="relative h-[48px] w-[48px] shrink-0">
        <img
          src={conversation.avatar}
          alt={conversation.name}
          className="h-full w-full rounded-full object-cover"
        />

        {/* Online Status */}
        <span
          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${
            conversation.online ? "bg-online" : "bg-muted-foreground"
          }`}
        />
      </div>

      {/* Conversation Details */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="truncate text-[15px] font-semibold text-foreground">
            {conversation.name}
          </h3>

          <span className="shrink-0 text-[11px] text-muted-foreground">
            {conversation.last_message_time || "4:30 PM"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          {/* Last Message */}
          <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
            <CheckCheck size={14} className="shrink-0 text-chart-4" />

            <p className="truncate text-[13px] text-muted-foreground">
              {conversation.last_message || "Start a conversation"}
            </p>
          </div>

          {/* Unread Message Count */}
          {conversation.unread_count > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-chart-4 px-1.5 text-[11px] font-semibold text-white">
              {conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
