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

      if (deleteForEveryone) {
        const { data, error } = await supabase
          .from("messages")
          .delete()
          .eq("id", messageId)
          .eq("sender_id", user.id)
          .select("id")
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          throw new Error(
            "You can only delete your own messages for everyone.",
          );
        }
      } else {
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

      return { messageId, conversationId };
    },

    onSuccess: ({ messageId, conversationId }) => {
      const queryKey = ["messages", conversationId];

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old?.pages) return old;

        return {
          ...old,
          pages: old.pages.map((page: any[]) =>
            page.filter((message) => message.id !== messageId),
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
