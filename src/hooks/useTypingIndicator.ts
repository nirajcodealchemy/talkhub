"use client";

import { createClient } from "@/src/lib";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useTypingIndicator(
  conversationId: string,
  currentUserId: string,
) {
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);

  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const receiverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSubscribedRef = useRef(false);

  const supabase = useMemo(() => createClient(), []);

  const clearTypingTimeout = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  const clearReceiverTimeout = useCallback(() => {
    if (receiverTimeoutRef.current) {
      clearTimeout(receiverTimeoutRef.current);
      receiverTimeoutRef.current = null;
    }
  }, []);

  const sendTypingEvent = useCallback(
    async (isTyping: boolean) => {
      const channel = channelRef.current;

      if (!channel || !isSubscribedRef.current) return;

      const { error } = await channel.send({
        type: "broadcast",
        event: "typing",
        payload: {
          user_id: currentUserId,
          is_typing: isTyping,
        },
      });

      if (error) {
        console.error("Typing broadcast error:", error);
      }
    },
    [currentUserId],
  );

  const notifyTyping = useCallback(() => {
    void sendTypingEvent(true);

    clearTypingTimeout();

    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
      void sendTypingEvent(false);
    }, 1200);
  }, [sendTypingEvent, clearTypingTimeout]);

  const stopTyping = useCallback(() => {
    clearTypingTimeout();
    void sendTypingEvent(false);
  }, [sendTypingEvent, clearTypingTimeout]);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const channel = supabase.channel(`talkhub-typing:${conversationId}`);

    channelRef.current = channel;

    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload?.user_id === currentUserId) return;

        clearReceiverTimeout();

        const isTyping = Boolean(payload?.is_typing);

        setIsOtherUserTyping(isTyping);

        if (isTyping) {
          receiverTimeoutRef.current = setTimeout(() => {
            receiverTimeoutRef.current = null;
            setIsOtherUserTyping(false);
          }, 2500);
        }
      })
      .subscribe((status) => {
        isSubscribedRef.current = status === "SUBSCRIBED";
      });

    return () => {
      clearTypingTimeout();
      clearReceiverTimeout();

      isSubscribedRef.current = false;

      if (channelRef.current === channel) {
        channelRef.current = null;
      }

      setIsOtherUserTyping(false);

      void supabase.removeChannel(channel);
    };
  }, [
    conversationId,
    currentUserId,
    supabase,
    clearTypingTimeout,
    clearReceiverTimeout,
  ]);

  return {
    isOtherUserTyping,
    notifyTyping,
    stopTyping,
  };
}
