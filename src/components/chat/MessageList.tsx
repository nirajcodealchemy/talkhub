"use client";

import { useEffect, useRef } from "react";
import MessageItem from "./MessageItem";
import { ChatMessage } from "@/src/types/chat";

type Props = {
  messages: ChatMessage[];
  currentUserId: string;
};

export default function MessageList({ messages, currentUserId }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-white px-5 py-5 sm:px-6">
      <div className="mx-auto flex min-h-full max-w-[1100px] flex-col justify-end gap-5">
        {messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-center">
            <span className="rounded-full bg-gray-100 px-4 py-1.5 text-xs text-gray-500">
              No messages yet. Send a message to start the conversation!
            </span>
          </div>
        ) : (
          <>
            <div className="flex justify-center pb-1">
              <span className="rounded-md border border-[#e5e5e5] bg-white px-3 py-1 text-[12px] text-[#333] shadow-xs">
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
