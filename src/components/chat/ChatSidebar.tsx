"use client";

import UserListItem from "./UserListItem";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useUsers } from "@/src/hooks/useUsers";
import { useLogout } from "@/src/hooks/useLogout";
import EditProfileModal from "./EditProfileModal";
import CreateGroupModal from "./CreateGroupModal";
import type { ChatSideBarProps } from "@/src/types/chat";
import { useEffect, useMemo, useRef, useState } from "react";
import { Confirmation } from "@/src/components/modal/ConfirmationModal";
import {
  Loader2,
  LogOut,
  MoreVertical,
  UserRoundPen,
  Search,
  Users,
  X,
} from "lucide-react";

export default function ChatSidebar({
  onSelect,
  onStartChat,
  conversations,
  currentUserId,
}: ChatSideBarProps) {
  const t = useTranslations("screen.chat.ChatSidebar");

  const router = useRouter();
  const logoutMutation = useLogout();

  const [search, setSearch] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
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
      {/* Sidebar Header */}
      <header className="flex h-[64px] shrink-0 items-center justify-between border-b border-border px-4">
        <h1 className="text-[22px] font-bold tracking-tight text-foreground">
          {t("chats")}
        </h1>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-label={t("moreOptions")}
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
                <span>{t("createGroup")}</span>
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
                <span>{t("editProfile")}</span>
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
                <span>{t("logout")}</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Search */}
      <div className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
          <Search size={17} className="shrink-0 text-muted-foreground" />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label={t("clearSearch")}
            >
              <X size={16} className="cursor-pointer text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Users List */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {areUsersLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-chart-4" />
          </div>
        )}

        {!areUsersLoading && usersFailed && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            {t("usersLoadError")}
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
                  lastMessageType={existingConversation?.last_message_type}
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
              {t("noUsersFound")}
            </div>
          ))}
      </div>

      {/* Create Group Modal */}
      {currentUserId && (
        <CreateGroupModal
          isOpen={isCreateGroupOpen}
          onClose={() => setIsCreateGroupOpen(false)}
          currentUserId={currentUserId}
        />
      )}

      {/* Edit Profile Modal */}
      {currentUserId && (
        <EditProfileModal
          isOpen={isEditProfileOpen}
          onClose={() => setIsEditProfileOpen(false)}
          userId={currentUserId}
        />
      )}

      {/* Logout Confirmation */}
      <Confirmation
        isOpen={showLogoutModal}
        title={t("logoutConfirmTitle")}
        message={t("logoutConfirmMessage")}
        confirm={t("logoutConfirmButton")}
        loading={logoutMutation.isPending}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />
    </aside>
  );
}
