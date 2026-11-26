"use client";

import { Button } from "../ui";
import UserListItem from "./UserListItem";
import { useRouter } from "next/navigation";
import { ChatSideBarProps } from "@/src/types";
import { formatMessageTime } from "@/src/utils";
import { useLogout, useUsers } from "@/src/hooks";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ConfirmationModal,
  CreateGroupModal,
  EditProfileModal,
} from "../modal";
import {
  X,
  Users,
  LogOut,
  Search,
  Loader2,
  MoreVertical,
  UserRoundPen,
} from "lucide-react";

export default function ChatSidebar({
  onSelect,
  selectedId,
  onStartChat,
  conversations,
  currentUserId,
}: ChatSideBarProps) {
  const t = useTranslations("screen.chat.ChatSidebar");
  const locale = useLocale();

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

  // Close menu when clicking outside.
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

  // Filter and remove duplicate users.
  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    const uniqueUsersMap = new Map<string, (typeof users)[number]>();

    for (const user of users) {
      if (user?.id && !uniqueUsersMap.has(user.id)) {
        uniqueUsersMap.set(user.id, user);
      }
    }

    return Array.from(uniqueUsersMap.values()).filter((user) => {
      if (user.id === currentUserId) return false;

      if (!term) return true;

      const fullName = user.full_name?.toLowerCase() ?? "";
      const username = user.username?.toLowerCase() ?? "";

      return fullName.includes(term) || username.includes(term);
    });
  }, [users, search, currentUserId]);

  // Create one combined list of groups and individual users.
  const chatItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    // Group conversations.
    const groupItems = conversations
      .filter((conversation) => {
        if (!conversation.is_group) return false;

        if (!term) return true;

        return conversation.name?.toLowerCase().includes(term);
      })
      .map((conversation) => ({
        type: "group" as const,
        id: conversation.id,
        conversation,
        timestamp: conversation.last_message_timestamp
          ? new Date(conversation.last_message_timestamp).getTime()
          : new Date(conversation.last_message_timestamp || 0).getTime(),
      }));

    // Individual users and their direct conversations.
    const userItems = filteredUsers.map((user) => {
      const conversation = conversations.find(
        (item) => !item.is_group && item.other_user_id === user.id,
      );

      return {
        type: "user" as const,
        id: user.id,
        user,
        conversation,
        timestamp: conversation?.last_message_timestamp
          ? new Date(conversation.last_message_timestamp).getTime()
          : 0,
      };
    });

    // Keep direct chats and groups together, with the most recently active first.
    return [...groupItems, ...userItems].sort(
      (a, b) => b.timestamp - a.timestamp,
    );
  }, [conversations, filteredUsers, search]);

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
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-r border-border bg-background">
      {/* Sidebar Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
        <h1 className="text-[22px] font-bold tracking-tight text-foreground">
          {t("chats")}
        </h1>

        <div className="relative" ref={menuRef}>
          <Button
            type="button"
            aria-label={t("moreOptions")}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="cursor-pointer rounded-full bg-white p-1.5 text-foreground transition-colors hover:bg-accent"
          >
            <MoreVertical className="size-6" />
          </Button>

          {isMenuOpen && (
            <div className="absolute right-0 top-10 z-30 w-48 rounded-xl border border-border bg-popover text-popover-foreground shadow-lg">
              <Button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsCreateGroupOpen(true);
                }}
                className="flex h-10 w-full cursor-pointer items-center justify-start gap-2.5 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <Users className="h-4 w-4" />
                <span>{t("createGroup")}</span>
              </Button>

              <Button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsEditProfileOpen(true);
                }}
                className="flex h-10 w-full cursor-pointer items-center justify-start gap-2.5 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <UserRoundPen className="h-4 w-4" />
                <span>{t("editProfile")}</span>
              </Button>

              <Button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  setShowLogoutModal(true);
                }}
                className="flex h-10 w-full cursor-pointer items-center justify-start gap-2.5 px-4 py-3 text-left text-sm font-medium text-destructive transition-colors hover:bg-logout-red-light"
              >
                <LogOut className="h-4 w-4" />
                <span>{t("logout")}</span>
              </Button>
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
            <Button
              type="button"
              className="h-0 w-0 cursor-pointer"
              onClick={() => setSearch("")}
              aria-label={t("clearSearch")}
            >
              <X
                size={16}
                className="cursor-pointer bg-muted text-muted-foreground"
              />
            </Button>
          )}
        </div>
      </div>

      {/* Combined Users and Groups List */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain chat-scrollbar">
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
          (chatItems.length > 0 ? (
            chatItems.map((item) => {
              // Group item.
              if (item.type === "group") {
                const group = item.conversation;

                return (
                  <button
                    key={`group-${group.id}`}
                    type="button"
                    onClick={() => onSelect(group.id)}
                    className={`flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent ${
                      selectedId === group.id ? "bg-accent" : ""
                    }`}
                  >
                    {/* Group Avatar */}
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full">
                      {group.avatar_url || group.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={group.avatar_url || group.avatar}
                          alt={group.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-chart-4/10">
                          <Users className="h-5 w-5 text-chart-4" />
                        </div>
                      )}
                    </div>

                    {/* Group Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {group.name}
                        </p>

                        {group.last_message_timestamp && (
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {formatMessageTime(
                              group.last_message_timestamp,
                              locale,
                            )}
                          </span>
                        )}
                      </div>

                      <p className="truncate text-xs text-muted-foreground">
                        {group.last_message || "Group created"}
                      </p>
                    </div>

                    {group.unread_count > 0 && (
                      <div>
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-chart-4 px-1.5 text-xs text-white">
                          {group.unread_count}
                        </span>
                      </div>
                    )}
                    {/* Unread Count */}
                  </button>
                );
              }

              // Individual user item.
              const { user, conversation } = item;

              return (
                <UserListItem
                  user={user}
                  key={`user-${user.id}`}
                  currentUserId={currentUserId}
                  isOpening={openingUserId === user.id}
                  isCurrentUser={false}
                  lastMessageType={conversation?.last_message_type}
                  lastMessageAt={conversation?.last_message_timestamp ?? null}
                  isDeletedForEveryone={conversation?.is_deleted_for_everyone}
                  isDeletedForMe={conversation?.is_deleted_for_me}
                  lastMessageSenderId={
                    conversation?.last_message_sender ?? null
                  }
                  unreadCount={
                    conversation?.id === selectedId
                      ? 0
                      : (conversation?.unread_count ?? 0)
                  }
                  lastMessage={
                    conversation?.last_message === "This message was deleted" ||
                    conversation?.last_message === "You deleted this message"
                      ? null
                      : (conversation?.last_message ?? null)
                  }
                  lastMessageDeliveredAt={
                    conversation?.last_message_delivered ? "delivered" : null
                  }
                  lastMessageReadAt={
                    conversation?.last_message_read ? "read" : null
                  }
                  onClick={() => {
                    if (conversation) {
                      onSelect(conversation.id);
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
          currentUserId={currentUserId}
          onClose={() => setIsCreateGroupOpen(false)}
          onCreated={(conversationId) => {
            onSelect(conversationId);
          }}
        />
      )}

      {/* Edit Profile Modal */}
      {currentUserId && (
        <EditProfileModal
          userId={currentUserId}
          isOpen={isEditProfileOpen}
          onClose={() => setIsEditProfileOpen(false)}
        />
      )}

      {/* Logout Confirmation */}
      <ConfirmationModal
        isOpen={showLogoutModal}
        onConfirm={handleLogout}
        title={t("logoutConfirmTitle")}
        confirm={t("logoutConfirmButton")}
        loading={logoutMutation.isPending}
        message={t("logoutConfirmMessage")}
        onCancel={() => setShowLogoutModal(false)}
      />
    </aside>
  );
}
