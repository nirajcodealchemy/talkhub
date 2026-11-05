"use client";

import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/src/lib/supabase/client";

export function useRealtimeMessages(conversationId: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: ["messages", conversationId],
            exact: true,
          });
        },
      )
      .subscribe((status) => {
        console.log("Messages realtime status:", status);
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient, supabase]);
}

export function useRealtimeConversations(userId: string) {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const refreshConversations = () =>
      queryClient.invalidateQueries({
        queryKey: ["conversations", userId],
        exact: true,
      });

    const channel = supabase
      .channel(`global-messages:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const message = payload.new as {
            conversation_id: string;
            sender_id: string;
          };

          if (message.sender_id === userId) {
            void refreshConversations();
            return;
          }

          const { error } = await supabase.rpc(
            "mark_conversation_messages_delivered",
            {
              p_conversation_id: message.conversation_id,
            },
          );

          if (error) {
            console.error("Delivery receipt failed:", error);
            void refreshConversations();
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        () => {
          void refreshConversations();
        },
      )
      .subscribe((status, error) => {
        console.log("GLOBAL REALTIME STATUS:", status, error);
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, supabase, queryClient]);
}
