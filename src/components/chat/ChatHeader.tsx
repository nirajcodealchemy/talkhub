"use client";

import { ChatConversation } from "@/src/types/chat";
import { Video, Phone, Sparkles, Info } from "lucide-react";

type Props = {
  conversation: ChatConversation;
};

export default function ChatHeader({ conversation }: Props) {
  return (
    <header className="z-10 flex h-[76px] shrink-0 items-center justify-between border-b border-[#ededed] bg-white px-5">
      <div className="flex min-w-0 items-center gap-3">
        <img
          src={conversation.avatar}
          alt={conversation.name}
          className="h-12 w-12 shrink-0 rounded-full object-cover"
        />

        <div className="min-w-0">
          <h2 className="truncate text-[17px] font-semibold text-[#171717]">
            {conversation.name}
          </h2>
          <p className="text-[12px] text-[#777]">
            {conversation.online ? "Online" : "Offline"}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <button
          aria-label="Video call"
          className="text-[#222] hover:text-violet-600"
        >
          <Video size={23} />
        </button>

        <button
          aria-label="Voice call"
          className="text-[#222] hover:text-violet-600"
        >
          <Phone size={22} />
        </button>

        <button
          aria-label="Chat tools"
          className="text-[#222] hover:text-violet-600"
        >
          <Sparkles size={22} />
        </button>

        <button
          aria-label="Conversation information"
          className="text-[#222] hover:text-violet-600"
        >
          <Info size={23} />
        </button>
      </div>
    </header>
  );
}
