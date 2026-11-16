"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/src/lib/supabase/client";

export function useTypingIndicator(
  conversationId: string,
  currentUserId: string,
) {
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);

  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const receiverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSubscribedRef = useRef(false);

  const supabase = createClient();

  const sendTypingEvent = useCallback(
    async (isTyping: boolean) => {
      if (!channelRef.current || !isSubscribedRef.current) return;

      await channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: {
          user_id: currentUserId,
          is_typing: isTyping,
        },
      });
    },
    [currentUserId],
  );

  const notifyTyping = useCallback(() => {
    void sendTypingEvent(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      void sendTypingEvent(false);
    }, 1200);
  }, [sendTypingEvent]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    void sendTypingEvent(false);
  }, [sendTypingEvent]);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const channel = supabase.channel(`talkhub-typing:${conversationId}`);

    channelRef.current = channel;

    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload?.user_id === currentUserId) return;

        if (receiverTimeoutRef.current) {
          clearTimeout(receiverTimeoutRef.current);
        }

        setIsOtherUserTyping(!!payload?.is_typing);

        if (payload?.is_typing) {
          receiverTimeoutRef.current = setTimeout(() => {
            setIsOtherUserTyping(false);
          }, 2500);
        }
      })
      .subscribe((status) => {
        isSubscribedRef.current = status === "SUBSCRIBED";
      });

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (receiverTimeoutRef.current) {
        clearTimeout(receiverTimeoutRef.current);
      }

      isSubscribedRef.current = false;
      channelRef.current = null;

      setIsOtherUserTyping(false);

      void supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, supabase]);

  return {
    isOtherUserTyping,
    notifyTyping,
    stopTyping,
  };
}
