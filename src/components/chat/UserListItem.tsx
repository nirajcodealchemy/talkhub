"use client";

import { Loader2 } from "lucide-react";
import type { ChatUser } from "@/src/hooks/useUsers";

type Props = {
  user: ChatUser;
  isCurrentUser: boolean;
  isOpening?: boolean;
  onClick: () => void;
};

export default function UserListItem({
  user,
  isCurrentUser,
  isOpening = false,
  onClick,
}: Props) {
  const name = user.full_name || user.username || "User";
  const avatar =
    user.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6545db&color=fff`;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isCurrentUser || isOpening}
      className="flex h-[68px] w-full cursor-pointer bg-white items-center gap-3 border-b border-[#f0f0f0] px-4 text-left transition-colors hover:bg-[#f9f9f9] disabled:cursor-default disabled:hover:bg-white"
    >
      <div className="relative h-[48px] w-[48px] shrink-0">
        <img
          src={avatar}
          alt={name}
          className="h-full w-full rounded-full object-cover"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-[15px] font-semibold text-[#171717]">
            {name}
          </h3>

          {isCurrentUser && (
            <span className="shrink-0 rounded-full bg-[#6545db]/10 px-2 py-0.5 text-[11px] font-medium text-[#6545db]">
              You
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[13px] text-[#6b6b6b]">
            {user.username ? `@${user.username}` : "Start a conversation"}
          </p>

          {isOpening && (
            <Loader2
              size={15}
              className="shrink-0 animate-spin text-[#6545db]"
            />
          )}
        </div>
      </div>
    </button>
  );
}
