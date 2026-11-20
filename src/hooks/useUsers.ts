"use client";

import { QUERY_KEYS } from "../lib";
import { ChatUser } from "../types";
import { createClient } from "@/src/lib";
import { useQuery } from "@tanstack/react-query";

export function useUsers() {
  const supabase = createClient();

  return useQuery({
    queryKey: QUERY_KEYS.users,
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
