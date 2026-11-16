"use client";

import { ChatUser } from "../types/chat";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/src/lib/supabase/client";

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
