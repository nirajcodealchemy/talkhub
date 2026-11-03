"use client";

import { ChatConversation } from "@/src/types/chat";
import { CheckCheck } from "lucide-react";

type Props = {
  conversation: ChatConversation;
  selected: boolean;
  onClick: () => void;
};

export default function ChatListItem({
  conversation,
  selected,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[72px] w-full items-center gap-3 border-b border-[#f0f0f0] px-4 text-left transition-colors ${
        selected ? "bg-[#ececed]" : "bg-white hover:bg-[#f6f6f7]"
      }`}
    >
      <div className="relative h-[48px] w-[48px] shrink-0">
        <img
          src={conversation.avatar}
          alt={conversation.name}
          className="h-full w-full rounded-full object-cover"
        />

        <span
          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
            conversation.online ? "bg-[#22c55e]" : "bg-[#22c55e]"
          }`}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="truncate text-[15px] font-semibold text-[#171717]">
            {conversation.name}
          </h3>

          <span className="shrink-0 text-[11px] text-[#8e8e8e]">
            {conversation.last_message_time || "4:30 PM"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 text-[#6b6b6b]">
            <CheckCheck size={14} className="shrink-0 text-[#7060df]" />
            <p className="truncate text-[13px] text-[#666]">
              {conversation.last_message || "Start a conversation"}
            </p>
          </div>

          {conversation.unread_count > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#6545db] px-1.5 text-[11px] font-semibold text-white">
              {conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
