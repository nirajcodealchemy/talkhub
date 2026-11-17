// import { useMutation, useQueryClient } from "@tanstack/react-query";
// import { createClient } from "../lib/supabase/client";

// export function useDeleteMessage() {
//   const supabase = createClient();
//   const queryClient = useQueryClient();

//   return useMutation({
//     mutationKey: ["deleteMessage"],

//     mutationFn: async ({
//       messageId,
//       conversationId,
//       deleteForEveryone,
//     }: {
//       messageId: string;
//       conversationId: string;
//       deleteForEveryone: boolean;
//     }) => {
//       const {
//         data: { user },
//         error: authError,
//       } = await supabase.auth.getUser();

//       if (authError || !user) {
//         throw new Error("You must be logged in.");
//       }

//       if (deleteForEveryone) {
//         const { data, error } = await supabase
//           .from("messages")
//           .delete()
//           .eq("id", messageId)
//           .eq("sender_id", user.id)
//           .select("id")
//           .maybeSingle();

//         if (error) throw error;

//         if (!data) {
//           throw new Error(
//             "You can only delete your own messages for everyone.",
//           );
//         }
//       } else {
//         const { error } = await supabase.from("message_deletions").upsert(
//           {
//             message_id: messageId,
//             user_id: user.id,
//             deleted_at: new Date().toISOString(),
//           },
//           {
//             onConflict: "message_id,user_id",
//           },
//         );

//         if (error) throw error;
//       }

//       return { messageId, conversationId };
//     },

//     onSuccess: ({ messageId, conversationId }) => {
//       const queryKey = ["messages", conversationId];

//       queryClient.setQueryData(queryKey, (old: any) => {
//         if (!old?.pages) return old;

//         return {
//           ...old,
//           pages: old.pages.map((page: any[]) =>
//             page.filter((message) => message.id !== messageId),
//           ),
//         };
//       });

//       void queryClient.invalidateQueries({
//         queryKey,
//         exact: true,
//       });

//       void queryClient.invalidateQueries({
//         queryKey: ["conversations"],
//       });
//     },
//   });
// }

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "../lib/supabase/client";

export function useDeleteMessage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["deleteMessage"],

    mutationFn: async ({
      messageId,
      conversationId,
      deleteForEveryone,
    }: {
      messageId: string;
      conversationId: string;
      deleteForEveryone: boolean;
    }) => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("You must be logged in.");
      }
      console.log("Delete message details:", {
        messageId,
        conversationId,
        deleteForEveryone,
        loggedInUserId: user.id,
      });
      if (deleteForEveryone) {
        // Only the original sender can delete for everyone.
        const { data, error } = await supabase
          .from("messages")
          .update({
            is_deleted_for_everyone: true,
            deleted_at: new Date().toISOString(),
          })
          .eq("id", messageId)
          .eq("sender_id", user.id)
          .select("id")
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          throw new Error(
            "This message could not be deleted. It may not exist, may already be deleted, or may belong to another sender.",
          );
        }
      } else {
        // Hide the message only for the current user.
        const { error } = await supabase.from("message_deletions").upsert(
          {
            message_id: messageId,
            user_id: user.id,
            deleted_at: new Date().toISOString(),
          },
          {
            onConflict: "message_id,user_id",
          },
        );

        if (error) throw error;
      }

      return {
        messageId,
        conversationId,
        deleteForEveryone,
      };
    },

    onSuccess: ({ messageId, conversationId, deleteForEveryone }) => {
      const queryKey = ["messages", conversationId];

      // Keep the message in the cache and mark it as deleted.
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old?.pages) return old;

        return {
          ...old,
          pages: old.pages.map((page: any[]) =>
            page.map((message) => {
              if (message.id !== messageId) return message;

              return deleteForEveryone
                ? {
                    ...message,
                    is_deleted_for_everyone: true,
                  }
                : {
                    ...message,
                    deleted_for_me: true,
                  };
            }),
          ),
        };
      });

      void queryClient.invalidateQueries({
        queryKey,
        exact: true,
      });

      void queryClient.invalidateQueries({
        queryKey: ["conversations"],
      });
    },
  });
}
