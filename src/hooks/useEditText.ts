import { createClient } from "../lib";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useEditMessage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["editMessage"],

    mutationFn: async ({
      messageId,
      content,
    }: {
      content: string;
      messageId: string;
      conversationId: string;
    }) => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("You must be logged in.");
      }

      const { data, error } = await supabase
        .from("messages")
        .update({
          content: content.trim(),
          edited_at: new Date().toISOString(),
        })
        .eq("id", messageId)
        .eq("sender_id", user.id)
        .eq("message_type", "text")
        .select()
        .single();

      if (error) throw error;

      return data;
    },

    onSuccess: (updatedMessage, variables) => {
      // Keep the sidebar preview in sync immediately when the edited message
      // is the latest message in this conversation.
      queryClient.setQueriesData(
        { queryKey: ["conversations"] },
        (oldData: any[] | undefined) => {
          if (!oldData) return oldData;

          return oldData.map((conversation) => {
            if (
              conversation.id !== variables.conversationId ||
              conversation.last_message_timestamp !== updatedMessage.created_at
            ) {
              return conversation;
            }

            return {
              ...conversation,
              last_message: updatedMessage.content,
              last_message_type: updatedMessage.message_type,
            };
          });
        },
      );

      void queryClient.invalidateQueries({
        queryKey: ["messages", variables.conversationId],
      });

      void queryClient.invalidateQueries({
        queryKey: ["conversations"],
      });
    },
  });
}
