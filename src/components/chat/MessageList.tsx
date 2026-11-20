"use client";

import { useTranslations } from "next-intl";
import { ArrowDown, Loader2 } from "lucide-react";
import { MessageListProps, RenderMessage } from "@/src/types";
import { useLayoutEffect, useMemo, useRef, useEffect, useState } from "react";
import MessageItem from "./MessageItem";

function getDateKey(dateString: string) {
  const date = new Date(dateString);

  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function getDateLabel(
  dateString: string,
  t: ReturnType<typeof useTranslations>,
) {
  const date = new Date(dateString);
  const today = new Date();

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (getDateKey(dateString) === getDateKey(today.toISOString())) {
    return t("today");
  }

  if (getDateKey(dateString) === getDateKey(yesterday.toISOString())) {
    return t("yesterday");
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function MessageList({
  isGroup,
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
  const firstUnreadMessageIdRef = useRef<string | null>(null);
  const previousMessageIdsRef = useRef<Set<string>>(new Set());

  const [newMessageCount, setNewMessageCount] = useState(0);

  const t = useTranslations("screen.MessageList");
  // Combine image rows belonging to the same group.
  const renderedMessages = useMemo(() => {
    const result: RenderMessage[] = [];
    const processedGroups = new Set<string>();

    messages.forEach((message) => {
      const isDeleted =
        message.is_deleted_for_everyone || message.deleted_for_me;

      // Deleted images need their own row. If a deleted image is used as the
      // lead item for a media group, MessageItem renders its deleted state
      // instead of the rest of the group's images.
      if (message.message_type === "image" && isDeleted) {
        result.push({ key: message.id, message });
        return;
      }

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
          item.media_group_id === groupId &&
          item.message_type === "image" &&
          !item.is_deleted_for_everyone &&
          !item.deleted_for_me,
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

  useLayoutEffect(() => {
    const container = scrollRef.current;

    if (!container || messages.length === 0) return;

    const latestMessage = messages[messages.length - 1];

    const currentMessageIds = new Set(messages.map((message) => message.id));

    // Initial chat opening: scroll to latest message.
    if (!initialScrollDone.current) {
      scrollToBottom();

      shouldStickToBottomRef.current = true;
      previousMessageIdsRef.current = currentMessageIds;
      previousLastMessageId.current = latestMessage.id;

      initialScrollDone.current = true;
      return;
    }

    // Preserve position when older messages are loaded.
    if (previousHeightRef.current !== null) {
      const previousHeight = previousHeightRef.current;

      container.scrollTop += container.scrollHeight - previousHeight;

      previousHeightRef.current = null;
      previousMessageIdsRef.current = currentMessageIds;

      return;
    }

    // Find messages that were added since the previous render.
    const newMessages = messages.filter(
      (message) => !previousMessageIdsRef.current.has(message.id),
    );

    if (newMessages.length > 0) {
      const isLatestMessageMine = latestMessage.sender_id === currentUserId;

      const incomingMessages = newMessages.filter(
        (message) => message.sender_id !== currentUserId,
      );

      // Sender's own message: always scroll to bottom.
      if (isLatestMessageMine) {
        scrollToBottom("smooth");

        shouldStickToBottomRef.current = true;
        setNewMessageCount(0);
        firstUnreadMessageIdRef.current = null;
      }
      // Receiver is already near the bottom: keep following latest messages.
      else if (shouldStickToBottomRef.current) {
        scrollToBottom("smooth");
      }
      // Receiver is reading older messages: don't move the scroll.
      else if (incomingMessages.length > 0) {
        if (!firstUnreadMessageIdRef.current) {
          firstUnreadMessageIdRef.current = incomingMessages[0].id;
        }

        setNewMessageCount((count) => count + incomingMessages.length);
      }
    }

    previousMessageIdsRef.current = currentMessageIds;
    previousLastMessageId.current = latestMessage.id;
  }, [messages, currentUserId]);

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

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    shouldStickToBottomRef.current = distanceFromBottom <= 150;

    // Check whether the first unread message is visible.
    const unreadId = firstUnreadMessageIdRef.current;

    if (unreadId) {
      const unreadElement = document.getElementById(`message-${unreadId}`);

      if (unreadElement) {
        const containerRect = container.getBoundingClientRect();
        const unreadRect = unreadElement.getBoundingClientRect();

        const reachedUnreadMessage =
          unreadRect.top < containerRect.bottom &&
          unreadRect.bottom > containerRect.top;

        if (reachedUnreadMessage) {
          setNewMessageCount(0);
          firstUnreadMessageIdRef.current = null;
        }
      }
    }

    if (isLoadingOlder || !hasMoreMessages) return;

    if (container.scrollTop <= 80) {
      previousHeightRef.current = container.scrollHeight;
      onLoadOlder();
    }
  }

  function handleScrollToUnread() {
    const messageId = firstUnreadMessageIdRef.current;

    if (!messageId) return;

    const container = scrollRef.current;
    const target = document.getElementById(`message-${messageId}`);

    if (!container || !target) return;

    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    const targetTop = targetRect.top - containerRect.top + container.scrollTop;

    container.scrollTo({
      top: targetTop,
      behavior: "smooth",
    });

    setNewMessageCount(0);
    firstUnreadMessageIdRef.current = null;

    shouldStickToBottomRef.current = false;
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="min-h-0 flex-1 overflow-y-auto chat-scrollbar bg-muted px-5 py-5 sm:px-6"
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
                <div
                  key={item.key}
                  id={`message-${item.message.id}`}
                  className="flex flex-col gap-5"
                >
                  {showDateSeparator && (
                    <div className="flex justify-center pb-1">
                      <span className="rounded-md border border-border bg-background px-3 py-1 text-[12px] text-foreground shadow-xs">
                        {getDateLabel(item.message.created_at, t)}
                      </span>
                    </div>
                  )}
                  {/* <MessageItem
                    key={item.key}
                    message={item.message}
                    groupMessages={item.groupMessages}
                    isMine={item.message.sender_id === currentUserId}
                    onEditRequest={onEditMessage}
                  /> */}
                  <MessageItem
                    key={item.key}
                    message={item.message}
                    groupMessages={item.groupMessages}
                    isMine={item.message.sender_id === currentUserId}
                    isGroup={isGroup}
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
      {newMessageCount > 0 && (
        <button
          type="button"
          onClick={handleScrollToUnread}
          className="absolute cursor-pointer bottom-30 right-8 z-20 flex h-11 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-lg transition-colors hover:bg-accent"
          aria-label={`Scroll to ${newMessageCount} new messages`}
        >
          <ArrowDown size={18} />
          <span>{newMessageCount}</span>
        </button>
      )}
    </div>
  );
}
