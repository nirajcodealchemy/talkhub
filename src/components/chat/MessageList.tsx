"use client";

import { Loader2 } from "lucide-react";
import MessageItem from "./MessageItem";
import { useLayoutEffect, useMemo, useRef } from "react";
import { ChatMessage, MessageListProps } from "@/src/types/chat";

type RenderMessage = {
  key: string;
  message: ChatMessage;
  groupMessages?: ChatMessage[];
};

export default function MessageList({
  messages,
  onLoadOlder,
  currentUserId,
  isLoadingOlder,
  hasMoreMessages,
  onEditMessage,
  isOtherUserTyping,
}: MessageListProps) {
  const initialScrollDone = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const previousHeightRef = useRef<number | null>(null);
  const previousLastMessageId = useRef<string | null>(null);

  // Combine image rows belonging to the same group.
  const renderedMessages = useMemo(() => {
    const result: RenderMessage[] = [];
    const processedGroups = new Set<string>();

    messages.forEach((message) => {
      const groupId =
        message.message_type === "image" ? message.media_group_id : null;

      if (!groupId) {
        result.push({
          key: message.id,
          message,
        });
        return;
      }

      if (processedGroups.has(groupId)) return;

      processedGroups.add(groupId);

      const groupMessages = messages.filter(
        (item) =>
          item.media_group_id === groupId && item.message_type === "image",
      );

      result.push({
        key: groupId,
        message: groupMessages[0] ?? message,
        groupMessages,
      });
    });

    return result;
  }, [messages]);

  useLayoutEffect(() => {
    const container = scrollRef.current;

    if (!container || messages.length === 0) return;

    const latestMessage = messages[messages.length - 1];
    const latestMessageId = latestMessage.id;

    if (previousHeightRef.current !== null) {
      const previousHeight = previousHeightRef.current;

      container.scrollTop += container.scrollHeight - previousHeight;

      previousHeightRef.current = null;
      return;
    }

    if (!initialScrollDone.current) {
      bottomRef.current?.scrollIntoView();
      initialScrollDone.current = true;
      previousLastMessageId.current = latestMessageId;
      return;
    }

    if (previousLastMessageId.current !== latestMessageId) {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }

    previousLastMessageId.current = latestMessageId;
  }, [messages]);

  function handleScroll() {
    const container = scrollRef.current;

    if (!container || isLoadingOlder || !hasMoreMessages) return;

    if (container.scrollTop <= 80) {
      previousHeightRef.current = container.scrollHeight;
      onLoadOlder();
    }
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="min-h-0 flex-1 overflow-y-auto bg-muted px-5 py-5 sm:px-6"
    >
      <div className="mx-auto flex min-h-full flex-col justify-end gap-5">
        {isLoadingOlder && (
          <div className="flex justify-center py-2">
            <Loader2 className="animate-spin text-chart-4" size={22} />
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-center">
            <span className="rounded-full bg-grey-100 px-4 py-1.5 text-xs text-muted-foreground">
              No messages yet. Send a message to start the conversation!
            </span>
          </div>
        ) : (
          <>
            <div className="flex justify-center pb-1">
              <span className="rounded-md border border-border bg-background px-3 py-1 text-[12px] text-foreground shadow-xs">
                Today
              </span>
            </div>

            {renderedMessages.map((item) => (
              <MessageItem
                key={item.key}
                message={item.message}
                groupMessages={item.groupMessages}
                isMine={item.message.sender_id === currentUserId}
                onEditRequest={onEditMessage}
              />
            ))}
          </>
        )}

        {/* Other user's typing indicator */}
        {isOtherUserTyping && (
          <div className="flex justify-start px-2">
            <div className="flex items-center gap-1 rounded-full bg-conversation-item-bg px-4 py-3">
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
