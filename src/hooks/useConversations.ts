"use client";

import { useMemo } from "react";
import { createClient } from "@/src/lib";
import { getAvatarUrl } from "@/src/utils";
import { ConversationSummary } from "../types";
import { useQuery } from "@tanstack/react-query";
import { useOnlineUsers } from "./useOnlineUsers";
import { useRealtimeConversations } from "./useRealtimeChat";

export function useConversations(userId: string) {
  const supabase = useMemo(() => createClient(), []);

  const onlineUserIds = useOnlineUsers(userId);

  // Global listener must stay active on every page.
  useRealtimeConversations(userId);

  const query = useQuery({
    queryKey: ["conversations", userId],

    queryFn: async () => {
      // 1. Fetch conversation summaries from PostgreSQL.
      const { data: summariesData, error: summaryError } = await supabase.rpc(
        "get_user_conversations",
      );

      if (summaryError) throw summaryError;

      const summaries = (summariesData ?? []) as ConversationSummary[];

      if (!summaries.length) return [];

      const conversationIds = summaries.map(
        (conversation) => conversation.conversation_id,
      );

      // 2. Fetch members of these conversations.
      const { data: allMembers, error: membersError } = await supabase
        .from("conversation_members")
        .select("conversation_id, user_id, role,is_banned")
        .in("conversation_id", conversationIds);

      if (membersError) throw membersError;

      const allMemberIds = [
        ...new Set((allMembers || []).map((member) => member.user_id)),
      ];

      // 3. Fetch member profiles.
      const { data: profiles, error: profilesError } = allMemberIds.length
        ? await supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url, phone")
            .in("id", allMemberIds)
        : { data: [], error: null };

      if (profilesError) throw profilesError;

      // 4. Group members by conversation.
      const membersByConversation = new Map<
        string,
        NonNullable<typeof allMembers>
      >();

      (allMembers || []).forEach((member) => {
        const existing =
          membersByConversation.get(member.conversation_id) || [];

        existing.push(member);

        membersByConversation.set(member.conversation_id, existing);
      });

      // 5. Create a profile lookup map.
      const profilesById = new Map(
        (profiles || []).map((profile) => [profile.id, profile]),
      );

      // 6. Build conversation summaries.
      return summaries.map((conv) => {
        const members = membersByConversation.get(conv.conversation_id) || [];

        const otherMember = members.find((member) => member.user_id !== userId);

        const profile = otherMember
          ? profilesById.get(otherMember.user_id)
          : undefined;

        const name = conv.is_group
          ? conv.title || "Group"
          : profile?.full_name || profile?.username || "User";

        // Generate a consistent avatar for groups and individual users.
        const avatar = conv.is_group
          ? conv.avatar_url || getAvatarUrl(name, null)
          : getAvatarUrl(name, profile?.avatar_url);

        // Deleted message states.
        const isDeletedForEveryone =
          conv.last_message_deleted_for_everyone === true;

        const isDeletedForMe = conv.last_message_deleted_for_me === true;

        const isDeleted = isDeletedForEveryone || isDeletedForMe;

        const lastMessageTime = conv.last_message_at
          ? new Date(conv.last_message_at)
          : null;

        // Group members with their profile information.
        const groupMembers = members.map((member) => {
          const memberProfile = profilesById.get(member.user_id);

          return {
            id: member.user_id,
            full_name: memberProfile?.full_name ?? null,
            username: memberProfile?.username ?? null,
            avatar_url: memberProfile?.avatar_url ?? null,
            role: member.role,
            is_banned: member.is_banned,
          };
        });

        return {
          id: conv.conversation_id,
          name,
          avatar,

          is_group: conv.is_group,

          other_user_phone: profile?.phone || null,
          other_user_id: otherMember?.user_id || null,
          other_user_username: profile?.username || null,
          other_user_avatar: profile?.avatar_url || null,
          avatar_url: conv.avatar_url ?? null,
          // Keep message content separate from deletion state.
          last_message: isDeleted ? "" : conv.last_message_content || "",

          is_deleted: isDeleted,
          is_deleted_for_everyone: isDeletedForEveryone,
          is_deleted_for_me: isDeletedForMe,

          last_message_type: isDeleted
            ? "deleted"
            : conv.last_message_type || "text",

          last_message_time: lastMessageTime
            ? lastMessageTime.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })
            : "",

          last_message_timestamp: conv.last_message_at ?? "",

          last_message_sender: conv.last_message_sender_id ?? undefined,

          last_message_is_mine: conv.last_message_sender_id === userId,

          last_message_delivered: !isDeleted
            ? !!conv.last_message_delivered_at
            : false,

          last_message_read: !isDeleted ? !!conv.last_message_read_at : false,

          unread_count: Number(conv.unread_count || 0),

          online: false,

          group_members: conv.is_group ? groupMembers : [],

          group_member_count: conv.is_group ? groupMembers.length : 0,

          // Full message history is loaded separately.
          messages: [],
        };
      });
    },

    enabled: !!userId,
    staleTime: 30_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // 7. Update online status without refetching conversations.
  const conversations = useMemo(() => {
    return (query.data ?? []).map((conversation) => ({
      ...conversation,
      online: conversation.other_user_id
        ? onlineUserIds.has(conversation.other_user_id)
        : false,
    }));
  }, [query.data, onlineUserIds]);

  return {
    ...query,
    data: conversations,
  };
}
