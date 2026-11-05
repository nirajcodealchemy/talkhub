"use client";

import { Loader2 } from "lucide-react";
import MessageItem from "./MessageItem";
import { useLayoutEffect, useRef } from "react";
import { MessageListProps } from "@/src/types/chat";

export default function MessageList({
  messages,
  onLoadOlder,
  currentUserId,
  isLoadingOlder,
  hasMoreMessages,
}: MessageListProps) {
  const initialScrollDone = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const previousHeightRef = useRef<number | null>(null);
  const previousLastMessageId = useRef<string | null>(null);

  useLayoutEffect(() => {
    const container = scrollRef.current;

    if (!container || messages.length === 0) return;

    const latestMessage = messages[messages.length - 1];
    const latestMessageId = latestMessage.id;

    // Preserve position when older messages are loaded.
    if (previousHeightRef.current !== null) {
      const previousHeight = previousHeightRef.current;

      container.scrollTop += container.scrollHeight - previousHeight;

      previousHeightRef.current = null;
      return;
    }

    // Initial conversation load.
    if (!initialScrollDone.current) {
      bottomRef.current?.scrollIntoView();
      initialScrollDone.current = true;
      previousLastMessageId.current = latestMessageId;
      return;
    }

    // A new message was appended.
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
      <div className="mx-auto flex min-h-full max-w-[1100px] flex-col justify-end gap-5">
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

            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                isMine={message.sender_id === currentUserId}
              />
            ))}
          </>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
