"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useOnlineUsers } from "./useOnlineUsers";
import { ConversationSummary } from "../types/chat";
import { createClient } from "@/src/lib/supabase/client";
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
        .select("conversation_id, user_id, role")
        .in("conversation_id", conversationIds);

      if (membersError) throw membersError;

      // 3. Collect other user IDs.
      const otherUserIds = [
        ...new Set(
          (allMembers || [])
            .filter((member) => member.user_id !== userId)
            .map((member) => member.user_id),
        ),
      ];

      // 4. Fetch other users' profiles.
      const { data: profiles, error: profilesError } = otherUserIds.length
        ? await supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url, phone")
            .in("id", otherUserIds)
        : { data: [], error: null };

      if (profilesError) throw profilesError;

      // 5. Group members by conversation.
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

      // 6. Create a profile lookup map.
      const profilesById = new Map(
        (profiles || []).map((profile) => [profile.id, profile]),
      );

      // 7. Build conversation summaries.
      return summaries.map((conv) => {
        const members = membersByConversation.get(conv.conversation_id) || [];

        const otherMember = members.find((member) => member.user_id !== userId);

        const profile = otherMember
          ? profilesById.get(otherMember.user_id)
          : undefined;

        const name = conv.is_group
          ? conv.title || "Group"
          : profile?.full_name || profile?.username || "User";

        const avatar =
          profile?.avatar_url ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            name,
          )}&background=8b34d7&color=fff`;

        const isDeletedForEveryone =
          conv.last_message_deleted_for_everyone === true;

        const isDeletedForMe = conv.last_message_deleted_for_me === true;

        const isDeleted = isDeletedForEveryone || isDeletedForMe;

        const lastMessageTime = conv.last_message_at
          ? new Date(conv.last_message_at)
          : null;

        return {
          id: conv.conversation_id,
          name,
          avatar,

          is_group: conv.is_group,

          other_user_phone: profile?.phone || null,
          other_user_id: otherMember?.user_id || null,
          other_user_username: profile?.username || null,
          other_user_avatar: profile?.avatar_url || null,

          last_message: isDeletedForEveryone
            ? "This message was deleted"
            : isDeletedForMe
              ? "You deleted this message"
              : conv.last_message_content || "",

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

  // 8. Update online status without refetching conversations.
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
