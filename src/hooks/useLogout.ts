"use client";

import { createClient } from "@/src/lib";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["logout"],
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) {
        throw error;
      }
      return true;
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
