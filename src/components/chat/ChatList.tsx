"use client";

import ChatListItem from "./ChatListItem";
import { useTranslations } from "next-intl";
import { ChatListProps } from "@/src/types/chat";

export default function ChatList({
  onSelect,
  selectedId,
  conversations,
}: ChatListProps) {
  const t = useTranslations("screen.chat.ChatScreen");
  return (
    <div className="h-full overflow-y-auto overscroll-contain">
      {conversations.map((conversation) => (
        <ChatListItem
          key={conversation.id}
          conversation={conversation}
          selected={selectedId === conversation.id}
          onClick={() => onSelect(conversation.id)}
        />
      ))}

      {conversations.length === 0 && (
        <div className="px-4 py-10 text-center text-sm text-gray-500">
          {/* No conversations yet. */}
          {t("noConversationsTitle")}
        </div>
      )}
    </div>
  );
}
