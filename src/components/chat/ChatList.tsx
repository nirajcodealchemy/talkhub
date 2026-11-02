"use client";

import { ChatConversation } from "@/src/types/chat";
import ChatListItem from "./ChatListItem";

type Props = {
  conversations: ChatConversation[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export default function ChatList({
  conversations,
  selectedId,
  onSelect,
}: Props) {
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
          No conversations yet.
        </div>
      )}
    </div>
  );
}
