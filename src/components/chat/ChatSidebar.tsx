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
import { Button } from "@/components/ui/button";

export default function ChatSidebar({
  onSelect,
  onStartChat,
  conversations,
  currentUserId,
  selectedId,
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

  // const usersToDisplay = filteredUsers;
  const usersToDisplay = useMemo(() => {
    const usersWithConversations = filteredUsers.map((user) => {
      const conversation = conversations.find(
        (c) =>
          !c.is_group &&
          (c.other_user_id === user.id ||
            c.name === user.full_name ||
            c.name === user.username),
      );

      return {
        user,
        conversation,
      };
    });

    return usersWithConversations.sort((a, b) => {
      const timeA = a.conversation?.last_message_timestamp
        ? new Date(a.conversation.last_message_timestamp).getTime()
        : 0;

      const timeB = b.conversation?.last_message_timestamp
        ? new Date(b.conversation.last_message_timestamp).getTime()
        : 0;

      return timeB - timeA;
    });
  }, [filteredUsers, conversations]);

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
          <Button
            type="button"
            aria-label={t("moreOptions")}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="cursor-pointer rounded-full p-1.5 text-foreground transition-colors hover:bg-accent bg-white"
          >
            <MoreVertical className="size-6" />
          </Button>

          {isMenuOpen && (
            <div className="absolute right-0 top-10 z-30 w-48 rounded-xl border border-border bg-popover  text-popover-foreground shadow-lg">
              <Button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsCreateGroupOpen(true);
                }}
                className="flex w-full h-[40px] cursor-pointer justify-start items-center gap-2.5 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent"
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
                className="flex w-full h-[40px] cursor-pointer justify-start items-center gap-2.5 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent"
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
                className="flex w-full h-[40px] cursor-pointer justify-start items-center gap-2.5 px-4 py-3 text-left text-sm font-medium text-destructive transition-colors hover:bg-logout-red-light"
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
              className={"h-0 w-0 cursor-pointer"}
              onClick={() => setSearch("")}
              aria-label={t("clearSearch")}
            >
              <X
                size={16}
                className="cursor-pointer bg-muted  text-muted-foreground"
              />
            </Button>
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

        {usersToDisplay.length > 0 ? (
          usersToDisplay.map(({ user, conversation }) => (
            <UserListItem
              key={user.id}
              user={user}
              isCurrentUser={user.id === currentUserId}
              currentUserId={currentUserId}
              isOpening={openingUserId === user.id}
              lastMessageType={conversation?.last_message_type}
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
              lastMessageAt={conversation?.last_message_timestamp ?? null}
              lastMessageSenderId={conversation?.last_message_sender ?? null}
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
          ))
        ) : (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            {t("noUsersFound")}
          </div>
        )}
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
