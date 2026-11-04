"use client";

import { useEffect, useState } from "react";
import { Loader2, Phone, UserRound, X } from "lucide-react";
import { createClient } from "@/src/lib/supabase/client";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
};

type Profile = {
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
};

export default function ConversationInfoModal({
  isOpen,
  onClose,
  userId,
}: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !userId) return;

    let cancelled = false;

    async function fetchProfile() {
      setLoading(true);
      setError("");

      const supabase = createClient();

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, phone")
        .eq("id", userId)
        .single();

      if (cancelled) return;

      if (error) {
        console.error("Profile fetch error:", error);
        setError("Unable to load profile information.");
        setProfile(null);
      } else {
        setProfile(data);
      }

      setLoading(false);
    }

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const name = profile?.full_name || "User";

  const avatar =
    profile?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6545db&color=fff`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            Contact Information
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-full p-2 text-muted-foreground hover:bg-muted"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-chart-4" size={26} />
          </div>
        ) : error ? (
          <p className="px-5 py-10 text-center text-sm text-destructive">
            {error}
          </p>
        ) : profile ? (
          <div className="px-5 py-7">
            <div className="flex flex-col items-center">
              <img
                src={avatar}
                alt={name}
                className="h-24 w-24 rounded-full object-cover"
              />

              <h3 className="mt-4 text-xl font-semibold text-foreground">
                {name}
              </h3>
            </div>

            <div className="mt-7 space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-muted p-4">
                <UserRound size={20} className="text-chart-4" />

                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Full Name</p>
                  <p className="truncate text-sm font-medium text-foreground">
                    {profile.full_name || "Not provided"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-muted p-4">
                <Phone size={20} className="text-chart-4" />

                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Phone Number</p>
                  <p className="text-sm font-medium text-foreground">
                    {profile.phone || "Not provided"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
