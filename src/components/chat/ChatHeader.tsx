/* eslint-disable @next/next/no-img-element */
"use client";

import { Button } from "../ui";
import { HeaderProps } from "@/src/types";
import { useTranslations } from "next-intl";
import GroupInfoPanel from "./GroupInfoPanel";
import AIChatTools from "./aiChat/AIChatTools";
import { ConversationInfoModal } from "../modal";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, MoreVertical, X } from "lucide-react";
import { InfoIcon, PhoneIcon, SparklesIcon, VideoIcon } from "../icons";

export default function ChatHeader({
  onBack,
  onAIAction,
  conversation,
  currentUserId,
  onOpenGroupInfo,
}: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isAiMenuOpen, setIsAiMenuOpen] = useState(false);

  const aiMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        aiMenuRef.current &&
        !aiMenuRef.current.contains(event.target as Node)
      ) {
        setIsAiMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const t = useTranslations("screen.chat.ChatHeader");

  return (
    <header className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-3 sm:px-5">
      {/* User details */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {/* Mobile back button */}
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          onClick={onBack}
          aria-label={t("backAriaLabel")}
          className="h-8 w-8 shrink-0 cursor-pointer rounded-full bg-white text-foreground hover:bg-accent md:hidden"
        >
          <ArrowLeft className="size-6" />
        </Button>

        <div
          onClick={() => {
            if (conversation.is_group) {
              onOpenGroupInfo?.();
            } else {
              setIsInfoOpen(true);
            }
          }}
          className="relative h-10 w-10 shrink-0 cursor-pointer"
        >
          {conversation.is_group ? (
            conversation.avatar_url ? (
              <img
                src={conversation.avatar_url}
                alt={conversation.name}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <img
                src={conversation.avatar_url || conversation.avatar}
                alt={conversation.name}
                className="h-full w-full rounded-full object-cover"
              />
            )
          ) : (
            <img
              alt={conversation.name}
              src={conversation.avatar}
              className="h-full w-full rounded-full object-cover"
            />
          )}
        </div>

        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold text-foreground">
            {conversation.name}
          </h2>

          <p className="text-[12px] text-muted-foreground">
            {conversation.is_group
              ? `${conversation.group_member_count ?? 0} Members`
              : conversation.online
                ? t("online")
                : t("offline")}
          </p>
        </div>
      </div>

      {/* Desktop actions */}
      <div className="hidden shrink-0 items-center gap-4 text-foreground sm:flex">
        <Button
          type="button"
          size="icon-lg"
          variant="ghost"
          aria-label={t("videoCallAriaLabel")}
          className=" bg-white rounded-full p-1 text-muted-foreground cursor-not-allowed hover:bg-white"
        >
          <VideoIcon className="size-6 cursor-not-allowed " />
        </Button>

        <Button
          type="button"
          aria-label={t("voiceCallAriaLabel")}
          className=" bg-white rounded-full p-1 text-muted-foreground cursor-not-allowed hover:bg-white"
        >
          <PhoneIcon className="size-6 cursor-not-allowed " />
        </Button>

        <div className="relative" ref={aiMenuRef}>
          <button
            type="button"
            aria-label="AI tools"
            aria-expanded={isAiMenuOpen}
            onClick={() => setIsAiMenuOpen((prev) => !prev)}
            className="cursor-pointer rounded-full p-1 text-foreground hover:bg-accent"
          >
            <SparklesIcon className="" />
          </button>
          {isAiMenuOpen && (
            <AIChatTools
              onAIAction={onAIAction}
              onClose={() => setIsAiMenuOpen(false)}
            />
          )}
        </div>

        <Button
          type="button"
          onClick={() => {
            if (conversation.is_group) {
              onOpenGroupInfo?.();
            } else {
              setIsInfoOpen(true);
            }
          }}
          aria-label={t("conversationInfoAriaLabel")}
          className=" bg-white rounded-full p-1 text-muted-foreground cursor-pointer hover:bg-white"
        >
          <InfoIcon className="size-6" />
        </Button>
      </div>

      {/* Mobile menu */}
      <div className="relative sm:hidden">
        <Button
          type="button"
          aria-expanded={isMenuOpen}
          aria-label={t("chatOptionsAriaLabel")}
          onClick={() => setIsMenuOpen((previous) => !previous)}
          className="rounded-full p-2 text-foreground transition-colors bg-white hover:bg-accent cursor-pointer"
        >
          {isMenuOpen ? (
            <X size={21} className="size-5 " />
          ) : (
            <MoreVertical size={21} className="size-5 " />
          )}
        </Button>

        {isMenuOpen && (
          <div className="absolute right-0 top-11 z-50 w-57 rounded-xl border border-border bg-popover py-1.5 text-popover-foreground shadow-lg">
            <Button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed bg-white items-center justify-start gap-3 px-4 py-4 text-sm text-muted-foreground"
            >
              <VideoIcon className="size-6 cursor-not-allowed " />
              {t("videoCall")}
            </Button>

            <Button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed bg-white items-center justify-start gap-3 px-4 py-4 text-sm text-muted-foreground"
            >
              <PhoneIcon className="size-6 cursor-not-allowed " />
              {t("voiceCall")}
            </Button>

            <div ref={aiMenuRef}>
              <Button
                type="button"
                aria-expanded={isAiMenuOpen}
                onClick={() => setIsAiMenuOpen((prev) => !prev)}
                className="flex w-full cursor-pointer items-center justify-start gap-3 bg-white px-4 py-4 text-sm text-muted-foreground hover:bg-accent"
              >
                <SparklesIcon className="size-6" />
                {t("chatTools")}
              </Button>

              {isAiMenuOpen && (
                <AIChatTools
                  mobile
                  onAIAction={onAIAction}
                  onClose={() => {
                    setIsAiMenuOpen(false);
                    setIsMenuOpen(false);
                  }}
                />
              )}
            </div>

            <Button
              type="button"
              onClick={() => {
                if (conversation.is_group) {
                  onOpenGroupInfo?.();
                } else {
                  setIsInfoOpen(true);
                }
              }}
              className="flex w-full cursor-pointer bg-white items-center  justify-start gap-3 px-4 py-4 text-sm text-muted-foreground hover:bg-white"
            >
              <InfoIcon className="size-6 " />
              {t("conversationInfo")}
            </Button>
          </div>
        )}
      </div>

      {/* Group information panel */}
      {conversation.is_group && isInfoOpen && (
        <GroupInfoPanel
          conversation={conversation}
          currentUserId={currentUserId}
          onClose={() => setIsInfoOpen(false)}
          onGroupExited={onBack}
        />
      )}

      {!conversation.is_group && conversation.other_user_id && isInfoOpen && (
        <ConversationInfoModal
          isOpen={isInfoOpen}
          userId={conversation}
          onClose={() => setIsInfoOpen(false)}
        />
      )}
    </header>
  );
}
