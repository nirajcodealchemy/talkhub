"use client";

import { useState } from "react";
import InfoIcon from "../icons/InfoIcon";
import VideoIcon from "../icons/VideoIcon";
import PhoneIcon from "../icons/PhoneIcon";
import { useTranslations } from "next-intl";
import SparklesIcon from "../icons/SparklesIcon";
import type { HeaderProps } from "@/src/types/chat";
import { ArrowLeft, MoreVertical, X } from "lucide-react";
import ConversationInfoModal from "../modal/ConversationInfoModal";

export default function ChatHeader({ conversation, onBack }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const t = useTranslations("screen.chat.ChatHeader");
  return (
    <header className="relative z-20 flex h-[64px] shrink-0 items-center justify-between border-b border-border bg-background px-3 sm:px-5">
      {/* User details */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {/* Mobile back button */}
        <button
          type="button"
          onClick={onBack}
          aria-label={t("backAriaLabel")}
          className="shrink-0 rounded-full p-1.5 text-foreground transition-colors hover:bg-accent sm:hidden"
        >
          <ArrowLeft size={22} />
        </button>

        {/* User avatar */}
        <div
          className="relative h-10 w-10 shrink-0 cursor-pointer"
          onClick={() => {
            setIsMenuOpen(false);
            setIsInfoOpen(true);
          }}
        >
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
            {conversation.online ? t("online") : t("offline")}
          </p>
        </div>
      </div>

      {/* Desktop actions */}
      <div className="hidden shrink-0 items-center gap-4 text-foreground sm:flex">
        <button
          type="button"
          aria-label={t("videoCallAriaLabel")}
          disabled
          className="cursor-not-allowed rounded-full p-1 text-muted-foreground"
        >
          <VideoIcon />
        </button>

        <button
          type="button"
          aria-label={t("voiceCallAriaLabel")}
          disabled
          className="cursor-not-allowed rounded-full p-1 text-muted-foreground"
        >
          <PhoneIcon />
        </button>

        <button
          type="button"
          aria-label={t("chatToolsAriaLabel")}
          disabled
          className="cursor-not-allowed rounded-full p-1 text-muted-foreground"
        >
          <SparklesIcon />
        </button>

        <button
          type="button"
          onClick={() => setIsInfoOpen(true)}
          aria-label={t("conversationInfoAriaLabel")}
          className="rounded-full cursor-pointer p-1 text-foreground transition-colors hover:bg-accent"
        >
          <InfoIcon />
        </button>
      </div>

      {/* Mobile menu */}
      <div className="relative sm:hidden">
        <button
          type="button"
          aria-label={t("chatOptionsAriaLabel")}
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
              {t("videoCall")}
            </button>

            <button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed items-center gap-3 px-4 py-3 text-sm text-muted-foreground"
            >
              <PhoneIcon />
              {t("voiceCall")}
            </button>

            <button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed items-center gap-3 px-4 py-3 text-sm text-muted-foreground"
            >
              <SparklesIcon />
              {t("chatTools")}
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
              {t("conversationInfo")}
            </button>
          </div>
        )}
      </div>

      {/* Conversation information modal */}
      {conversation.other_user_id && (
        <ConversationInfoModal
          isOpen={isInfoOpen}
          onClose={() => setIsInfoOpen(false)}
          userId={conversation}
        />
      )}
    </header>
  );
}
