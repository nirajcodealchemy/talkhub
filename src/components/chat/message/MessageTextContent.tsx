"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { MessageTextContentProps } from "@/src/types/chat";

const MESSAGE_LINE_LIMIT = 10;

export default function MessageTextContent({
  message,
  isMine,
}: MessageTextContentProps) {
  const t = useTranslations("screen.chat.MessageItem");
  const [isExpanded, setIsExpanded] = useState(false);

  const content = message.content ?? "";
  const lines = content.split(/\r?\n/);
  const isLongMessage =
    message.message_type === "text" && lines.length > MESSAGE_LINE_LIMIT;

  const displayedMessage =
    isLongMessage && !isExpanded
      ? `${lines.slice(0, MESSAGE_LINE_LIMIT).join("\n")}\n...`
      : content;

  if (!content) return null;

  return (
    <div className="min-w-0">
      <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[14.5px] leading-[1.4]">
        {displayedMessage}
      </p>

      {isLongMessage && (
        <button
          type="button"
          onClick={() => setIsExpanded((previous) => !previous)}
          className={`mt-1 cursor-pointer text-[13px] font-semibold hover:underline ${
            isMine ? "text-primary-foreground" : "text-chart-4"
          }`}
        >
          {isExpanded ? t("readLess") : t("readMore")}
        </button>
      )}
    </div>
  );
}
