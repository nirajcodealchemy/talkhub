"use client";

import { MessageSquareText, MessagesSquare } from "lucide-react";
import { useTranslations } from "next-intl";

type AIAction = "reply" | "summary";

type Props = {
  onAIAction?: (action: AIAction) => void;
  mobile?: boolean;
  onClose?: () => void;
};

export default function AIChatTools({
  onAIAction,
  mobile = false,
  onClose,
}: Props) {
  const handleAction = (action: AIAction) => {
    onAIAction?.(action);
    onClose?.();
  };
  const t = useTranslations("screen.AiChatTools");
  return (
    <div className="relative">
      <div
        className={
          mobile
            ? "left-0 top-full z-50 mt-1.5 ml-0 w-[min(100%,14.1rem)] rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
            : "absolute right-0 top-2 z-50 w-57 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
        }
      >
        <button
          type="button"
          onClick={() => handleAction("reply")}
          className="flex w-full items-center gap-2 cursor-pointer rounded-lg px-2 py-3 text-sm text-foreground hover:bg-accent"
        >
          <MessageSquareText size={18} />
          {t("suggestReply")}
        </button>

        <button
          type="button"
          onClick={() => handleAction("summary")}
          className="flex w-full items-center gap-2 wrap-break-word cursor-pointer rounded-lg px-2 py-3 text-sm text-foreground hover:bg-accent sm:flex"
        >
          <MessagesSquare size={18} />
          {t("communicationSummary")}
        </button>
      </div>
    </div>
  );
}
