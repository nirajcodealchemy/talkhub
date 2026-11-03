// "use client";

// import { useQuery } from "@tanstack/react-query";
// import { createClient } from "@/src/lib/supabase/client";
// import { useRealtimeConversations } from "./useRealtimeChat";

// export function useConversations(userId: string) {
//   const supabase = createClient();

//   useRealtimeConversations(userId);

//   return useQuery({
//     queryKey: ["conversations", userId],
//     queryFn: async () => {
//       const { data: memberships, error: memberError } = await supabase
//         .from("conversation_members")
//         .select("conversation_id, role")
//         .eq("user_id", userId);

//       if (memberError) throw memberError;
//       if (!memberships || memberships.length === 0) return [];

//       const conversationIds = memberships.map((m) => m.conversation_id);

//       const { data: conversations, error: convError } = await supabase
//         .from("conversations")
//         .select(
//           `
//           id,
//           title,
//           is_group,
//           created_by,
//           created_at,
//           updated_at
//         `,
//         )
//         .in("id", conversationIds)
//         .order("updated_at", { ascending: false });

//       if (convError) throw convError;

//       const conversationsWithDetails = await Promise.all(
//         (conversations || []).map(async (conv) => {
//           const { data: members } = await supabase
//             .from("conversation_members")
//             .select("user_id, role")
//             .eq("conversation_id", conv.id);

//           let name = conv.title || "Chat";
//           let avatar =
//             "https://ui-avatars.com/api/?name=Chat&background=6545db&color=fff";
//           let otherUserId: string | null = null;

//           if (!conv.is_group && members) {
//             const otherMember = members.find((m) => m.user_id !== userId);
//             if (otherMember) {
//               otherUserId = otherMember.user_id;
//               const { data: profile } = await supabase
//                 .from("profiles")
//                 .select("full_name, username, avatar_url")
//                 .eq("id", otherMember.user_id)
//                 .single();
//               if (profile) {
//                 name = profile.full_name || profile.username || "User";
//                 avatar =
//                   profile.avatar_url ||
//                   `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6545db&color=fff`;
//               }
//             }
//           } else if (conv.is_group) {
//             name = conv.title || "Group";
//             avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6545db&color=fff`;
//           }

//           const { data: lastMsg } = await supabase
//             .from("messages")
//             .select("*")
//             .eq("conversation_id", conv.id)
//             .order("created_at", { ascending: false })
//             .limit(1)
//             .maybeSingle();

//           const { data: messages } = await supabase
//             .from("messages")
//             .select("*")
//             .eq("conversation_id", conv.id)
//             .order("created_at", { ascending: true });

//           const unreadCount = (messages || []).filter(
//             (message) =>
//               message.sender_id !== userId && message.read_at === null,
//           ).length;

//           const lastMessagePreview =
//             lastMsg?.message_type === "image"
//               ? "Photo"
//               : lastMsg?.message_type === "video"
//                 ? "Video"
//                 : lastMsg?.message_type === "file"
//                   ? lastMsg.attachment_name || lastMsg.content || "Document"
//                   : lastMsg?.content || "";

//           return {
//             id: conv.id,
//             name,
//             avatar,

//             last_message: lastMessagePreview,

//             last_message_time: lastMsg
//               ? new Date(lastMsg.created_at).toLocaleTimeString([], {
//                   hour: "numeric",
//                   minute: "2-digit",
//                 })
//               : "",

//             last_message_type: lastMsg?.message_type || "text",

//             last_message_read: !!lastMsg?.read_at,

//             unread_count: unreadCount,

//             online: false,
//             is_group: conv.is_group,
//             other_user_id: otherUserId,

//             last_message_sender:
//               lastMsg?.sender_id === userId ? "You" : undefined,

//             messages: messages || [],
//           };
//         }),
//       );

//       return conversationsWithDetails;
//     },
//     enabled: !!userId,
//     staleTime: 1000,
//     refetchOnMount: true,
//   });
// }

"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { createClient } from "@/src/lib/supabase/client";
import { useRealtimeConversations } from "./useRealtimeChat";

export function useConversations(userId: string) {
  const supabase = useMemo(() => createClient(), []);

  // Global listener must stay active on every page
  useRealtimeConversations(userId);

  return useQuery({
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
            delivered_at
          `,
        )
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;

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
            .select("id, full_name, username, avatar_url")
            .in("id", otherUserIds)
        : { data: [], error: null };

      if (profilesError) throw profilesError;

      // 6. Build conversations separately
      return (conversations || []).map((conv) => {
        const members = (allMembers || []).filter(
          (member) => member.conversation_id === conv.id,
        );

        // IMPORTANT: Only messages for THIS conversation
        const messages = (allMessages || []).filter(
          (message) => message.conversation_id === conv.id,
        );

        const lastMessage = messages[messages.length - 1];

        const unreadCount = messages.filter(
          (message) =>
            message.conversation_id === conv.id &&
            message.sender_id !== userId &&
            message.read_at === null,
        ).length;

        const otherMember = members.find((member) => member.user_id !== userId);

        const profile = profiles?.find((p) => p.id === otherMember?.user_id);

        const name = conv.is_group
          ? conv.title || "Group"
          : profile?.full_name || profile?.username || "User";

        const avatar =
          profile?.avatar_url ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6545db&color=fff`;

        return {
          id: conv.id,
          name,
          avatar,

          is_group: conv.is_group,
          other_user_id: otherMember?.user_id || null,

          last_message: lastMessage?.content || "",

          last_message_type: lastMessage?.message_type || "text",

          last_message_time: lastMessage
            ? new Date(lastMessage.created_at).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })
            : "",

          last_message_sender:
            lastMessage?.sender_id === userId ? "You" : undefined,

          last_message_read:
            lastMessage?.sender_id === userId ? !!lastMessage.read_at : false,

          unread_count: unreadCount,

          online: false,
          messages,
        };
      });
    },

    enabled: !!userId,
    staleTime: 0,
    refetchOnMount: true,
  });
}
