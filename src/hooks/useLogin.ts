"use client";

import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/src/lib/supabase/client";
import { LoginFormData } from "@/src/types/form";

export function useLogin() {
  return useMutation({
    mutationKey: ["login"],

    mutationFn: async (values: LoginFormData) => {
      const supabase = createClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email.trim(),
        password: values.password,
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error("Unable to authenticate user.");
      }

      return data;
    },
  });
}
