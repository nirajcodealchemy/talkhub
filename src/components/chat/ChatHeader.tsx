"use client";

import { useState } from "react";
import { ArrowLeft, MoreVertical, X } from "lucide-react";
import type { ChatConversation } from "@/src/types/chat";
import VideoIcon from "../icons/VideoIcon";
import PhoneIcon from "../icons/PhoneIcon";
import SparklesIcon from "../icons/SparklesIcon";
import InfoIcon from "../icons/InfoIcon";
import ConversationInfoModal from "../modal/ConversationInfoModal";

type Props = {
  conversation: ChatConversation;
  onBack?: () => void;
};

export default function ChatHeader({ conversation, onBack }: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  return (
    <header className="relative z-20 flex h-[64px] shrink-0 items-center justify-between border-b border-border bg-background px-3 sm:px-5">
      {/* User details */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {/* Mobile back button */}
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to chats"
          className="shrink-0 rounded-full p-1.5 text-foreground transition-colors hover:bg-accent sm:hidden"
        >
          <ArrowLeft size={22} />
        </button>

        {/* User avatar */}
        <div className="relative h-10 w-10 shrink-0">
          <img
            src={conversation.avatar}
            alt={conversation.name}
            className="h-full w-full rounded-full object-cover"
          />
        </div>

        {/* User details */}
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold text-foreground">
            {conversation.name}
          </h2>

          <p className="text-[12px] text-muted-foreground">
            {conversation.online ? "Online" : "Offline"}
          </p>
        </div>
      </div>

      {/* Desktop actions */}
      <div className="hidden shrink-0 items-center gap-4 text-foreground sm:flex">
        <button
          type="button"
          aria-label="Video call"
          disabled
          className="cursor-not-allowed rounded-full p-1 text-muted-foreground"
        >
          <VideoIcon />
        </button>

        <button
          type="button"
          aria-label="Voice call"
          disabled
          className="cursor-not-allowed rounded-full p-1 text-muted-foreground"
        >
          <PhoneIcon />
        </button>

        <button
          type="button"
          aria-label="Chat tools"
          disabled
          className="cursor-not-allowed rounded-full p-1 text-muted-foreground"
        >
          <SparklesIcon />
        </button>

        <button
          type="button"
          onClick={() => setIsInfoOpen(true)}
          aria-label="Conversation information"
          className="rounded-full cursor-pointer p-1 text-foreground transition-colors hover:bg-accent"
        >
          <InfoIcon />
        </button>
      </div>

      {/* Mobile menu */}
      <div className="relative sm:hidden">
        <button
          type="button"
          aria-label="Chat options"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((previous) => !previous)}
          className="rounded-full p-2 text-foreground transition-colors hover:bg-accent"
        >
          {isMenuOpen ? <X size={21} /> : <MoreVertical size={21} />}
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 top-11 z-50 w-48 rounded-xl border border-border bg-popover py-1.5 text-popover-foreground shadow-lg">
            <button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed items-center gap-3 px-4 py-3 text-sm text-muted-foreground"
            >
              <VideoIcon />
              Video Call
            </button>

            <button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed items-center gap-3 px-4 py-3 text-sm text-muted-foreground"
            >
              <PhoneIcon />
              Voice Call
            </button>

            <button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed items-center gap-3 px-4 py-3 text-sm text-muted-foreground"
            >
              <SparklesIcon />
              Chat Tools
            </button>

            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                setIsInfoOpen(true);
              }}
              className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-sm text-foreground transition-colors hover:bg-accent"
            >
              <InfoIcon />
              Conversation Info
            </button>
          </div>
        )}
      </div>

      {/* Conversation information modal */}
      {conversation.other_user_id && (
        <ConversationInfoModal
          isOpen={isInfoOpen}
          onClose={() => setIsInfoOpen(false)}
          userId={conversation.other_user_id}
        />
      )}
    </header>
  );
}
