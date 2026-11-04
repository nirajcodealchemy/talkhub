import { ChatMessage } from "@/src/types/chat";
import { Check, CheckCheck } from "lucide-react";

type Props = {
  message: ChatMessage;
  isMine: boolean;
};

export default function MessageItem({ message, isMine }: Props) {
  const time = new Date(message.created_at).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const isRead = !!message.read_at || message.status === "read";
  const isDelivered =
    isRead || !!message.delivered_at || message.status === "delivered";

  return (
    <div className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[70%] sm:max-w-[60%]">
        <div
          className={`relative rounded-[18px] shadow-sm ${
            isMine
              ? "bg-chart-4 text-primary-foreground"
              : "bg-conversation-item-bg text-foreground"
          } ${
            message.message_type === "image" ? "px-1 pt-1 pb-2" : "px-4 py-2.5"
          }`}
        >
          {message.message_type === "image" && message.attachment_url && (
            <div className="mb-2 overflow-hidden rounded-xl bg-background">
              <img
                src={message.attachment_url}
                alt="Shared attachment"
                loading="lazy"
                className="max-h-[320px] w-full rounded-lg object-contain"
              />
            </div>
          )}

          {message.message_type === "file" && message.attachment_url && (
            <a
              href={message.attachment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-1 flex items-center gap-2 rounded-lg bg-white/10 p-3"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {message.content}
              </span>
              <span className="text-xs">Download</span>
            </a>
          )}

          {message.content && message.message_type === "text" && (
            <p className="whitespace-pre-wrap break-words text-[14.5px] leading-[1.4]">
              {message.content}
            </p>
          )}

          <div
            className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${
              isMine ? "text-primary-foreground/80" : "text-muted-foreground"
            }`}
          >
            <span
              className={`${message.message_type === "image" ? "mr-2" : ""}`}
            >
              {time}
            </span>

            {isMine && (
              <>
                {isRead ? (
                  <CheckCheck
                    size={15}
                    className="text-conversation-item-reads"
                    strokeWidth={2.5}
                  />
                ) : isDelivered ? (
                  <CheckCheck
                    size={15}
                    className="text-primary-foreground/60"
                    strokeWidth={2.5}
                  />
                ) : (
                  <Check
                    size={15}
                    className="text-primary-foreground/60"
                    strokeWidth={2.5}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {message.reactions && message.reactions.length > 0 && (
          <div className="mt-1 flex items-center gap-1">
            {message.reactions.map((reaction, index) => (
              <span
                key={`${message.id}-${index}`}
                className="rounded-full border border-border bg-background px-2 py-0.5 text-xs shadow-sm"
              >
                {reaction}
              </span>
            ))}
          </div>
        )}

        {message.reply_count ? (
          <div className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
            <span className="text-[13px]">↳</span>
            <span>{message.reply_count} Replies</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
