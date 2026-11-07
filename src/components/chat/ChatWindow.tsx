"use client";

import { useEffect, useState } from "react";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { ChatMessage, ChatWindowProps } from "@/src/types/chat";
import { useEditMessage } from "@/src/hooks/useEditText";
import { useTypingIndicator } from "@/src/hooks/useTypingIndicator";

export default function ChatWindow({
  onSend,
  onBack,
  onLoadOlder,
  conversation,
  onAttachment,
  onAttachments,
  currentUserId,
  isLoadingOlder,
  hasMoreMessages,
}: ChatWindowProps) {
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(
    null,
  );
  const { isOtherUserTyping, notifyTyping, stopTyping } = useTypingIndicator(
    conversation.id,
    currentUserId,
  );
  const { mutateAsync: editMessage, isPending: isEditing } = useEditMessage();

  useEffect(() => {
    setEditingMessage(null);
  }, [conversation.id]);

  const handleEditRequest = (message: ChatMessage) => {
    setEditingMessage(message);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
  };

  const handleEditSubmit = async (content: string) => {
    if (!editingMessage) return;

    await editMessage({
      messageId: editingMessage.id,
      conversationId: conversation.id,
      content,
    });

    setEditingMessage(null);
  };

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-chat-window-background">
      <ChatHeader conversation={conversation} onBack={onBack} />

      <MessageList
        messages={conversation.messages}
        currentUserId={currentUserId}
        onLoadOlder={onLoadOlder}
        hasMoreMessages={hasMoreMessages}
        isLoadingOlder={isLoadingOlder}
        onEditMessage={handleEditRequest}
        isOtherUserTyping={isOtherUserTyping}
      />
      <MessageInput
        onSend={onSend}
        onAttachment={onAttachment}
        onAttachments={onAttachments}
        conversationId={conversation.id}
        editingMessage={editingMessage}
        onCancelEdit={handleCancelEdit}
        onEditSubmit={handleEditSubmit}
        isEditing={isEditing}
        onTyping={notifyTyping}
        onStopTyping={stopTyping}
      />
    </section>
  );
}
