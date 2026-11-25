"use client";

import { createClient } from "@/src/lib";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChatSidebar, ChatWindow, MessageIcon } from "@/src/components";
import { ChatConversation, ChatMessage, ChatScreenProps } from "@/src/types";
import {
  useMessages,
  useSendMessage,
  useConversations,
  useSendAttachment,
  useSendImageGroup,
  useRealtimeMessages,
  useCreateDirectConversation,
  useForwardMessage,
} from "@/src/hooks";
import ChatLayout from "./ChatLayout";
import ForwardMessageModal from "@/src/components/modal/ForwardMessageModal";

export default function ChatScreen({ currentUserId = "" }: ChatScreenProps) {
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [messageToForward, setMessageToForward] = useState<ChatMessage | null>(
    null,
  );

  const t = useTranslations("screen.chat.ChatScreen");
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);

  const {
    data: dbConversations,
    isLoading,
    refetch: refetchConversations,
  } = useConversations(currentUserId);

  const conversations = (dbConversations ?? []) as ChatConversation[];

  const { mutateAsync: sendMessage } = useSendMessage();
  const { mutateAsync: sendAttachment } = useSendAttachment();
  const { mutateAsync: sendImageGroup } = useSendImageGroup();

  const { mutateAsync: createDirectConversation } =
    useCreateDirectConversation();
  const { mutateAsync: forwardMessage, isPending: isForwarding } =
    useForwardMessage();

  const [selectedId, setSelectedId] = useState<string>("");

  const previousUserId = useRef(currentUserId);

  useEffect(() => {
    if (previousUserId.current === currentUserId) return;

    const previousUser = previousUserId.current;

    // Reset the selected conversation when the account changes.
    setSelectedId("");

    // Remove the previous user's conversation cache.
    if (previousUser) {
      queryClient.removeQueries({
        queryKey: ["conversations", previousUser],
        exact: true,
      });
    }

    // Clear cached message queries to prevent old messages appearing.
    queryClient.removeQueries({
      queryKey: ["messages"],
    });

    previousUserId.current = currentUserId;
  }, [currentUserId, queryClient]);
  // const { data: dbMessages } = useMessages(selectedId);
  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessages(selectedId);

  const dbMessages = useMemo(
    () => messagesData?.pages.slice().reverse().flat() ?? [],
    [messagesData],
  );

  useRealtimeMessages(selectedId || null);

  // MARK INCOMING MESSAGES AS READ
  useEffect(() => {
    if (!selectedId || !currentUserId || !dbMessages?.length) return;

    const unreadMessages = dbMessages.filter(
      (message) => message.sender_id !== currentUserId && !message.read_at,
    );

    if (unreadMessages.length === 0) return;

    // 1. Immediately update React Query cache
    queryClient.setQueryData(
      ["conversations", currentUserId],
      (oldData: ChatConversation[] | undefined) => {
        if (!oldData) return oldData;

        return oldData.map((conversation) => {
          if (conversation.id !== selectedId) return conversation;

          return {
            ...conversation,
            unread_count: 0,
            messages: conversation.messages.map((message) =>
              message.sender_id !== currentUserId && !message.read_at
                ? {
                    ...message,
                    read_at: new Date().toISOString(),
                    status: "read",
                  }
                : message,
            ),
            last_message_read:
              conversation.last_message_sender !== currentUserId
                ? true
                : conversation.last_message_read,
          };
        });
      },
    );

    // 2. Update database in background
    let cancelled = false;

    const markMessagesAsRead = async () => {
      try {
        const { error } = await supabase.rpc(
          "mark_conversation_messages_read",
          {
            p_conversation_id: selectedId,
          },
        );

        if (error) {
          console.error("Read receipt error:", error);

          // Refresh server data if update failed
          if (!cancelled) {
            await queryClient.invalidateQueries({
              queryKey: ["conversations", currentUserId],
            });
          }
        }
      } catch (error) {
        console.error("Read receipt error:", error);
      }
    };

    void markMessagesAsRead();

    return () => {
      cancelled = true;
    };
  }, [selectedId, currentUserId, dbMessages, supabase, queryClient]);

  // SELECTED CONVERSATION DATA

  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedId,
  );

  const conversationWithMessages = selectedConversation
    ? {
        ...selectedConversation,
        messages: dbMessages,
      }
    : null;

  // SELECT CONVERSATION

  function handleSelect(id: string) {
    if (id === selectedId) return;

    setSelectedId(id);
  }

  // START DIRECT CONVERSATION

  async function handleStartChat(userId: string) {
    try {
      if (!userId || userId === currentUserId) return;

      const conversationId = await createDirectConversation(userId);

      await refetchConversations();

      setSelectedId(conversationId);
    } catch (error) {
      console.error("Failed to start conversation:", error);
    }
  }

  // SEND TEXT MESSAGE

  // SEND TEXT MESSAGE
  async function handleSendFromInput(
    content: string,
    replyToId?: string | null,
  ) {
    if (!selectedId || !content.trim()) return;

    try {
      await sendMessage({
        conversationId: selectedId,
        content: content.trim(),
        messageType: "text",
        replyToId: replyToId ?? null,
      });

      setReplyTo(null);
    } catch (error) {
      console.error("Message sending failed:", error);
    }
  }

  // Send one non-image attachment.
  async function handleAttachment(file: File) {
    if (!selectedId || !file) return;

    try {
      await sendAttachment({
        conversationId: selectedId,
        file,
      });
    } catch (error) {
      console.error("Attachment upload failed:", error);
    }
  }

  // Send multiple images as one group.
  async function handleAttachments(files: File[], caption?: string) {
    if (!selectedId || files.length === 0) return;

    try {
      await sendImageGroup({
        conversationId: selectedId,
        files,
        caption,
      });
    } catch (error) {
      console.error("Image group upload failed:", error);
    }
  }

  // LOADING
  if (isLoading) {
    return (
      <ChatLayout>
        <div className="flex h-full w-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-chart-4 border-t-transparent" />
        </div>
      </ChatLayout>
    );
  }

  // UI
  const handleReply = (message: ChatMessage | null) => {
    setReplyTo(message);
  };

  const handleForwardMessage = async (
    targetConversationIds: string[],
    message: ChatMessage,
  ) => {
    try {
      await Promise.all(
        targetConversationIds.map((targetConversationId) =>
          forwardMessage({
            targetConversationId,
            originalMessage: message,
          }),
        ),
      );

      setMessageToForward(null);
    } catch (error) {
      console.error("Message forwarding failed:", error);
    }
  };

  return (
    <ChatLayout>
      <div
        className={`h-full w-full shrink-0 md:block md:w-[29.1%] md:min-w-[320px] md:max-w-[420px] ${
          selectedId ? "hidden" : "block"
        }`}
      >
        <ChatSidebar
          selectedId={selectedId}
          onSelect={handleSelect}
          conversations={conversations}
          currentUserId={currentUserId}
          onStartChat={handleStartChat}
        />
      </div>

      <div
        className={`h-full min-h-0 min-w-0 flex-1 ${
          selectedId ? "flex" : "hidden"
        } md:flex`}
      >
        {conversationWithMessages ? (
          <ChatWindow
            replyTo={replyTo}
            onReply={handleReply}
            onSend={handleSendFromInput}
            currentUserId={currentUserId}
            onAttachment={handleAttachment}
            hasMoreMessages={!!hasNextPage}
            onBack={() => setSelectedId("")}
            onAttachments={handleAttachments}
            onLoadOlder={() => fetchNextPage()}
            isLoadingOlder={isFetchingNextPage}
            conversation={conversationWithMessages}
            onForward={(message) => setMessageToForward(message)}
          />
        ) : (
          <div className="hidden flex-1 flex-col items-center justify-center bg-muted px-6 text-center md:flex">
            <div className="mb-6 flex h-24 w-24 items-center justify-center opacity-75">
              <MessageIcon />
            </div>

            <h2 className="text-[17px] font-bold text-foreground">
              {t("welcomeTitle")}
            </h2>

            <p className="mt-2 max-w-[320px] text-[13px] leading-relaxed text-muted-foreground">
              {t("welcomeDescription")}
            </p>
          </div>
        )}
      </div>
      <ForwardMessageModal
        message={messageToForward}
        conversations={conversations}
        currentConversationId={selectedId}
        isForwarding={isForwarding}
        onClose={() => setMessageToForward(null)}
        onForward={handleForwardMessage}
      />
    </ChatLayout>
  );
}
