"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/src/lib/supabase/client";

export function useConversations(userId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["conversations", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select(
          `
          id,
          title,
          is_group,
          created_by,
          created_at,
          updated_at,
          conversation_members!inner(
            user_id,
            role
          )
        `,
        )
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useCreateDirectConversation() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["createDirectConversation"],
    mutationFn: async (otherUserId: string) => {
      const { data, error } = await supabase.rpc("create_direct_conversation", {
        p_other_user_id: otherUserId,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useCreateGroupConversation() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["createGroupConversation"],
    mutationFn: async ({
      title,
      memberIds,
    }: {
      title: string;
      memberIds: string[];
    }) => {
      const { data, error } = await supabase.rpc("create_group_conversation", {
        p_title: title,
        p_member_ids: memberIds,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useSearchUsers() {
  const supabase = createClient();

  return useMutation({
    mutationKey: ["searchUsers"],
    mutationFn: async (query: string) => {
      const { data, error } = await supabase.rpc("search_chat_users", {
        p_query: query,
      });

      if (error) throw error;
      return data;
    },
  });
}

export function useMessages(conversationId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });
}

export function useSendMessage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["sendMessage"],
    mutationFn: async (message: {
      conversationId: string;
      content: string;
      messageType?: "text" | "image" | "file";
    }) => {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: message.conversationId,
          sender_id: (await supabase.auth.getUser()).data.user?.id,
          content: message.content,
          message_type: message.messageType || "text",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", variables.conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
