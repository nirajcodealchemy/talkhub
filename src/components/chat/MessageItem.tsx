import { ChatMessage } from "@/src/types/chat";
import { CheckCheck, CornerUpRight } from "lucide-react";

type Props = {
  message: ChatMessage;
  isMine: boolean;
};

export default function MessageItem({ message, isMine }: Props) {
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[75%]">
        <div
          className={`min-w-[90px] rounded-[17px] px-3.5 py-2.5 shadow-sm ${
            isMine
              ? "rounded-tr-[5px] bg-gradient-to-br from-[#7654e9] to-[#6040d3] text-white"
              : "rounded-tl-[5px] bg-[#e8e8e9] text-[#171717]"
          }`}
        >
          {message.message_type === "image" && message.attachment_url && (
            <img
              src={message.attachment_url}
              alt="Shared image"
              className="mb-2 max-h-[240px] w-full rounded-xl object-cover"
            />
          )}

          {message.message_type === "file" && message.attachment_url && (
            <a
              href={message.attachment_url}
              target="_blank"
              rel="noreferrer"
              className="mb-2 block break-all underline"
            >
              {message.content || "Download file"}
            </a>
          )}

          {message.content && (
            <p className="whitespace-pre-wrap break-words text-[14px] leading-[1.45]">
              {message.content}
            </p>
          )}

          <div
            className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
              isMine ? "text-white/75" : "text-[#777]"
            }`}
          >
            {time}
            {isMine && <CheckCheck size={13} />}
          </div>
        </div>

        {message.reactions && message.reactions.length > 0 && (
          <div className="mt-1 flex items-center gap-1">
            {message.reactions.map((reaction, index) => (
              <span
                key={`${message.id}-${index}`}
                className="rounded-full border border-gray-200 bg-white px-2 py-1 text-sm shadow-sm"
              >
                {reaction}
              </span>
            ))}
          </div>
        )}

        {message.reply_count ? (
          <div className="mt-2 flex items-center gap-2 text-[12px] text-[#444]">
            <CornerUpRight size={15} />
            <span>{message.reply_count} Replies</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
