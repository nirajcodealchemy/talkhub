"use client";

import { useEffect, useMemo } from "react";
import { createClient } from "@/src/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

// ==========================================
// 1. REALTIME MESSAGES
// ==========================================

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
        (payload) => {
          console.log("Message realtime event:", payload.eventType);

          queryClient.invalidateQueries({
            queryKey: ["messages", conversationId],
          });

          queryClient.invalidateQueries({
            queryKey: ["conversations"],
          });
        },
      )
      .subscribe((status) => {
        console.log("Messages realtime status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient, supabase]);
}

// ==========================================
// 2. REALTIME CONVERSATIONS + MESSAGES
// ==========================================

// export function useRealtimeConversations(userId: string) {
//   const supabase = useMemo(() => createClient(), []);
//   const queryClient = useQueryClient();

//   useEffect(() => {
//     if (!userId) return;

//     const channel = supabase
//       .channel(`user-conversations:${userId}`)

//       // 1. Listen for NEW messages from every conversation
//       .on(
//         "postgres_changes",
//         {
//           event: "INSERT",
//           schema: "public",
//           table: "messages",
//         },
//         async (payload) => {
//           const newMessage = payload.new as {
//             id: string;
//             conversation_id: string;
//             sender_id: string;
//             content: string;
//           };

//           console.log("GLOBAL NEW MESSAGE:", newMessage);

//           // Refresh sidebar immediately
//           await queryClient.invalidateQueries({
//             queryKey: ["conversations", userId],
//           });

//           // If another user sent this message,
//           // update its delivery status.
//           if (newMessage.sender_id !== userId) {
//             const { data, error } = await supabase.rpc(
//               "mark_conversation_messages_delivered",
//               {
//                 p_conversation_id: newMessage.conversation_id,
//               },
//             );

//             if (error) {
//               console.error("Delivery error:", error);
//             } else {
//               console.log("Delivered messages:", data);
//             }
//           }

//           // Refresh sidebar after delivery update
//           await queryClient.invalidateQueries({
//             queryKey: ["conversations", userId],
//           });

//           // Refresh message queries
//           await queryClient.invalidateQueries({
//             queryKey: ["messages"],
//           });
//         },
//       )

//       // 2. Listen for delivery/read status changes
//       .on(
//         "postgres_changes",
//         {
//           event: "UPDATE",
//           schema: "public",
//           table: "messages",
//         },
//         (payload) => {
//           console.log("MESSAGE STATUS CHANGED:", payload.new);

//           queryClient.invalidateQueries({
//             queryKey: ["messages"],
//           });

//           queryClient.invalidateQueries({
//             queryKey: ["conversations", userId],
//           });
//         },
//       )

//       // 3. Conversation updates
//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "conversations",
//         },
//         () => {
//           queryClient.invalidateQueries({
//             queryKey: ["conversations", userId],
//           });
//         },
//       )

//       // 4. Membership updates
//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "conversation_members",
//         },
//         () => {
//           queryClient.invalidateQueries({
//             queryKey: ["conversations", userId],
//           });
//         },
//       )

//       .subscribe((status, error) => {
//         console.log("GLOBAL REALTIME STATUS:", status, error);
//       });

//     return () => {
//       supabase.removeChannel(channel);
//     };
//   }, [userId, supabase, queryClient]);
// }

export function useRealtimeConversations(userId: string) {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    let active = true;

    const channel = supabase
      .channel(`all-user-messages:${userId}`)

      // New messages from ANY conversation
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const message = payload.new as {
            id: string;
            conversation_id: string;
            sender_id: string;
          };

          console.log("GLOBAL MESSAGE INSERT:", message);

          // Immediately refresh sidebar
          await queryClient.invalidateQueries({
            queryKey: ["conversations", userId],
          });

          // Receiver gets delivery receipt
          if (message.sender_id !== userId) {
            const { data, error } = await supabase.rpc(
              "mark_conversation_messages_delivered",
              {
                p_conversation_id: message.conversation_id,
              },
            );

            if (error) {
              console.error("Delivery RPC error:", error);
            } else {
              console.log("Delivery updated:", data);
            }
          }

          if (!active) return;

          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: ["messages"],
            }),
            queryClient.invalidateQueries({
              queryKey: ["conversations", userId],
            }),
          ]);
        },
      )

      // Delivery and read receipts
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          console.log("GLOBAL MESSAGE UPDATE:", payload.new);

          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: ["messages"],
            }),
            queryClient.invalidateQueries({
              queryKey: ["conversations", userId],
            }),
          ]);
        },
      )

      .subscribe((status, error) => {
        console.log("GLOBAL CHANNEL:", status, error);
      });

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, queryClient]);
}

// ==========================================
// 3. TYPING INDICATOR
// ==========================================

export function useTypingIndicator(
  conversationId: string | null,
  userId: string,
) {
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!conversationId || !userId) return;

    const channel = supabase.channel(`typing:${conversationId}`);

    channel
      .on("broadcast", { event: "typing" }, (payload) => {
        console.log("Typing event:", payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId, supabase]);

  const sendTyping = () => {
    if (!conversationId) return;

    supabase.channel(`typing:${conversationId}`).send({
      type: "broadcast",
      event: "typing",
      payload: {
        userId,
        typing: true,
      },
    });
  };

  const stopTyping = () => {
    if (!conversationId) return;

    supabase.channel(`typing:${conversationId}`).send({
      type: "broadcast",
      event: "typing",
      payload: {
        userId,
        typing: false,
      },
    });
  };

  return { sendTyping, stopTyping };
}
