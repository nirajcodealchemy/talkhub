"use client";

import { EmojiIcon } from "../../icons";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { EmojiPickerPopoverProps } from "@/src/types";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";

export default function EmojiPickerPopover({
  onEmojiSelect,
}: EmojiPickerPopoverProps) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);

  const t = useTranslations("screen.chat.MessageInput");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        emojiRef.current &&
        !emojiRef.current.contains(event.target as Node)
      ) {
        setEmojiOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
  };

  return (
    <div className="relative" ref={emojiRef}>
      <button
        type="button"
        aria-label={t("insertEmoji")}
        aria-expanded={emojiOpen}
        onClick={() => setEmojiOpen((previous) => !previous)}
        className="cursor-pointer rounded-full p-1 text-grey-400 transition-colors hover:text-chart-4"
      >
        <EmojiIcon />
      </button>

      {emojiOpen && (
        <div
          className="
            fixed bottom-[90px] left-1/2 z-[100]
            w-[calc(100vw-24px)] max-w-[270px]
            -translate-x-1/2
            sm:absolute sm:bottom-12 sm:left-0
            sm:w-[350px] sm:translate-x-0
          "
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            width="100%"
            height={300}
            searchPlaceholder={t("searchEmoji")}
            previewConfig={{
              showPreview: false,
            }}
          />
        </div>
      )}
    </div>
  );
}
