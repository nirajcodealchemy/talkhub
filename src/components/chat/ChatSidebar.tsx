"use client";

import {
  Loader2,
  LogOut,
  MoreVertical,
  UserRoundPen,
  Search,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChatConversation } from "@/src/types/chat";
import { useUsers } from "@/src/hooks/useUsers";
import { useLogout } from "@/src/hooks/useLogout";
import EditProfileModal from "./EditProfileModal";
import { Confirmation } from "@/src/components/modal/ConfirmationModal";
import CreateGroupModal from "./CreateGroupModal";
import UserListItem from "./UserListItem";

type Props = {
  conversations: ChatConversation[];
  selectedId: string;
  onSelect: (id: string) => void;
  currentUserId?: string;
  onStartChat?: (userId: string) => void | Promise<void>;
};

export default function ChatSidebar({
  conversations,
  onSelect,
  currentUserId,
  onStartChat,
}: Props) {
  const router = useRouter();
  const logoutMutation = useLogout();

  const [search, setSearch] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [openingUserId, setOpeningUserId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  const {
    data: users = [],
    isLoading: areUsersLoading,
    isError: usersFailed,
  } = useUsers();

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

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    const uniqueUsersMap = new Map<string, (typeof users)[number]>();

    for (const user of users) {
      if (user?.id && !uniqueUsersMap.has(user.id)) {
        uniqueUsersMap.set(user.id, user);
      }
    }

    const uniqueUsers = Array.from(uniqueUsersMap.values());

    return uniqueUsers.filter((user) => {
      if (user.id === currentUserId) return false;

      if (!term) return true;

      const fullName = user.full_name?.toLowerCase() ?? "";
      const username = user.username?.toLowerCase() ?? "";

      return fullName.includes(term) || username.includes(term);
    });
  }, [users, search, currentUserId]);

  const usersToDisplay = filteredUsers;

  async function handleStartChat(userId: string) {
    if (!onStartChat || userId === currentUserId) return;

    try {
      setOpeningUserId(userId);
      await onStartChat(userId);
      setSearch("");
    } catch (error) {
      console.error("Failed to start conversation:", error);
    } finally {
      setOpeningUserId(null);
    }
  }

  async function handleLogout() {
    try {
      await logoutMutation.mutateAsync();
      setShowLogoutModal(false);
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-r border-border bg-background">
      <header className="flex h-[64px] shrink-0 items-center justify-between border-b border-border px-4">
        <h1 className="text-[22px] font-bold tracking-tight text-foreground">
          Chats
        </h1>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-label="More chat options"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="cursor-pointer rounded-full p-1.5 text-foreground transition-colors hover:bg-accent"
          >
            <MoreVertical size={20} />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-10 z-30 w-48 rounded-xl border border-border bg-popover py-1.5 text-popover-foreground shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsCreateGroupOpen(true);
                }}
                className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <Users className="h-4 w-4" />
                <span>Create Group</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsEditProfileOpen(true);
                }}
                className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <UserRoundPen className="h-4 w-4" />
                <span>Edit Profile</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  setShowLogoutModal(true);
                }}
                className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2 text-left text-sm font-medium text-destructive transition-colors hover:bg-logout-red-light"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
          <Search size={17} className="shrink-0 text-muted-foreground" />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users or conversations..."
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <X size={16} className="text-muted-foreground cursor-pointer" />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {areUsersLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-chart-4" />
          </div>
        )}

        {!areUsersLoading && usersFailed && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Could not load users.
          </div>
        )}

        {!areUsersLoading &&
          !usersFailed &&
          (usersToDisplay.length > 0 ? (
            usersToDisplay.map((user) => {
              const existingConversation = conversations.find(
                (c) =>
                  !c.is_group &&
                  (c.other_user_id === user.id ||
                    c.name === user.full_name ||
                    c.name === user.username),
              );

              return (
                <UserListItem
                  key={user.id}
                  user={user}
                  isCurrentUser={user.id === currentUserId}
                  currentUserId={currentUserId}
                  isOpening={openingUserId === user.id}
                  unreadCount={existingConversation?.unread_count ?? 0}
                  lastMessage={existingConversation?.last_message ?? null}
                  lastMessageAt={
                    existingConversation?.last_message_timestamp ?? null
                  }
                  lastMessageSenderId={
                    existingConversation?.last_message_sender ?? null
                  }
                  lastMessageDeliveredAt={
                    existingConversation?.last_message_delivered
                      ? "delivered"
                      : null
                  }
                  lastMessageReadAt={
                    existingConversation?.last_message_read ? "read" : null
                  }
                  onClick={() => {
                    if (existingConversation) {
                      onSelect(existingConversation.id);
                    } else {
                      handleStartChat(user.id);
                    }
                  }}
                />
              );
            })
          ) : (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              No users found.
            </div>
          ))}
      </div>

      {currentUserId && (
        <CreateGroupModal
          isOpen={isCreateGroupOpen}
          onClose={() => setIsCreateGroupOpen(false)}
          currentUserId={currentUserId}
        />
      )}

      {currentUserId && (
        <EditProfileModal
          isOpen={isEditProfileOpen}
          onClose={() => setIsEditProfileOpen(false)}
          userId={currentUserId}
        />
      )}

      <Confirmation
        isOpen={showLogoutModal}
        title="Logout"
        message="Are you sure you want to log out?"
        confirm="Logout"
        loading={logoutMutation.isPending}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />
    </aside>
  );
}
