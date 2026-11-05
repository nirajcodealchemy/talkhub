"use client";

import { Phone, UserRound, X } from "lucide-react";
import { ConversationModalProps } from "@/src/types/chat";

export default function ConversationInfoModal({
  isOpen,
  userId,
  onClose,
}: ConversationModalProps) {
  if (!isOpen) return null;
  const name = userId?.name || "User";

  const avatar =
    userId?.other_user_avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8b34d7&color=fff`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            Contact Information
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-full p-2 text-muted-foreground hover:bg-muted"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-7">
          <div className="flex flex-col items-center">
            <img
              src={avatar}
              alt={name}
              className="h-24 w-24 rounded-full object-cover"
            />

            <h3 className="mt-4 text-xl font-semibold text-foreground">
              {name}
            </h3>
          </div>

          <div className="mt-7 space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-muted p-4">
              <UserRound size={20} className="text-chart-4" />

              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Full Name</p>
                <p className="truncate text-sm font-medium text-foreground">
                  {userId.name || "Not provided"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-muted p-4">
              <Phone size={20} className="text-chart-4" />

              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Phone Number</p>
                <p className="text-sm font-medium text-foreground">
                  {userId.other_user_phone || "Not provided"}
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* ) : null} */}
      </div>
    </div>
  );
}
