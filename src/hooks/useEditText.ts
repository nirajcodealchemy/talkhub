import { createClient } from "../lib/supabase/client";
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

    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["messages", variables.conversationId],
      });

      void queryClient.invalidateQueries({
        queryKey: ["conversations"],
      });
    },
  });
}
