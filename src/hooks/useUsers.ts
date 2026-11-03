"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/src/lib/supabase/client";

export type ChatUser = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

/**
 * Loads every profile from the `profiles` table, including the currently
 * logged-in user. Filtering/searching is done on the client so the list is
 * available immediately after the first fetch.
 */
export function useUsers() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["chat-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .order("full_name", { ascending: true, nullsFirst: false });

      if (error) throw error;

      return (data ?? []) as ChatUser[];
    },
    staleTime: 30_000,
    retry: 1,
  });
}
