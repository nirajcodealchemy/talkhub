// "use client";

// import { useEffect, useMemo } from "react";
// import { createClient } from "@/src/lib/supabase/client";
// import { useQueryClient } from "@tanstack/react-query";

// // ==========================================
// // 1. REALTIME MESSAGES
// // ==========================================

// export function useRealtimeMessages(conversationId: string | null) {
//   const supabase = useMemo(() => createClient(), []);
//   const queryClient = useQueryClient();

//   useEffect(() => {
//     if (!conversationId) return;

//     const channel = supabase
//       .channel(`messages:${conversationId}`)
//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "messages",
//           filter: `conversation_id=eq.${conversationId}`,
//         },
//         (payload) => {
//           console.log("Message realtime event:", payload.eventType);

//           queryClient.invalidateQueries({
//             queryKey: ["messages", conversationId],
//           });

//           queryClient.invalidateQueries({
//             queryKey: ["conversations"],
//           });
//         },
//       )
//       .subscribe((status) => {
//         console.log("Messages realtime status:", status);
//       });

//     return () => {
//       supabase.removeChannel(channel);
//     };
//   }, [conversationId, queryClient, supabase]);
// }

// export function useRealtimeConversations(userId: string) {
//   const supabase = useMemo(() => createClient(), []);
//   const queryClient = useQueryClient();

//   useEffect(() => {
//     if (!userId) return;

//     const refreshConversations = () => {
//       return queryClient.invalidateQueries({
//         queryKey: ["conversations", userId],
//         exact: true,
//       });
//     };

//     const channel = supabase
//       .channel(`global-messages:${userId}`)

//       // Listen to messages from EVERY conversation
//       .on(
//         "postgres_changes",
//         {
//           event: "INSERT",
//           schema: "public",
//           table: "messages",
//         },
//         async (payload) => {
//           const message = payload.new as {
//             id: string;
//             conversation_id: string;
//             sender_id: string;
//             created_at: string;
//           };

//           console.log("New global message:", message);

//           // Never count your own messages as unread.
//           if (message.sender_id === userId) {
//             await refreshConversations();
//             return;
//           }

//           // Immediately refresh the sidebar.
//           await refreshConversations();

//           // Mark as delivered, NOT read.
//           const { error } = await supabase.rpc(
//             "mark_conversation_messages_delivered",
//             {
//               p_conversation_id: message.conversation_id,
//             },
//           );

//           if (error) {
//             console.error("Delivery receipt failed:", error);
//           }

//           // Refresh after delivery status changes.
//           await Promise.all([
//             refreshConversations(),
//             queryClient.invalidateQueries({
//               queryKey: ["messages", message.conversation_id],
//             }),
//           ]);
//         },
//       )

//       // Listen to delivery and read receipt updates.
//       .on(
//         "postgres_changes",
//         {
//           event: "UPDATE",
//           schema: "public",
//           table: "messages",
//         },
//         async (payload) => {
//           const message = payload.new as {
//             conversation_id: string;
//           };

//           await refreshConversations();

//           queryClient.invalidateQueries({
//             queryKey: ["messages", message.conversation_id],
//           });
//         },
//       )

//       .subscribe((status, error) => {
//         console.log("GLOBAL REALTIME STATUS:", status, error);

//         // Sync missed messages after reconnecting.
//         if (status === "SUBSCRIBED") {
//           void refreshConversations();
//         }
//       });

//     return () => {
//       supabase.removeChannel(channel);
//     };
//   }, [userId, supabase, queryClient]);
// }

// // ==========================================
// // 3. TYPING INDICATOR
// // ==========================================

// export function useTypingIndicator(
//   conversationId: string | null,
//   userId: string,
// ) {
//   const supabase = useMemo(() => createClient(), []);

//   useEffect(() => {
//     if (!conversationId || !userId) return;

//     const channel = supabase.channel(`typing:${conversationId}`);

//     channel
//       .on("broadcast", { event: "typing" }, (payload) => {
//         console.log("Typing event:", payload);
//       })
//       .subscribe();

//     return () => {
//       supabase.removeChannel(channel);
//     };
//   }, [conversationId, userId, supabase]);

//   const sendTyping = () => {
//     if (!conversationId) return;

//     supabase.channel(`typing:${conversationId}`).send({
//       type: "broadcast",
//       event: "typing",
//       payload: {
//         userId,
//         typing: true,
//       },
//     });
//   };

//   const stopTyping = () => {
//     if (!conversationId) return;

//     supabase.channel(`typing:${conversationId}`).send({
//       type: "broadcast",
//       event: "typing",
//       payload: {
//         userId,
//         typing: false,
//       },
//     });
//   };

//   return { sendTyping, stopTyping };
// }

"use client";

import { useEffect, useMemo } from "react";
import { createClient } from "@/src/lib/supabase/client";
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
          queryClient.invalidateQueries({
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
            id: string;
            conversation_id: string;
            sender_id: string;
            created_at: string;
          };

          // Refresh the sidebar once for the new message.
          void refreshConversations();

          // Do not mark your own message as delivered.
          if (message.sender_id === userId) return;

          const { error } = await supabase.rpc(
            "mark_conversation_messages_delivered",
            {
              p_conversation_id: message.conversation_id,
            },
          );

          if (error) {
            console.error("Delivery receipt failed:", error);
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
          // Update conversation preview and receipt status.
          void refreshConversations();
        },
      )

      .subscribe((status, error) => {
        console.log("GLOBAL REALTIME STATUS:", status, error);

        if (status === "SUBSCRIBED") {
          void refreshConversations();
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, supabase, queryClient]);
}

// export function useTypingIndicator(
//   conversationId: string | null,
//   userId: string,
// ) {
//   const supabase = useMemo(() => createClient(), []);

//   useEffect(() => {
//     if (!conversationId || !userId) return;

//     const channel = supabase.channel(`typing:${conversationId}`);

//     channel
//       .on("broadcast", { event: "typing" }, (payload) => {
//         console.log("Typing event:", payload);
//       })
//       .subscribe();

//     return () => {
//       void supabase.removeChannel(channel);
//     };
//   }, [conversationId, userId, supabase]);

//   const sendTyping = () => {
//     if (!conversationId) return;

//     supabase.channel(`typing:${conversationId}`).send({
//       type: "broadcast",
//       event: "typing",
//       payload: {
//         userId,
//         typing: true,
//       },
//     });
//   };

//   const stopTyping = () => {
//     if (!conversationId) return;

//     supabase.channel(`typing:${conversationId}`).send({
//       type: "broadcast",
//       event: "typing",
//       payload: {
//         userId,
//         typing: false,
//       },
//     });
//   };

//   return { sendTyping, stopTyping };
// }
