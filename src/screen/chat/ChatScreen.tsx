"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { ChatConversation } from "@/src/types/chat";

import ChatLayout from "./ChatLayout";
import { createClient } from "@/src/lib/supabase/client";

import MessageIcon from "@/src/components/icons/Message";
import ChatWindow from "@/src/components/chat/ChatWindow";
import ChatSidebar from "@/src/components/chat/ChatSidebar";

import { useConversations } from "@/src/hooks/useConversations";
import { useRealtimeMessages } from "@/src/hooks/useRealtimeChat";

import {
  useSendMessage,
  useSendAttachment,
  useMessages,
  useCreateDirectConversation,
} from "@/src/hooks/useChat";

type Props = {
  currentUserId?: string;
};

export default function ChatScreen({ currentUserId = "" }: Props) {
  // ==========================================
  // CLIENTS
  // ==========================================

  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  // ==========================================
  // CONVERSATIONS
  // ==========================================

  const {
    data: dbConversations,
    isLoading,
    refetch: refetchConversations,
  } = useConversations(currentUserId);

  // React Query is the single source of truth
  const conversations = (dbConversations ?? []) as ChatConversation[];

  // ==========================================
  // MUTATIONS
  // ==========================================

  const { mutateAsync: sendMessage } = useSendMessage();

  const { mutateAsync: sendAttachment } = useSendAttachment();

  const { mutateAsync: createDirectConversation } =
    useCreateDirectConversation();

  // ==========================================
  // SELECTED CONVERSATION
  // ==========================================

  const [selectedId, setSelectedId] = useState<string>("");

  // ==========================================
  // MESSAGES
  // ==========================================

  const { data: dbMessages, isLoading: isMessagesLoading } =
    useMessages(selectedId);

  // Listen to selected conversation messages
  useRealtimeMessages(selectedId || null);

  // ==========================================
  // MARK INCOMING MESSAGES AS READ
  // ==========================================

  useEffect(() => {
    if (!selectedId || !currentUserId || !dbMessages) return;

    let cancelled = false;

    const markMessagesAsRead = async () => {
      try {
        const { data, error } = await supabase.rpc(
          "mark_conversation_messages_read",
          {
            p_conversation_id: selectedId,
          },
        );

        if (error) {
          console.error("Mark messages as read failed:", error);
          return;
        }

        if (cancelled) return;

        console.log("Messages marked as read:", data);

        // Refresh only when messages were actually updated
        if (data > 0) {
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: ["messages", selectedId],
            }),

            queryClient.invalidateQueries({
              queryKey: ["conversations", currentUserId],
            }),
          ]);
        }
      } catch (error) {
        console.error("Read receipt error:", error);
      }
    };

    markMessagesAsRead();

    return () => {
      cancelled = true;
    };
  }, [selectedId, currentUserId, dbMessages, supabase, queryClient]);

  // ==========================================
  // SELECTED CONVERSATION DATA
  // ==========================================

  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedId,
  );

  const conversationWithMessages = selectedConversation
    ? {
        ...selectedConversation,
        messages: dbMessages ?? [],
      }
    : null;

  // ==========================================
  // SELECT CONVERSATION
  // ==========================================

  function handleSelect(id: string) {
    if (id === selectedId) return;

    setSelectedId(id);
  }

  // ==========================================
  // START DIRECT CONVERSATION
  // ==========================================

  async function handleStartChat(userId: string) {
    try {
      if (!userId || userId === currentUserId) return;

      const conversationId = await createDirectConversation(userId);

      // Refresh sidebar
      await refetchConversations();

      // Open conversation
      setSelectedId(conversationId);
    } catch (error) {
      console.error("Failed to start conversation:", error);
    }
  }

  // ==========================================
  // SEND TEXT MESSAGE
  // ==========================================

  async function handleSend(content: string) {
    if (!selectedId || !content.trim()) return;

    try {
      await sendMessage({
        conversationId: selectedId,
        content: content.trim(),
        messageType: "text",
      });

      // Refresh messages and sidebar
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["messages", selectedId],
        }),

        queryClient.invalidateQueries({
          queryKey: ["conversations", currentUserId],
        }),
      ]);
    } catch (error) {
      console.error("Message sending failed:", error);
    }
  }

  // ==========================================
  // SEND IMAGE / FILE ATTACHMENT
  // ==========================================

  async function handleAttachment(file: File) {
    if (!selectedId || !file) return;

    try {
      await sendAttachment({
        conversationId: selectedId,
        file,
      });

      // Refresh messages and sidebar
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["messages", selectedId],
        }),

        queryClient.invalidateQueries({
          queryKey: ["conversations", currentUserId],
        }),
      ]);
    } catch (error) {
      console.error("Attachment upload failed:", error);
    }
  }

  // ==========================================
  // LOADING
  // ==========================================

  if (isLoading) {
    return (
      <ChatLayout>
        <div className="flex h-full w-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#6545db] border-t-transparent" />
        </div>
      </ChatLayout>
    );
  }

  // ==========================================
  // UI
  // ==========================================

  return (
    <ChatLayout>
      {/* LEFT PANEL */}
      <div className="h-full w-[29.1%] min-w-[320px] max-w-[420px] shrink-0 max-md:hidden">
        <ChatSidebar
          conversations={conversations}
          selectedId={selectedId}
          onSelect={handleSelect}
          currentUserId={currentUserId}
          onStartChat={handleStartChat}
        />
      </div>

      {/* RIGHT PANEL */}
      <div className="flex h-full min-h-0 min-w-0 flex-1">
        {conversationWithMessages ? (
          <ChatWindow
            conversation={conversationWithMessages}
            currentUserId={currentUserId}
            onSend={handleSend}
            onAttachment={handleAttachment}
          />
        ) : (
          <div className="flex flex-1 select-none flex-col items-center justify-center bg-[#f4f4f5] px-6 text-center">
            <div className="mb-6 flex h-24 w-24 items-center justify-center opacity-75">
              <MessageIcon />
            </div>

            <h2 className="text-[17px] font-bold text-gray-900">
              Welcome to Your Conversations
            </h2>

            <p className="mt-2 max-w-[320px] text-[13px] leading-relaxed text-gray-500">
              Select a chat from the list to start exploring your messages or
              begin a new conversation.
            </p>
          </div>
        )}
      </div>
    </ChatLayout>
  );
}
