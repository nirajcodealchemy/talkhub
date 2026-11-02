"use client";

import { useConversations } from "@/src/hooks/useConversations";
import ChatLayout from "@/src/screen/chat/ChatLayout";
import ChatScreen from "@/src/screen/chat/ChatScreen";

export default function ChatPage() {
  const { data: conversations, isLoading } = useConversations();

  if (isLoading) {
    return <div className="h-screen animate-pulse bg-gray-50" />;
  }

  if (!conversations?.length) {
    return <ChatScreen />;
  }

  return <ChatLayout />;
}
