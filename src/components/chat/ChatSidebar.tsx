"use client";

import { MoreVertical, Search, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatConversation } from "@/src/types/chat";
import ChatList from "./ChatList";
import CreateGroupModal from "./CreateGroupModal";

type Props = {
  conversations: ChatConversation[];
  selectedId: string;
  onSelect: (id: string) => void;
  currentUserId?: string;
};

export default function ChatSidebar({
  conversations,
  selectedId,
  onSelect,
  currentUserId,
}: Props) {
  const [search, setSearch] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  const filteredConversations = useMemo(
    () =>
      conversations.filter((conversation) =>
        conversation.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [conversations, search],
  );

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-r border-[#e5e5e5] bg-white">
      <header className="flex h-[64px] shrink-0 items-center justify-between border-b border-[#e5e5e5] px-4">
        <h1 className="text-[22px] font-bold tracking-tight text-[#171717]">
          Chats
        </h1>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-label="More chat options"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="rounded-full p-1.5 text-[#222] hover:bg-gray-100"
          >
            <MoreVertical size={20} />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-10 z-30 w-48 rounded-xl border border-gray-100 bg-white py-1.5 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsCreateGroupOpen(true);
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Users className="h-4 w-4" />
                <span>Create Group</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="shrink-0 px-3 py-2">
        <div className="flex h-9 items-center gap-2 rounded-lg bg-[#f4f4f4] px-2.5">
          <Search size={16} className="shrink-0 text-[#777]" />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search chats"
            className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-500"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <ChatList
          conversations={filteredConversations}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      </div>

      {currentUserId && (
        <CreateGroupModal
          isOpen={isCreateGroupOpen}
          onClose={() => setIsCreateGroupOpen(false)}
          currentUserId={currentUserId}
        />
      )}
    </aside>
  );
}
