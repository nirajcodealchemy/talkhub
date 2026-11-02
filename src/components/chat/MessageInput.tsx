"use client";

import { useRef, useState } from "react";
import { Plus, Mic, Smile, StickyNote, Send, X } from "lucide-react";

type Props = {
  onSend: (message: string) => void;
  onAttachment?: (file: File) => void;
};

export default function MessageInput({ onSend, onAttachment }: Props) {
  const [message, setMessage] = useState("");
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const value = message.trim();

    if (!value) return;

    onSend(value);
    setMessage("");
  };

  return (
    <div className="shrink-0 bg-[#f7f7f8] px-3 pb-3 sm:px-3.5 sm:pb-3.5">
      <div className="overflow-visible rounded-xl border border-[#ededed] bg-white shadow-sm">
        <textarea
          rows={1}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type your message..."
          className="block min-h-[46px] max-h-28 w-full resize-none rounded-t-xl bg-white px-4 py-3 text-[14px] outline-none placeholder:text-[#999]"
        />

        <div className="flex h-[54px] items-center justify-between border-t border-[#ededed] px-3">
          <div className="flex items-center gap-2 text-[#999]">
            <div className="relative">
              <button
                type="button"
                aria-label="Add attachment"
                onClick={() => setAttachmentOpen(!attachmentOpen)}
                className="rounded-full p-1.5 hover:bg-gray-100"
              >
                {attachmentOpen ? <X size={21} /> : <Plus size={23} />}
              </button>

              {attachmentOpen && (
                <div className="absolute bottom-11 left-0 z-30 w-40 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Attach file
                  </button>
                </div>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onAttachment?.(file);
                event.target.value = "";
                setAttachmentOpen(false);
              }}
            />

            <button
              type="button"
              aria-label="Voice message"
              className="rounded-full p-1.5 hover:bg-gray-100"
            >
              <Mic size={21} />
            </button>

            <button
              type="button"
              aria-label="Insert emoji"
              onClick={() => setMessage((value) => value + "😊")}
              className="rounded-full p-1.5 hover:bg-gray-100"
            >
              <Smile size={21} />
            </button>

            <button
              type="button"
              aria-label="Sticker"
              className="hidden rounded-full p-1.5 hover:bg-gray-100 sm:block"
            >
              <StickyNote size={21} />
            </button>
          </div>

          <button
            type="button"
            aria-label="Send message"
            onClick={handleSend}
            disabled={!message.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6545db] text-white transition hover:bg-[#5536c7] disabled:bg-[#e6e6e6] disabled:text-white"
          >
            <Send size={19} />
          </button>
        </div>
      </div>
    </div>
  );
}
