import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "../lib";

type SaveReactionInput = {
  messageId: string;
  emoji: string;
};

export function useSaveMessageReaction() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  return useMutation({
    mutationFn: async ({ messageId, emoji }: SaveReactionInput) => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("You must be logged in to react.");

      const { data, error } = await supabase
        .from("message_reactions")
        .upsert(
          {
            message_id: messageId,
            user_id: user.id,
            emoji,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "message_id,user_id" },
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["message-reactions", variables.messageId],
      });
    },
  });
}

export function useMessageReactions(messageId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["message-reactions", messageId],
    enabled: !!messageId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_reactions")
        .select("emoji, user_id")
        .eq("message_id", messageId);

      if (error) throw error;

      return (data ?? []).reduce<Record<string, number>>((counts, row) => {
        counts[row.emoji] = (counts[row.emoji] ?? 0) + 1;
        return counts;
      }, {});
    },
  });
}

const DEFAULT_REACTIONS = ["👍", "❤️", "😂", "😮", "🙏"];

export function useMyTopReactions() {
  const supabase = createClient();
  return useQuery({
    queryKey: ["my-top-reactions"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_top_reactions");

      if (error) throw error;

      const topEmojis = (data ?? []).map((row) => row.emoji);
      return [...topEmojis, ...DEFAULT_REACTIONS]
        .filter((emoji, index, all) => all.indexOf(emoji) === index)
        .slice(0, 5);
    },
  });
}
