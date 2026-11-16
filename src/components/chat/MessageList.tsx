"use client";

import { Loader2 } from "lucide-react";
import MessageItem from "./MessageItem";
import { ChatMessage, MessageListProps } from "@/src/types/chat";
import { useLayoutEffect, useMemo, useRef, useEffect } from "react";

type RenderMessage = {
  key: string;
  message: ChatMessage;
  groupMessages?: ChatMessage[];
};

function getDateKey(dateString: string) {
  const date = new Date(dateString);

  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function getDateLabel(dateString: string) {
  const date = new Date(dateString);
  const today = new Date();

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (getDateKey(dateString) === getDateKey(today.toISOString())) {
    return "Today";
  }

  if (getDateKey(dateString) === getDateKey(yesterday.toISOString())) {
    return "Yesterday";
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

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
  const contentRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const previousHeightRef = useRef<number | null>(null);
  const previousLastMessageId = useRef<string | null>(null);

  // Keep track of whether the user is viewing the latest messages.
  const shouldStickToBottomRef = useRef(true);

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

  // Scroll to the latest message.
  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    const container = scrollRef.current;

    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  };

  // Initial scroll, new messages, and older-message pagination.
  useLayoutEffect(() => {
    const container = scrollRef.current;

    if (!container || messages.length === 0) return;

    const latestMessage = messages[messages.length - 1];
    const latestMessageId = latestMessage.id;

    // Preserve scroll position when older messages are loaded.
    if (previousHeightRef.current !== null) {
      const previousHeight = previousHeightRef.current;

      container.scrollTop += container.scrollHeight - previousHeight;

      previousHeightRef.current = null;
      return;
    }

    // Initial chat opening.
    if (!initialScrollDone.current) {
      scrollToBottom();
      shouldStickToBottomRef.current = true;

      initialScrollDone.current = true;
      previousLastMessageId.current = latestMessageId;
      return;
    }

    // New message received or sent.
    if (previousLastMessageId.current !== latestMessageId) {
      scrollToBottom("smooth");
      shouldStickToBottomRef.current = true;
    }

    previousLastMessageId.current = latestMessageId;
  }, [messages]);

  // Detect changes in content height, including asynchronously loaded images.
  useEffect(() => {
    const content = contentRef.current;

    if (!content) return;

    const resizeObserver = new ResizeObserver(() => {
      if (shouldStickToBottomRef.current) {
        scrollToBottom();
      }
    });

    resizeObserver.observe(content);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  function handleScroll() {
    const container = scrollRef.current;

    if (!container) return;

    // Keep the bottom only when the user is near the latest messages.
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    shouldStickToBottomRef.current = distanceFromBottom <= 150;

    if (isLoadingOlder || !hasMoreMessages) return;

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
      <div
        ref={contentRef}
        className="mx-auto flex min-h-full flex-col justify-end gap-5"
      >
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
            {renderedMessages.map((item, index) => {
              const currentDateKey = getDateKey(item.message.created_at);

              const previousDateKey =
                index > 0
                  ? getDateKey(renderedMessages[index - 1].message.created_at)
                  : null;

              const showDateSeparator = currentDateKey !== previousDateKey;
              return (
                <div key={item.key} className="flex flex-col gap-5">
                  {showDateSeparator && (
                    <div className="flex justify-center pb-1">
                      <span className="rounded-md border border-border bg-background px-3 py-1 text-[12px] text-foreground shadow-xs">
                        {getDateLabel(item.message.created_at)}
                      </span>
                    </div>
                  )}
                  <MessageItem
                    key={item.key}
                    message={item.message}
                    groupMessages={item.groupMessages}
                    isMine={item.message.sender_id === currentUserId}
                    onEditRequest={onEditMessage}
                  />
                </div>
              );
            })}
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
