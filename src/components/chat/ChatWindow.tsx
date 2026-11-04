"use client";

import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { ChatConversation } from "@/src/types/chat";

type Props = {
  conversation: ChatConversation;
  currentUserId: string;
  onSend: (message: string) => void;
  onAttachment?: (file: File) => void;
  onBack?: () => void;
};

export default function ChatWindow({
  conversation,
  currentUserId,
  onSend,
  onAttachment,
  onBack,
}: Props) {
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-chat-window-background">
      <ChatHeader conversation={conversation} onBack={onBack} />

      <MessageList
        messages={conversation.messages}
        currentUserId={currentUserId}
      />

      <MessageInput onSend={onSend} onAttachment={onAttachment} />
    </section>
  );
}
