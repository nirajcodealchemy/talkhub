/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import { getAvatarUrl } from "@/src/utils";
import { useTranslations } from "next-intl";
import { useAddGroupMembers } from "@/src/hooks";
import { AddMembersPanelProps } from "@/src/types";
import { ArrowLeft, Search, Users } from "lucide-react";

export default function AddMembersPanel({
  users,
  onBack,
  onAdded,
  currentUserId,
  conversationId,
  existingMemberIds,
}: AddMembersPanelProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const t = useTranslations("screen.AddMember");

  const addMembers = useAddGroupMembers();

  const availableUsers = useMemo(() => {
    const existingIds = new Set([...existingMemberIds, currentUserId]);

    return users.filter((user) => !existingIds.has(user.id));
  }, [users, existingMemberIds, currentUserId]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return availableUsers;

    return availableUsers.filter((user) => {
      const name = user.full_name || user.username || "";

      return (
        name.toLowerCase().includes(query) ||
        (user.username ?? "").toLowerCase().includes(query)
      );
    });
  }, [availableUsers, search]);

  const toggleUser = (userId: string) => {
    setSelectedIds((previous) =>
      previous.includes(userId)
        ? previous.filter((id) => id !== userId)
        : [...previous, userId],
    );
  };

  const handleAddMembers = async () => {
    if (!selectedIds.length) return;

    try {
      await addMembers.mutateAsync({
        conversationId,
        memberIds: selectedIds,
      });

      setSelectedIds([]);
      onAdded();
    } catch (error) {
      console.error("Failed to add group members:", error);
    }
  };

  return (
    <aside className="flex h-full w-full min-w-0 flex-col overflow-hidden border-l border-border bg-background">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to group information"
          className="rounded-full cursor-pointer p-1 hover:bg-accent"
        >
          <ArrowLeft className="size-5" />
        </button>

        <h2 className="text-sm font-semibold text-foreground">
          {t("addMembers")}
        </h2>
      </div>

      {/* Search */}
      <div className="shrink-0 p-3">
        <div className="flex h-10 items-center gap-2 rounded-full bg-muted px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-xs text-muted-foreground"
            >
              {t("clear")}
            </button>
          )}
        </div>
      </div>

      {/* Users */}
      <div className="min-h-0 flex-1 overflow-y-auto chat-scrollbar px-3">
        {filteredUsers.length > 0 ? (
          <div className="space-y-1">
            {filteredUsers.map((user) => {
              const name = user.full_name || user.username || "Unknown user";

              const isSelected = selectedIds.includes(user.id);

              return (
                <label
                  key={user.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-1 py-2.5 hover:bg-accent"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleUser(user.id)}
                    className="size-4 shrink-0 cursor-pointer accent-chart-4"
                  />

                  <img
                    src={
                      user.avatar_url ||
                      getAvatarUrl(user.username, user.avatar_url)
                    }
                    alt={name}
                    className="size-9 shrink-0 rounded-full object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {name}
                    </p>

                    {user.username && (
                      <p className="truncate text-xs text-muted-foreground">
                        @{user.username}
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Users className="size-8 text-muted-foreground" />

            <p className="text-sm font-medium text-foreground">
              {t("noUsersFound")}
            </p>

            <p className="text-xs text-muted-foreground">
              {t("tryAnotherSearch")}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-border p-3">
        <button
          type="button"
          onClick={handleAddMembers}
          disabled={!selectedIds.length || addMembers.isPending}
          className="h-10 w-full cursor-pointer rounded-lg bg-chart-4 text-sm font-medium text-white transition-colors hover:bg-chart-5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {addMembers.isPending
            ? "Adding Members..."
            : `Add ${selectedIds.length} Members`}
        </button>
      </div>
    </aside>
  );
}
