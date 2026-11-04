"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/src/lib/supabase/client";

export function useOnlineUsers(userId: string) {
  const supabase = useMemo(() => createClient(), []);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) {
      setOnlineUserIds(new Set());
      return;
    }

    let active = true;

    const channel = supabase.channel("global-online-users", {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    const updateOnlineUsers = () => {
      if (!active) return;

      const presenceState = channel.presenceState();

      setOnlineUserIds(new Set(Object.keys(presenceState)));
    };

    channel
      .on("presence", { event: "sync" }, updateOnlineUsers)
      .on("presence", { event: "join" }, updateOnlineUsers)
      .on("presence", { event: "leave" }, updateOnlineUsers)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });

          updateOnlineUsers();
        }
      });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  return onlineUserIds;
}
