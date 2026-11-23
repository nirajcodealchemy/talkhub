"use client";

import { createClient } from "@/src/lib";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

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

  // Rebuild message subscriptions when the user joins a conversation.
  const [membershipVersion, setMembershipVersion] = useState(0);

  // 1. Refresh membership state when this user's membership changes.
  useEffect(() => {
    if (!userId) return;

    const membershipChannel = supabase
      .channel(`user-memberships:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_members",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          setMembershipVersion((version) => version + 1);

          void queryClient.invalidateQueries({
            queryKey: ["conversations", userId],
            exact: true,
          });
        },
      )
      .subscribe((status) => {
        console.log("Membership realtime status:", status);
      });

    return () => {
      void supabase.removeChannel(membershipChannel);
    };
  }, [userId, supabase, queryClient]);

  // 2. Subscribe only to messages in the user's conversations.
  useEffect(() => {
    if (!userId) return;

    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const conversationKey = ["conversations", userId];

    const refreshConversations = () => {
      void queryClient.invalidateQueries({
        queryKey: conversationKey,
        exact: true,
      });
    };

    const setupSubscriptions = async () => {
      // Fetch only this user's conversation IDs.
      const { data: memberships, error } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", userId);

      if (error) {
        console.error("Failed to fetch conversation memberships:", error);
        return;
      }

      if (!active) return;

      const conversationIds = [
        ...new Set(
          (memberships || []).map((membership) => membership.conversation_id),
        ),
      ];

      if (!conversationIds.length) return;

      let newChannel = supabase.channel(
        `user-conversations:${userId}:${membershipVersion}`,
      );

      for (const conversationId of conversationIds) {
        // INSERT: New messages in this conversation only.
        newChannel = newChannel.on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          async (payload) => {
            const message = payload.new as {
              id: string;
              conversation_id: string;
              sender_id: string;
            };

            if (message.sender_id !== userId) {
              // Mark incoming messages as delivered.
              const { error: deliveryError } = await supabase.rpc(
                "mark_conversation_messages_delivered",
                {
                  p_conversation_id: message.conversation_id,
                },
              );

              if (deliveryError) {
                console.error("Delivery receipt failed:", deliveryError);
              }
            }

            refreshConversations();

            // Refresh message cache if it exists for this conversation.
            void queryClient.invalidateQueries({
              queryKey: ["messages", message.conversation_id],
            });
          },
        );

        // UPDATE: Read receipts, delivery receipts and message edits.
        newChannel = newChannel.on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const updated = payload.new as {
              id: string;
              sender_id: string;
              created_at: string;
              read_at: string | null;
              conversation_id: string;
              delivered_at: string | null;
              content: string;
              message_type: string;
              edited_at: string | null;
              is_deleted_for_everyone?: boolean;
            };

            // Update the latest message indicators immediately.
            queryClient.setQueryData(
              conversationKey,
              (old: any[] | undefined) => {
                if (!old) return old;

                return old.map((conversation) => {
                  if (
                    conversation.id !== updated.conversation_id ||
                    conversation.last_message_timestamp !== updated.created_at
                  ) {
                    return conversation;
                  }

                  return {
                    ...conversation,
                    last_message_delivered: updated.is_deleted_for_everyone
                      ? false
                      : !!updated.delivered_at,
                    last_message_read: updated.is_deleted_for_everyone
                      ? false
                      : !!updated.read_at,
                    last_message: updated.is_deleted_for_everyone
                      ? "This message was deleted"
                      : updated.content,
                    last_message_type: updated.is_deleted_for_everyone
                      ? "deleted"
                      : updated.message_type,
                  };
                });
              },
            );

            // Refresh the summary after edits and deletions so every client
            // gets the current sidebar preview from the conversation query.
            if (updated.edited_at || updated.is_deleted_for_everyone) {
              void queryClient.invalidateQueries({
                queryKey: ["messages", updated.conversation_id],
                exact: true,
              });

              refreshConversations();
            }
          },
        );
      }

      if (!active) return;

      channel = newChannel;

      channel.subscribe((status, error) => {
        console.log("USER CONVERSATIONS REALTIME STATUS:", status, error);
      });
    };

    void setupSubscriptions();

    return () => {
      active = false;

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [userId, supabase, queryClient, membershipVersion]);
}
