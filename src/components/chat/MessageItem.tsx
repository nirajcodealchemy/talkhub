import { ChatMessage } from "@/src/types/chat";
import { Check, CheckCheck } from "lucide-react";

type Props = {
  message: ChatMessage;
  isMine: boolean;
};

export default function MessageItem({ message, isMine }: Props) {
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  // Determine message status:
  // - Blue double tick: message was read (read_at is set OR status === "read")
  // - Gray/normal double tick: message was delivered (delivered_at is set OR status === "delivered")
  // - Gray single tick: message was sent (status === "sent" or default)
  const isRead = !!message.read_at || message.status === "read";
  const isDelivered =
    isRead || !!message.delivered_at || message.status === "delivered";

  return (
    <div className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[70%] sm:max-w-[60%]">
        <div
          className={`relative rounded-[18px] shadow-sm ${
            isMine ? "bg-[#6246ea] text-white" : "bg-[#e8e8ea] text-[#1c1c1e]"
          } ${
            message.message_type === "image" ? "px-1 pt-1 pb-2" : "px-4 py-2.5"
          }`}
        >
          {/* IMAGE */}
          {message.message_type === "image" && message.attachment_url && (
            <div className="mb-2 overflow-hidden rounded-xl bg-white">
              <img
                src={message.attachment_url}
                alt="Shared attachment"
                loading="lazy"
                className="max-h-[320px] w-full rounded-lg object-contain"
              />
            </div>
          )}

          {/* FILE */}
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

          {/* TEXT */}
          {message.content && message.message_type === "text" && (
            <p className="whitespace-pre-wrap break-words text-[14.5px] leading-[1.4]">
              {message.content}
            </p>
          )}

          {/* TIME AND MESSAGE STATUS */}
          <div
            className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${
              isMine ? "text-white/80" : "text-[#71717a]"
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
                  // Read: blue double tick
                  <CheckCheck
                    size={15}
                    className="text-[#38bdf8]"
                    strokeWidth={2.5}
                  />
                ) : isDelivered ? (
                  // Delivered: gray double tick
                  <CheckCheck
                    size={15}
                    className="text-white/60"
                    strokeWidth={2.5}
                  />
                ) : (
                  // Sent: single gray tick
                  <Check
                    size={15}
                    className="text-white/60"
                    strokeWidth={2.5}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* REACTIONS */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="mt-1 flex items-center gap-1">
            {message.reactions.map((reaction, index) => (
              <span
                key={`${message.id}-${index}`}
                className="rounded-full border border-gray-100 bg-white px-2 py-0.5 text-xs shadow-sm"
              >
                {reaction}
              </span>
            ))}
          </div>
        )}

        {/* REPLIES */}
        {message.reply_count ? (
          <div className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-[#4b5563]">
            <span className="text-[13px]">↳</span>
            <span>{message.reply_count} Replies</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
