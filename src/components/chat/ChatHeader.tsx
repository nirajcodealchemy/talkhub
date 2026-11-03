"use client";

import { ChatConversation } from "@/src/types/chat";
import { Video, Phone, Sparkles, Info } from "lucide-react";

type Props = {
  conversation: ChatConversation;
};

export default function ChatHeader({ conversation }: Props) {
  return (
    <header className="z-10 flex h-[64px] shrink-0 items-center justify-between border-b border-[#ededed] bg-white px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative h-10 w-10 shrink-0">
          <img
            src={conversation.avatar}
            alt={conversation.name}
            className="h-full w-full rounded-full object-cover"
          />
        </div>

        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold text-[#171717]">
            {conversation.name}
          </h2>
          <p className="text-[12px] text-[#777]">
            {conversation.online ? "Online" : "Online"}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4 text-[#333]">
        <button
          aria-label="Video call"
          className="rounded-full p-1 text-[#222] transition-colors hover:bg-gray-100 hover:text-black"
        >
          <Video size={20} />
        </button>

        <button
          aria-label="Voice call"
          className="rounded-full p-1 text-[#222] transition-colors hover:bg-gray-100 hover:text-black"
        >
          <Phone size={19} />
        </button>

        <button
          aria-label="Chat tools"
          className="rounded-full p-1 text-[#222] transition-colors hover:bg-gray-100 hover:text-black"
        >
          <Sparkles size={19} />
        </button>

        <button
          aria-label="Conversation information"
          className="rounded-full p-1 text-[#222] transition-colors hover:bg-gray-100 hover:text-black"
        >
          <Info size={20} />
        </button>
      </div>
    </header>
  );
}
