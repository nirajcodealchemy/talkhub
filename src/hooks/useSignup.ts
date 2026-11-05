"use client";

import { SignupFormData } from "@/src/types/form";
import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/src/lib/supabase/client";

export const useSignup = () => {
  return useMutation({
    mutationKey: ["signup"],

    mutationFn: async (values: SignupFormData) => {
      const supabase = createClient();

      // 1. Create the Supabase Auth user.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email.trim(),
        password: values.password,
        options: {
          data: {
            full_name: values.name.trim(),
            phone: values.phone,
          },
        },
      });

      if (authError) throw authError;

      const user = authData.user;

      if (!user) {
        throw new Error("Unable to create your account.");
      }

      // 2. If email confirmation is enabled, the user
      // may not have a session yet.
      if (!authData.session) {
        return {
          status: "confirmation_required" as const,
          message:
            "Account created. Please confirm your email. Your profile should be created by a database trigger.",
        };
      }

      const { data: existingProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id, phone")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        throw profileError;
      }

      if (!existingProfile) {
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            full_name: values.name.trim(),
            phone: values.phone.trim(),
          })
          .select()
          .single();

        if (insertError) {
          console.error("Profile insert error:", insertError);
          throw insertError;
        }
      } else {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            full_name: values.name.trim(),
            phone: values.phone.trim(),
          })
          .eq("id", user.id)
          .select()
          .single();

        if (updateError) {
          console.error("Profile update error:", updateError);
          throw updateError;
        }
      }

      return {
        status: existingProfile
          ? ("profile_exists" as const)
          : ("created" as const),
        message: existingProfile
          ? "Your profile already exists. No duplicate was added."
          : "Registration successful! Your profile has been created.",
      };
    },
  });
};
