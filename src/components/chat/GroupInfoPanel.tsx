"use client";

import { useMemo, useState } from "react";
import {
  X,
  Search,
  UserPlus,
  LogOut,
  Trash2,
  Users,
  Ban,
  Undo2,
} from "lucide-react";
import type { HeaderProps } from "@/src/types/chat";
import {
  useBanGroupMember,
  useBannedGroupMembers,
  useDeleteGroupConversation,
  useLeaveGroupConversation,
  usePromoteGroupMember,
  useUnbanGroupMember,
} from "@/src/hooks/useChat";

type GroupInfoPanelProps = {
  conversation: HeaderProps["conversation"];
  currentUserId?: string;
  onClose: () => void;
  onGroupExited?: () => void;
  onAddMembers: () => void;
};

type Tab = "members" | "banned";

export default function GroupInfoPanel({
  conversation,
  currentUserId,
  onClose,
  onGroupExited,
  onAddMembers,
}: GroupInfoPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("members");
  const [search, setSearch] = useState("");

  const members = conversation.group_members ?? [];

  const currentMember = members.find((member) => member.id === currentUserId);

  const promoteMember = usePromoteGroupMember();
  const isAdmin = currentMember?.role === "admin";
  const {
    data: bannedMembers = [],
    isLoading: isBannedMembersLoading,
    error: bannedMembersError,
  } = useBannedGroupMembers(conversation.id, isAdmin);
  // const bannedIds = new Set(bannedMembers.map((member) => member.id));

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return members
      .filter((member) => !member.is_banned)
      .filter((member) => {
        if (!query) return true;

        const name = member.full_name || member.username || "";

        return (
          name.toLowerCase().includes(query) ||
          (member.username ?? "").toLowerCase().includes(query)
        );
      });
  }, [members, search]);

  type GroupAction = "leave" | "delete" | "ban" | "unban" | null;

  const [confirmAction, setConfirmAction] = useState<GroupAction>(null);

  const [actionError, setActionError] = useState("");

  const leaveGroup = useLeaveGroupConversation();
  const deleteGroup = useDeleteGroupConversation();

  const banMember = useBanGroupMember();
  const unbanMember = useUnbanGroupMember();

  const isActionPending =
    leaveGroup.isPending ||
    deleteGroup.isPending ||
    banMember.isPending ||
    unbanMember.isPending;

  const [selectedMember, setSelectedMember] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const filteredBannedMembers = bannedMembers.filter((member) => {
    const query = search.trim().toLowerCase();
    const name = member.full_name || member.username || "";

    return (
      !query ||
      name.toLowerCase().includes(query) ||
      (member.username ?? "").toLowerCase().includes(query)
    );
  });

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    setActionError("");

    try {
      if (confirmAction === "leave") {
        await leaveGroup.mutateAsync(conversation.id);
      } else if (confirmAction === "delete") {
        await deleteGroup.mutateAsync(conversation.id);
      } else if (confirmAction === "ban") {
        if (!selectedMember) return;

        await banMember.mutateAsync({
          conversationId: conversation.id,
          memberId: selectedMember.id,
        });
      } else if (confirmAction === "unban") {
        if (!selectedMember) return;

        await unbanMember.mutateAsync({
          conversationId: conversation.id,
          memberId: selectedMember.id,
        });
      }

      setConfirmAction(null);
      setSelectedMember(null);

      if (confirmAction === "leave" || confirmAction === "delete") {
        onClose();
        onGroupExited?.();
      }
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    }
  };
  return (
    // <aside className="relative flex h-full w-[340px] min-w-[340px] max-w-[40%] shrink-0 flex-col overflow-hidden border-l border-border bg-background">
    <aside
      className="
  flex h-full w-full min-w-0 flex-col
  overflow-hidden border-l border-border bg-background
  lg:w-full lg:min-w-0 lg:shrink-0
  
"
    >
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-foreground" />
          <h2 className="font-semibold text-foreground">Group Info</h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close group information"
          className="rounded-full p-2 text-muted-foreground hover:bg-accent"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Group details */}
      <div className="flex shrink-0 flex-col items-center border-b border-border px-4 py-6">
        <img
          src={
            conversation.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              conversation.name || "Group",
            )}&background=8b34d7&color=fff`
          }
          alt={conversation.name}
          className="size-20 rounded-full object-cover"
        />

        <h3 className="mt-3 text-base font-semibold text-foreground">
          {conversation.name}
        </h3>

        <p className="mt-1 text-xs text-muted-foreground">
          {members.filter((member) => !member.is_banned).length} Members
        </p>
      </div>

      {/* Group actions */}
      <div className="shrink-0 space-y-1 border-b border-border p-3">
        {isAdmin && (
          <button
            type="button"
            onClick={onAddMembers}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-chart-4 hover:bg-accent"
          >
            <UserPlus className="size-4" />
            Add Members
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setActionError("");
            setConfirmAction("leave");
          }}
          disabled={isActionPending}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
        >
          <LogOut className="size-4" />
          Leave
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setActionError("");
              setConfirmAction("delete");
            }}
            disabled={isActionPending}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            <Trash2 className="size-4" />
            Delete and Exit
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="grid shrink-0 grid-cols-2 rounded-full bg-muted p-1 mx-3 mt-3">
        <button
          type="button"
          onClick={() => {
            setActiveTab("members");
            setSearch("");
          }}
          className={`rounded-full px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === "members"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          View Members
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("banned");
            setSearch("");
          }}
          className={`rounded-full px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === "banned"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          Banned Members
        </button>
      </div>

      {/* Search */}
      <div className="shrink-0 px-3 py-3">
        <div className="flex items-center gap-2 rounded-full bg-muted px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={
              activeTab === "members"
                ? "Search members"
                : "Search banned members"
            }
            className="h-10 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Member list */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {activeTab === "members" ? (
          filteredMembers.length > 0 ? (
            <div className="space-y-1">
              {filteredMembers.map((member) => {
                const name =
                  member.full_name || member.username || "Unknown user";

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-accent"
                  >
                    <img
                      src={
                        member.avatar_url ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          name,
                        )}&background=8b34d7&color=fff`
                      }
                      alt={name}
                      className="size-9 shrink-0 rounded-full object-cover"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {name}
                        {member.id === currentUserId && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            (You)
                          </span>
                        )}
                      </p>

                      {member.username && (
                        <p className="truncate text-xs text-muted-foreground">
                          @{member.username}
                        </p>
                      )}
                    </div>

                    {member.role === "admin" && (
                      <span className="shrink-0 rounded-full bg-chart-4/15 px-3 py-1 text-[10px] font-medium text-chart-4">
                        Admin
                      </span>
                    )}
                    {isAdmin && member.role !== "admin" && (
                      <button
                        type="button"
                        disabled={promoteMember.isPending}
                        onClick={async () => {
                          try {
                            await promoteMember.mutateAsync({
                              conversationId: conversation.id,
                              memberId: member.id,
                            });
                          } catch (error: any) {
                            console.error("Failed to promote member:", {
                              message: error?.message,
                              code: error?.code,
                              details: error?.details,
                              hint: error?.hint,
                            });
                          }
                        }}
                        className="rounded-full bg-chart-4/10 px-3 py-1 text-xs font-medium text-chart-4 hover:bg-chart-4/20 disabled:opacity-50"
                      >
                        Make Admin
                      </button>
                    )}
                    {isAdmin &&
                      member.id !== currentUserId &&
                      member.role !== "admin" && (
                        <button
                          type="button"
                          disabled={isActionPending}
                          onClick={() => {
                            setSelectedMember({
                              id: member.id,
                              name,
                            });
                            setActionError("");
                            setConfirmAction("ban");
                          }}
                          className="flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
                        >
                          <Ban className="size-3.5" />
                          Ban
                        </button>
                      )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No members found.
            </p>
          )
        ) : !isAdmin ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Only group admins can view banned members.
          </p>
        ) : isBannedMembersLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Loading banned members...
          </p>
        ) : bannedMembersError ? (
          <p className="py-8 text-center text-sm text-destructive">
            Failed to load banned members.
          </p>
        ) : filteredBannedMembers.length > 0 ? (
          <div className="space-y-1">
            {filteredBannedMembers.map((member) => {
              const name =
                member.full_name || member.username || "Unknown user";

              return (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-accent"
                >
                  <img
                    src={
                      member.avatar_url ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8b34d7&color=fff`
                    }
                    alt={name}
                    className="size-9 shrink-0 rounded-full object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {name}
                    </p>
                    {member.username && (
                      <p className="truncate text-xs text-muted-foreground">
                        @{member.username}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isActionPending}
                    onClick={() => {
                      setSelectedMember({ id: member.id, name });
                      setActionError("");
                      setConfirmAction("unban");
                    }}
                    className="flex items-center gap-1 rounded-full bg-chart-4/10 px-3 py-1 text-xs font-medium text-chart-4 hover:bg-chart-4/20 disabled:opacity-50"
                  >
                    <Undo2 className="size-3.5" />
                    Unban
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No banned members found.
          </p>
        )}
      </div>
      {/* Confirmation modal */}
      {confirmAction && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4"
          role="presentation"
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="group-action-title"
            aria-describedby="group-action-description"
            className="w-full max-w-sm rounded-2xl bg-background p-5 shadow-2xl"
          >
            {/* Icon */}
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10">
              {confirmAction === "leave" ? (
                <LogOut className="size-6 text-destructive" />
              ) : (
                <Trash2 className="size-6 text-destructive" />
              )}
            </div>

            {/* Title */}
            <h3
              id="group-action-title"
              className="mt-3 text-center text-base font-semibold text-foreground"
            >
              {confirmAction === "leave"
                ? "Leave this group?"
                : confirmAction === "delete"
                  ? "Delete and exit this group?"
                  : confirmAction === "ban"
                    ? `Ban ${selectedMember?.name}?`
                    : `Unban ${selectedMember?.name}?`}
            </h3>

            {/* Description */}
            <p
              id="group-action-description"
              className="mt-2 text-center text-xs leading-relaxed text-muted-foreground"
            >
              {confirmAction === "leave"
                ? "Are you sure you want to leave this group?"
                : confirmAction === "delete"
                  ? "All members will lose access to this conversation. This action cannot be undone."
                  : confirmAction === "ban"
                    ? "This member will be banned from the group and won't be able to rejoin until an admin unbans them."
                    : "This user will be allowed to join the group again when an admin adds them."}
            </p>

            {/* Error */}
            {actionError && (
              <p className="mt-3 rounded-lg bg-destructive/10 p-2 text-center text-xs text-destructive">
                {actionError}
              </p>
            )}

            {/* Buttons */}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={isActionPending}
                onClick={() => {
                  setConfirmAction(null);
                  setActionError("");
                }}
                className="h-10 flex-1 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isActionPending}
                onClick={handleConfirmAction}
                className="h-10 flex-1 rounded-lg bg-destructive text-sm font-medium text-white hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isActionPending
                  ? "Processing..."
                  : confirmAction === "leave"
                    ? "Leave"
                    : confirmAction === "delete"
                      ? "Delete and Exit"
                      : confirmAction === "ban"
                        ? "Ban Member"
                        : "Unban Member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
