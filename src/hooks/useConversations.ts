"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useOnlineUsers } from "./useOnlineUsers";
import { createClient } from "@/src/lib/supabase/client";
import { useRealtimeConversations } from "./useRealtimeChat";

export function useConversations(userId: string) {
  const supabase = useMemo(() => createClient(), []);

  const onlineUserIds = useOnlineUsers(userId);
  // Global listener must stay active on every page
  useRealtimeConversations(userId);

  const query = useQuery({
    queryKey: ["conversations", userId],

    queryFn: async () => {
      // 1. Get current user's memberships
      const { data: memberships, error: memberError } = await supabase
        .from("conversation_members")
        .select("conversation_id, role")
        .eq("user_id", userId);

      if (memberError) throw memberError;

      if (!memberships?.length) return [];

      const conversationIds = [
        ...new Set(memberships.map((m) => m.conversation_id)),
      ];

      // 2. Fetch only conversations belonging to this user
      const { data: conversations, error: convError } = await supabase
        .from("conversations")
        .select(
          `
            id,
            title,
            is_group,
            created_by,
            created_at,
            updated_at
          `,
        )
        .in("id", conversationIds)
        .order("updated_at", { ascending: false });

      if (convError) throw convError;

      // 3. Fetch members of these conversations
      const { data: allMembers, error: allMembersError } = await supabase
        .from("conversation_members")
        .select("conversation_id, user_id, role")
        .in("conversation_id", conversationIds);

      if (allMembersError) throw allMembersError;

      // 4. Fetch messages belonging ONLY to these conversations
      const { data: allMessages, error: messagesError } = await supabase
        .from("messages")
        .select(
          `
    id,
    conversation_id,
    sender_id,
    content,
    message_type,
    created_at,
    read_at,
    delivered_at,
    is_deleted_for_everyone
  `,
        )
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;

      const messageIds = (allMessages || []).map((message) => message.id);

      const { data: deletedForMe, error: deletionError } = messageIds.length
        ? await supabase
            .from("message_deletions")
            .select("message_id")
            .eq("user_id", userId)
            .in("message_id", messageIds)
        : { data: [], error: null };

      if (deletionError) throw deletionError;

      const deletedMessageIds = new Set(
        (deletedForMe || []).map((item) => item.message_id),
      );

      // 5. Fetch other users' profiles
      const otherUserIds = [
        ...new Set(
          (allMembers || [])
            .filter((member) => member.user_id !== userId)
            .map((member) => member.user_id),
        ),
      ];

      const { data: profiles, error: profilesError } = otherUserIds.length
        ? await supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url, phone")
            .in("id", otherUserIds)
        : { data: [], error: null };

      if (profilesError) throw profilesError;

      // 6. Build conversations separately
      return (conversations || []).map((conv) => {
        const members = (allMembers || []).filter(
          (member) => member.conversation_id === conv.id,
        );

        // Get all messages for this conversation
        const messages = (allMessages || []).filter(
          (message) => message.conversation_id === conv.id,
        );

        // IMPORTANT: Get the latest message BEFORE filtering deleted messages.
        const lastMessage = messages[messages.length - 1];

        // Check whether the latest message is deleted
        const isDeletedForEveryone =
          lastMessage?.is_deleted_for_everyone === true;

        const isDeletedForMe = lastMessage
          ? deletedMessageIds.has(lastMessage.id)
          : false;

        // Keep only messages visible to the current user
        const visibleMessages = messages.filter(
          (message) =>
            !message.is_deleted_for_everyone &&
            !deletedMessageIds.has(message.id),
        );

        // Calculate unread messages
        const unreadCount = visibleMessages.filter(
          (message) => message.sender_id !== userId && message.read_at === null,
        ).length;
        // const unreadCount = visibleMessages.filter(
        //   (message) => message.sender_id !== userId && message.read_at === null,
        // ).length;

        const otherMember = members.find((member) => member.user_id !== userId);

        const profile = profiles?.find((p) => p.id === otherMember?.user_id);

        const name = conv.is_group
          ? conv.title || "Group"
          : profile?.full_name || profile?.username || "User";

        const avatar =
          profile?.avatar_url ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8b34d7&color=fff`;

        return {
          id: conv.id,
          name,
          avatar,

          is_group: conv.is_group,
          other_user_id: otherMember?.user_id || null,
          other_user_phone: profile?.phone || null,
          other_user_username: profile?.username || null,
          other_user_avatar: profile?.avatar_url || null,

          // last_message: lastMessage?.content || "",
          last_message: isDeletedForEveryone
            ? "This message was deleted"
            : isDeletedForMe
              ? "You deleted this message"
              : lastMessage?.content || "",

          last_message_type:
            isDeletedForEveryone || isDeletedForMe
              ? "deleted"
              : lastMessage?.message_type || "text",

          last_message_time: lastMessage
            ? new Date(lastMessage.created_at).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })
            : "",

          last_message_timestamp: lastMessage?.created_at ?? "",

          last_message_sender: lastMessage?.sender_id ?? undefined,

          last_message_is_mine: lastMessage?.sender_id === userId,

          // last_message_delivered: !!lastMessage?.delivered_at,
          last_message_delivered:
            !isDeletedForEveryone && !isDeletedForMe
              ? !!lastMessage?.delivered_at
              : false,

          // last_message_read: !!lastMessage?.read_at,
          last_message_read:
            !isDeletedForEveryone && !isDeletedForMe
              ? !!lastMessage?.read_at
              : false,

          unread_count: unreadCount,

          online: false,
          messages: visibleMessages,
        };
      });
    },

    enabled: !!userId,
    staleTime: 30_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

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
