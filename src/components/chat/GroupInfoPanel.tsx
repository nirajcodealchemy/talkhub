/* eslint-disable @next/next/no-img-element */
"use client";

import { createClient } from "@/src/lib";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ChatConversation } from "@/src/types/chat";
import {
  useBanGroupMember,
  useUnbanGroupMember,
  useBannedGroupMembers,
  usePromoteGroupMember,
  useLeaveGroupConversation,
  useDeleteGroupConversation,
} from "@/src/hooks";
import {
  X,
  Users,
  Undo2,
  Search,
  LogOut,
  Camera,
  Trash2,
  UserPlus,
  MoreVertical,
} from "lucide-react";
import { GroupInfoPanelProps, Tab } from "@/src/types/group";
import { getAvatarUrl } from "@/src/utils";

export default function GroupInfoPanel({
  conversation,
  currentUserId,
  onClose,
  onGroupExited,
  onAddMembers,
}: GroupInfoPanelProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("members");
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [savedAvatarUrl, setSavedAvatarUrl] = useState(
    conversation.avatar_url || "",
  );
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(
    null,
  );

  const queryClient = useQueryClient();
  const t = useTranslations("screen.chat.GroupInfoPanel");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const members = conversation.group_members ?? [];

  const currentMember = members.find((member) => member.id === currentUserId);

  const isAdmin = currentMember?.role === "admin";
  const promoteMember = usePromoteGroupMember();
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

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("Please select a JPG, PNG, or WEBP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5 MB.");
      event.target.value = "";
      return;
    }

    setSelectedAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveAvatar = async () => {
    if (!selectedAvatar) return;

    try {
      setIsSavingAvatar(true);

      const supabase = createClient();

      const fileExtension = selectedAvatar.name.split(".").pop();
      const filePath = `${conversation.id}/${Date.now()}.${fileExtension}`;

      // Upload image to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("group-avatars")
        .upload(filePath, selectedAvatar, {
          contentType: selectedAvatar.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public image URL
      const { data } = supabase.storage
        .from("group-avatars")
        .getPublicUrl(filePath);

      const avatarUrl = data.publicUrl;

      // Update group avatar in conversations table through RPC
      const { error: updateError } = await supabase.rpc("update_group_avatar", {
        p_conversation_id: conversation.id,
        p_avatar_url: avatarUrl,
      });

      if (updateError) throw updateError;
      // Keep the local image visible immediately after saving; the public
      // storage URL remains persisted for future sessions.
      setSavedAvatarUrl(avatarPreview || avatarUrl);
      // Keep the sidebar and chat header in sync without remounting the page.
      if (currentUserId) {
        queryClient.setQueryData(
          ["conversations", currentUserId],
          (oldData: ChatConversation[] | undefined) => {
            if (!oldData) return oldData;

            return oldData.map((item) =>
              item.id === conversation.id
                ? {
                    ...item,
                    avatar: avatarUrl,
                    avatar_url: avatarUrl,
                  }
                : item,
            );
          },
        );
      }

      setSelectedAvatar(null);
      setAvatarPreview(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Failed to update group avatar:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to update group avatar.",
      );
    } finally {
      setIsSavingAvatar(false);
    }
  };

  return (
    <aside
      className="flex h-full w-full min-w-0 flex-col overflow-hidden border-l border-border bg-background lg:w-full lg:min-w-0 lg:shrink-0
  
"
    >
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-foreground" />
          <h2 className="font-semibold text-foreground">{t("groupInfo")}</h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={t("closeGroupInfo")}
          className="rounded-full p-2 cursor-pointer text-muted-foreground hover:bg-accent"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Group details */}
      <div className="flex shrink-0 flex-col items-center border-b border-border px-4 py-6">
        {/* Avatar */}
        <div className="relative size-24">
          <img
            src={
              avatarPreview ||
              savedAvatarUrl ||
              getAvatarUrl(conversation.name, null)
            }
            alt={conversation.name}
            className="size-20 rounded-full object-cover"
            onError={(event) => {
              console.error("Avatar failed to load:", event.currentTarget.src);
            }}
          />

          {/* Camera Button */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label={t("changeGroupAvatar")}
              className="absolute cursor-pointer -bottom-1 right-0 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-4 ring-background transition-colors hover:bg-primary/90"
            >
              <Camera className="size-4" />
            </button>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        <h3 className="mt-3 text-base font-semibold text-foreground">
          {conversation.name}
        </h3>

        <p className="mt-1 text-xs text-muted-foreground">
          {members.filter((member) => !member.is_banned).length} Members
        </p>
        {selectedAvatar && (
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedAvatar(null);
                setAvatarPreview(null);

                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              className="rounded-md cursor-pointer border border-border px-4 py-2 text-sm"
            >
              {t("cancel")}
            </button>

            <button
              type="button"
              onClick={handleSaveAvatar}
              disabled={isSavingAvatar}
              className="rounded-md cursor-pointer bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            >
              {isSavingAvatar ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      {/* Group actions */}
      {isAdmin && (
        <div className="shrink-0 space-y-1 border-b border-border p-3">
          <button
            type="button"
            onClick={onAddMembers}
            className="flex w-full items-center cursor-pointer gap-3 rounded-lg px-3 py-2.5 text-sm text-chart-4 hover:bg-accent"
          >
            <UserPlus className="size-4" />
            {t("addMembers")}
          </button>

          <button
            type="button"
            onClick={() => {
              setActionError("");
              setConfirmAction("delete");
            }}
            disabled={isActionPending}
            className="flex w-full items-center cursor-pointer gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            <Trash2 className="size-4" />
            {t("deleteAndExit")}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="grid shrink-0 grid-cols-2 rounded-full bg-muted p-1 mx-3 mt-3">
        <button
          type="button"
          onClick={() => {
            setActiveTab("members");
            setSearch("");
          }}
          className={`rounded-full px-3 py-2 cursor-pointer text-xs font-medium transition-colors ${
            activeTab === "members"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          {t("viewMembers")}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("banned");
            setSearch("");
          }}
          className={`rounded-full cursor-pointer px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === "banned"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          {t("bannedMembers")}
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
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 overscroll-contain chat-scrollbar">
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
                      src={getAvatarUrl(name, member.avatar_url)}
                      alt={name}
                      className="size-9 shrink-0 rounded-full object-cover"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {name}
                        {member.id === currentUserId && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            {t("you")}
                          </span>
                        )}
                      </p>

                      {member.username && (
                        <p className="truncate text-xs text-muted-foreground">
                          @{member.username}
                        </p>
                      )}
                    </div>

                    {member.role === "admin" ? (
                      <span className="shrink-0 rounded-full bg-chart-4/15 px-3 py-1 text-[10px] font-medium text-chart-4">
                        {t("admin")}
                      </span>
                    ) : (
                      isAdmin &&
                      member.id !== currentUserId && (
                        <div className="relative shrink-0">
                          {/* Three-dot menu button */}
                          <button
                            type="button"
                            onClick={() =>
                              setActiveActionMenuId((current) =>
                                current === member.id ? null : member.id,
                              )
                            }
                            aria-label={`Actions for ${name}`}
                            aria-expanded={activeActionMenuId === member.id}
                            className="flex size-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                          >
                            <MoreVertical className="size-5" />
                          </button>

                          {/* Dropdown menu */}
                          {activeActionMenuId === member.id && (
                            <div className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-lg border border-border bg-background p-1 shadow-lg">
                              {/* Make Admin */}
                              <button
                                type="button"
                                disabled={promoteMember.isPending}
                                onClick={async () => {
                                  setActiveActionMenuId(null);

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
                                className="w-full rounded-md cursor-pointer px-3 py-2 text-left text-xs font-medium text-chart-4 hover:bg-accent disabled:opacity-50"
                              >
                                Make Admin
                              </button>

                              {/* Ban */}
                              <button
                                type="button"
                                disabled={isActionPending}
                                onClick={() => {
                                  setActiveActionMenuId(null);
                                  setSelectedMember({
                                    id: member.id,
                                    name,
                                  });
                                  setActionError("");
                                  setConfirmAction("ban");
                                }}
                                className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                              >
                                Ban
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("noMembersFound")}.
            </p>
          )
        ) : !isAdmin ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("onlyGroupAdminsCanViewBannedMembers")}
          </p>
        ) : isBannedMembersLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("loadingBannedMembers")}
          </p>
        ) : bannedMembersError ? (
          <p className="py-8 text-center text-sm text-destructive">
            {t("failedToLoadBannedMembers")}
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
                    src={getAvatarUrl(name, member.avatar_url)}
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
                    className="flex items-center gap-1 cursor-pointer rounded-full bg-chart-4/10 px-3 py-1 text-xs font-medium text-chart-4 hover:bg-chart-4/20 disabled:opacity-50"
                  >
                    <Undo2 className="size-3.5" />
                    {t("unban")}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("noBannedMembersFound")}
          </p>
        )}

        {activeTab === "members" ? (
          <button
            type="button"
            onClick={() => {
              setActionError("");
              setConfirmAction("leave");
            }}
            disabled={isActionPending}
            className="flex w-full items-center cursor-pointer gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            <LogOut className="size-4" />
            {t("leave")}
          </button>
        ) : (
          ""
        )}
      </div>
      {/* Confirmation modal */}
      {confirmAction && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 px-4"
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
                className="h-10 flex-1 cursor-pointer rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isActionPending}
                onClick={handleConfirmAction}
                className="h-10 flex-1 cursor-pointer rounded-lg bg-destructive text-sm font-medium text-white hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isActionPending
                  ? "Processing..."
                  : confirmAction === "leave"
                    ? "Leave"
                    : confirmAction === "delete"
                      ? "Delete and Exit"
                      : confirmAction === "ban"
                        ? t("banMember")
                        : t("unbanMember")}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
