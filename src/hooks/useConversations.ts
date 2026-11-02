"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/src/lib/supabase/client";
import { useRealtimeConversations } from "./useRealtimeChat";

export function useConversations(userId: string) {
  const supabase = createClient();
  useRealtimeConversations(userId);

  return useQuery({
    queryKey: ["conversations", userId],
    queryFn: async () => {
      const { data: memberships, error: memberError } = await supabase
        .from("conversation_members")
        .select("conversation_id, role")
        .eq("user_id", userId);

      if (memberError) throw memberError;
      if (!memberships || memberships.length === 0) return [];

      const conversationIds = memberships.map((m) => m.conversation_id);

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

      const conversationsWithDetails = await Promise.all(
        (conversations || []).map(async (conv) => {
          const { data: members } = await supabase
            .from("conversation_members")
            .select("user_id, role")
            .eq("conversation_id", conv.id);

          let name = conv.title || "Chat";
          let avatar = "https://ui-avatars.com/api/?name=Chat&background=6545db&color=fff";

          if (!conv.is_group && members) {
            const otherMember = members.find((m) => m.user_id !== userId);
            if (otherMember) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name, username, avatar_url")
                .eq("id", otherMember.user_id)
                .single();
              if (profile) {
                name = profile.full_name || profile.username || "User";
                avatar =
                  profile.avatar_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6545db&color=fff`;
              }
            }
          } else if (conv.is_group) {
            name = conv.title || "Group";
            avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6545db&color=fff`;
          }

          const { data: lastMsg } = await supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const { data: messages } = await supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: true });

          return {
            id: conv.id,
            name,
            avatar,
            last_message: lastMsg?.content || "",
            last_message_time: lastMsg
              ? new Date(lastMsg.created_at).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "",
            unread_count: 0,
            online: false,
            is_group: conv.is_group,
            last_message_sender: lastMsg?.sender_id === userId ? "You" : undefined,
            messages: messages || [],
          };
        }),
      );

      return conversationsWithDetails;
    },
    enabled: !!userId,
    staleTime: 1000,
    refetchOnMount: true,
  });
}

