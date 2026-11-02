"use client";

import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/src/lib/supabase/client";

export function useLogout() {
  return useMutation({
    mutationKey: ["logout"],
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      return true;
    },
  });
}

