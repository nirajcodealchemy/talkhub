"use client";

import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/src/lib/supabase/client";

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
//         () => {
//           void queryClient.invalidateQueries({
//             queryKey: ["messages", conversationId],
//             exact: true,
//           });
//         },
//       )
//       .subscribe((status) => {
//         console.log("Messages realtime status:", status);
//       });

//     return () => {
//       void supabase.removeChannel(channel);
//     };
//   }, [conversationId, queryClient, supabase]);
// }

// export function useRealtimeMessages(conversationId: string | null) {
//   const supabase = useMemo(() => createClient(), []);
//   const queryClient = useQueryClient();

//   useEffect(() => {
//     if (!conversationId) return;

//     let channel: ReturnType<typeof supabase.channel> | null = null;
//     let cancelled = false;

//     const setupRealtime = async () => {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser();

//       if (cancelled) return;

//       const currentUserId = user?.id;

//       channel = supabase
//         .channel(`messages:${conversationId}`)
//         .on(
//           "postgres_changes",
//           {
//             event: "*",
//             schema: "public",
//             table: "messages",
//             filter: `conversation_id=eq.${conversationId}`,
//           },
//           (payload) => {
//             const queryKey = ["messages", conversationId];

//             queryClient.setQueryData(queryKey, (old: any) => {
//               if (!old?.pages?.length) return old;

//               const pages = old.pages.map((page: any[]) => [...page]);

//               if (payload.eventType === "INSERT") {
//                 const incoming = payload.new as any;

//                 // Own messages are already handled by useSendMessage.
//                 if (incoming.sender_id === currentUserId) return old;

//                 const alreadyExists = pages.some((page) =>
//                   page.some((message) => message.id === incoming.id),
//                 );

//                 if (alreadyExists) return old;

//                 pages[0].push({
//                   ...incoming,
//                   attachment_url: null,
//                 });
//               }

//               if (payload.eventType === "UPDATE") {
//                 const updated = payload.new as any;

//                 for (const page of pages) {
//                   const index = page.findIndex(
//                     (message) => message.id === updated.id,
//                   );

//                   if (index !== -1) {
//                     page[index] = {
//                       ...page[index],
//                       ...updated,
//                     };
//                   }
//                 }
//               }

//               if (payload.eventType === "DELETE") {
//                 const deletedId = (payload.old as any).id;

//                 for (const page of pages) {
//                   const index = page.findIndex(
//                     (message) => message.id === deletedId,
//                   );

//                   if (index !== -1) {
//                     page.splice(index, 1);
//                   }
//                 }
//               }

//               return {
//                 ...old,
//                 pages,
//               };
//             });
//           },
//         )
//         .subscribe((status, error) => {
//           console.log("Messages realtime status:", status, error);
//         });
//     };

//     void setupRealtime();

//     return () => {
//       cancelled = true;

//       if (channel) {
//         void supabase.removeChannel(channel);
//       }
//     };
//   }, [conversationId, queryClient, supabase]);
// }
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

    const conversationKey = ["conversations", userId];

    const refreshConversations = () => {
      void queryClient.invalidateQueries({
        queryKey: conversationKey,
        exact: true,
      });
    };

    const channel = supabase
      .channel(`global-messages:${userId}`)

      // 1. Listen for new messages.
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

          if (message.sender_id === userId) {
            refreshConversations();

            void queryClient.invalidateQueries({
              queryKey: ["messages", message.conversation_id],
            });

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
          }

          refreshConversations();
        },
      )

      // 2. Listen for message updates (read/delivered status).
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const updated = payload.new as {
            id: string;
            conversation_id: string;
            sender_id: string;
            created_at: string;
            read_at: string | null;
            delivered_at: string | null;
            status?: string;
            is_deleted_for_everyone?: boolean;
          };

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
                  last_message_delivered: !!updated.delivered_at,
                  last_message_read: !!updated.read_at,
                };
              });
            },
          );

          if (updated.is_deleted_for_everyone) {
            void queryClient.invalidateQueries({
              queryKey: ["messages", updated.conversation_id],
              exact: true,
            });

            refreshConversations();
          }
        },
      )

      // 3. Listen for messages deleted for everyone.
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const deletedMessage = payload.old as {
            id?: string;
            conversation_id?: string;
          };

          if (!deletedMessage.id) return;

          // Immediately remove the deleted message from message caches.
          queryClient.setQueriesData(
            {
              queryKey: ["messages"],
            },
            (old: any) => {
              if (!old?.pages) return old;

              return {
                ...old,
                pages: old.pages.map((page: any[]) =>
                  page.filter((message) => message.id !== deletedMessage.id),
                ),
              };
            },
          );

          // Refresh conversation previews.
          refreshConversations();
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
