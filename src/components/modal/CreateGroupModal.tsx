"use client";

import { Button } from "../ui/button";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Profile } from "@/src/types/profile";
import { getAvatarUrl } from "@/src/utils/avatar";
import { GroupModalProps } from "@/src/types/chat";
import { X, Users, Search, Check } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useSearchUsers,
  useCreateGroupConversation,
} from "@/src/hooks/useChat";

export default function CreateGroupModal({
  isOpen,
  onClose,
  onCreated,
  currentUserId,
}: GroupModalProps) {
  const t = useTranslations("screen.chat.CreateGroupModal");

  const [title, setTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Array<Profile>>([]);

  const titleInputRef = useRef<HTMLInputElement>(null);

  const trimmedSearch = searchQuery.trim();
  const isSearching = trimmedSearch.length > 0;
  const isDebouncingSearch = trimmedSearch !== debouncedQuery;
  const searchUsers = useSearchUsers(
    isSearching ? debouncedQuery : "",
    isOpen && (isSearching ? debouncedQuery.length >= 2 : !isSearchFocused),
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchResults = useMemo(
    () =>
      (searchUsers.data?.pages.flat() ?? []).filter(
        (user) => user.id !== currentUserId,
      ),
    [searchUsers.data, currentUserId],
  );

  const createGroup = useCreateGroupConversation();

  const handleCreate = async () => {
    const groupName = title.trim();

    if (selectedUsers.length < 2) return;
    if (!groupName) {
      titleInputRef.current?.focus();
      return;
    }

    try {
      const conversationId = await createGroup.mutateAsync({
        title: groupName,
        memberIds: selectedUsers.map((user) => user.id),
      });

      setTitle("");
      setSearchQuery("");
      setSelectedUsers([]);
      onCreated?.(conversationId);
      onClose();
    } catch (error) {
      console.error("Group creation failed:", error);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleAddUser = (user: Profile) => {
    if (user.id === currentUserId) return;

    if (selectedUsers.some((u) => u.id === user.id)) return;

    setSelectedUsers((prev) => [...prev, user]);
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleCancel = () => {
    setTitle("");
    setSearchQuery("");
    setDebouncedQuery("");
    setIsSearchFocused(false);
    setSelectedUsers([]);
    onClose();
  };

  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-xl bg-background shadow-xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-chart-4" />

            <h2 className="text-lg font-semibold text-foreground">
              {t("title")}
            </h2>
          </div>

          <Button
            onClick={handleCancel}
            type="button"
            aria-label={t("closeModal")}
            className="cursor-pointer rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-4 p-4">
          {/* Group Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              {t("groupName")}
            </label>

            <input
              ref={titleInputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("groupNamePlaceholder")}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-chart-4 focus:ring-1 focus:ring-chart-4"
            />
          </div>

          {/* Add Members */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              {t("addMembers")}
            </label>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder={t("searchUsersPlaceholder")}
                className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-chart-4 focus:ring-1 focus:ring-chart-4"
              />
            </div>

            {/* User Results */}
            {(!isSearchFocused || trimmedSearch.length >= 2) && (
              <div
                className="mt-2 max-h-60 overflow-y-auto overscroll-contain chat-scrollbar rounded-lg border border-border"
                onScroll={(e) => {
                  const element = e.currentTarget;

                  const isAtBottom =
                    element.scrollHeight -
                      element.scrollTop -
                      element.clientHeight <
                    30;

                  if (
                    isAtBottom &&
                    searchUsers.hasNextPage &&
                    !searchUsers.isFetchingNextPage
                  ) {
                    searchUsers.fetchNextPage();
                  }
                }}
              >
                {isDebouncingSearch || searchUsers.isLoading ? (
                  <p className="p-4 text-center text-xs text-muted-foreground">
                    {t("searching")}
                  </p>
                ) : searchResults.length === 0 ? (
                  <p className="p-4 text-center text-xs text-muted-foreground">
                    {t("noUsersFound")}
                  </p>
                ) : (
                  <>
                    {searchResults.map((user) => {
                      const isSelected = selectedUsers.some(
                        (selected) => selected.id === user.id,
                      );

                      return (
                        <div
                          key={user.id}
                          className="flex cursor-pointer items-center gap-2 border-b border-border p-2 last:border-0 hover:bg-accent"
                          onClick={() => {
                            if (isSelected) {
                              handleRemoveUser(user.id);
                            } else {
                              handleAddUser(user);
                            }
                          }}
                          aria-label={`Select ${user.full_name || user.username}`}
                        >
                          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted">
                            <img
                              src={getAvatarUrl(
                                user.full_name || user.username,
                                user.avatar_url,
                              )}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {user.full_name || user.username}
                            </p>
                          </div>

                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={isSelected}
                            className={`flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border transition-colors ${
                              isSelected
                                ? "border-chart-4 bg-chart-4 text-white"
                                : "border-input bg-background text-transparent hover:border-chart-4"
                            }`}
                          >
                            {isSelected && <Check className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      );
                    })}

                    {searchUsers.isFetchingNextPage && (
                      <p className="p-3 text-center text-xs text-muted-foreground">
                        {t("loadingMoreUsers")}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex h-10 gap-2">
            <Button
              onClick={handleCancel}
              variant="outline"
              className="h-full flex-1 cursor-pointer"
            >
              {t("cancel")}
            </Button>

            <Button
              onClick={handleCreate}
              disabled={
                selectedUsers.length < 2 || createGroup.isPending || !title
              }
              className="h-full flex-1 cursor-pointer bg-chart-4 text-white hover:bg-chart-5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createGroup.isPending ? t("creating") : t("createGroup")}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
