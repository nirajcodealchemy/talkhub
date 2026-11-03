"use client";

import { useRef, useState } from "react";
import {
  Plus,
  Mic,
  Smile,
  StickyNote,
  Send,
  X,
  FileText,
  Image as ImageIcon,
  File,
  Paperclip,
} from "lucide-react";
import type { DragEvent } from "react";

type Props = {
  onSend: (message: string) => void;
  onAttachment?: (file: File) => void;
};

export default function MessageInput({ onSend, onAttachment }: Props) {
  const [message, setMessage] = useState("");
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get file icon
  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <ImageIcon size={20} />;
    }

    if (
      file.type.includes("pdf") ||
      file.type.includes("document") ||
      file.type.includes("text")
    ) {
      return <FileText size={20} />;
    }

    return <File size={20} />;
  };

  // Add selected files
  const addFiles = (files: FileList | File[]) => {
    const newFiles = Array.from(files);

    setSelectedFiles((previous) => {
      const uniqueFiles = newFiles.filter(
        (newFile) =>
          !previous.some(
            (file) =>
              file.name === newFile.name &&
              file.size === newFile.size &&
              file.lastModified === newFile.lastModified,
          ),
      );

      return [...previous, ...uniqueFiles];
    });

    setAttachmentOpen(false);
  };

  // Remove attachment
  const removeFile = (index: number) => {
    setSelectedFiles((previous) => previous.filter((_, i) => i !== index));
  };

  // Send message and attachments
  const handleSend = () => {
    const value = message.trim();

    if (!value && selectedFiles.length === 0) return;

    // Send attachments
    selectedFiles.forEach((file) => {
      onAttachment?.(file);
    });

    // Send text
    if (value) {
      onSend(value);
    }

    setMessage("");
    setSelectedFiles([]);
  };

  // Drag and drop handlers
  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounter.current += 1;

    if (event.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounter.current -= 1;

    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    dragCounter.current = 0;
    setIsDragging(false);

    if (event.dataTransfer.files.length > 0) {
      addFiles(event.dataTransfer.files);
    }
  };

  return (
    <div
      className="relative shrink-0 border-t border-[#f0f0f0] bg-white px-6 py-3"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag and drop overlay */}
      {isDragging && (
        <div className="absolute inset-2 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-[#6246ea] bg-[#6246ea]/5">
          <div className="flex flex-col items-center gap-2 text-[#6246ea]">
            <Paperclip size={28} />
            <p className="text-sm font-semibold">Drop files here</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {/* Attached files preview */}
        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-1">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${file.lastModified}-${index}`}
                className="group relative flex max-w-[220px] items-center gap-2 rounded-xl border border-gray-200 bg-[#f9fafb] px-3 py-2"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#6246ea]/10 text-[#6246ea]">
                  {getFileIcon(file)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-[#222]">
                    {file.name}
                  </p>

                  <p className="text-[10px] text-gray-400">
                    {formatFileSize(file.size)}
                  </p>
                </div>

                {/* Remove attachment */}
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  aria-label={`Remove ${file.name}`}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-600 transition hover:bg-red-100 hover:text-red-500"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Message input */}
        <input
          type="text"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type your message..."
          className="w-full bg-transparent text-[14px] text-[#222] outline-none placeholder:text-[#a1a1aa]"
        />

        {/* Bottom actions */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3 text-[#a1a1aa]">
            {/* Attachment button */}
            <div className="relative">
              <button
                type="button"
                aria-label="Add attachment"
                onClick={() => setAttachmentOpen(!attachmentOpen)}
                className="rounded-full cursor-pointer p-1 text-[#9ca3af] transition-colors hover:text-[#6246ea]"
              >
                {attachmentOpen ? <X size={20} /> : <Plus size={20} />}
              </button>

              {attachmentOpen && (
                <div className="absolute bottom-9 left-0 z-30 w-40 rounded-lg border border-gray-200 bg-white p-1.5 shadow-lg">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex w-full cursor-pointer items-center gap-2 rounded px-2.5 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <Paperclip size={15} />
                    Attach files
                  </button>
                </div>
              )}
            </div>

            {/* Hidden file input */}
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files) {
                  addFiles(event.target.files);
                }

                event.target.value = "";
              }}
            />

            {/* Voice */}
            <button
              type="button"
              aria-label="Voice message"
              className="rounded-full p-1 cursor-pointer text-[#9ca3af] transition-colors hover:text-[#4b5563]"
            >
              <Mic size={19} />
            </button>

            {/* Emoji */}
            <button
              type="button"
              aria-label="Insert emoji"
              onClick={() => setMessage((value) => value + "😊")}
              className="rounded-full cursor-pointer p-1 text-[#9ca3af] transition-colors hover:text-[#4b5563]"
            >
              <Smile size={19} />
            </button>

            {/* Sticker */}
            <button
              type="button"
              aria-label="Sticker"
              className="rounded-full cursor-pointer p-1 text-[#9ca3af] transition-colors hover:text-[#4b5563]"
            >
              <StickyNote size={19} />
            </button>
          </div>

          {/* Send button */}
          <button
            type="button"
            aria-label="Send message"
            onClick={handleSend}
            disabled={!message.trim() && selectedFiles.length === 0}
            className={`flex h-9 w-9 items-center justify-center rounded-full  text-[#9ca3af] transition hover:bg-[#6246ea] cursor-pointer hover:text-white disabled:cursor-not-allowed disabled:bg-[#f3f4f6] disabled:text-[#d1d5db] ${!message.trim() && selectedFiles.length === 0 ? "" : "bg-[#6246ea] text-white"}`}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
