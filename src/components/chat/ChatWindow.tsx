"use client";

import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { ChatWindowProps } from "@/src/types/chat";

export default function ChatWindow({
  onSend,
  onBack,
  onLoadOlder,
  conversation,
  onAttachment,
  currentUserId,
  isLoadingOlder,
  hasMoreMessages,
}: ChatWindowProps) {
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-chat-window-background">
      <ChatHeader conversation={conversation} onBack={onBack} />

      <MessageList
        messages={conversation.messages}
        currentUserId={currentUserId}
        onLoadOlder={onLoadOlder}
        hasMoreMessages={hasMoreMessages}
        isLoadingOlder={isLoadingOlder}
      />

      <MessageInput
        onSend={onSend}
        onAttachment={onAttachment}
        conversationId={conversation.id}
      />
    </section>
  );
}
