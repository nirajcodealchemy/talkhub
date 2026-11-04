// "use client";

// import { useEffect, useMemo, useRef, useState } from "react";
// import { useQueryClient } from "@tanstack/react-query";

// import type { ChatConversation } from "@/src/types/chat";

// import ChatLayout from "./ChatLayout";
// import { createClient } from "@/src/lib/supabase/client";

// import MessageIcon from "@/src/components/icons/Message";
// import ChatWindow from "@/src/components/chat/ChatWindow";
// import ChatSidebar from "@/src/components/chat/ChatSidebar";

// import { useConversations } from "@/src/hooks/useConversations";
// import { useRealtimeMessages } from "@/src/hooks/useRealtimeChat";

// import {
//   useSendMessage,
//   useSendAttachment,
//   useMessages,
//   useCreateDirectConversation,
// } from "@/src/hooks/useChat";

// type Props = {
//   currentUserId?: string;
// };

// export default function ChatScreen({ currentUserId = "" }: Props) {
//   // ==========================================
//   // CLIENTS
//   // ==========================================

//   const supabase = useMemo(() => createClient(), []);
//   const queryClient = useQueryClient();

//   // ==========================================
//   // CONVERSATIONS
//   // ==========================================

//   const {
//     data: dbConversations,
//     isLoading,
// //   } = useConversations(currentUserId);

//   // React Query is the single source of truth
//   const conversations = (dbConversations ?? []) as ChatConversation[];

//   // ==========================================
//   // MUTATIONS
//   // ==========================================

//   const { mutateAsync: sendMessage } = useSendMessage();

//   const { mutateAsync: sendAttachment } = useSendAttachment();

//   const { mutateAsync: createDirectConversation } =
//     useCreateDirectConversation();

//   // ==========================================
//   // SELECTED CONVERSATION
//   // ==========================================

//   const [selectedId, setSelectedId] = useState<string>("");
  const lastReadRequestKey = useRef<string | null>(null);

//   // ==========================================
//   // MESSAGES
//   // ==========================================

//   const { data: dbMessages, isLoading: isMessagesLoading } =
//     useMessages(selectedId);

//   // Listen to selected conversation messages
//   useRealtimeMessages(selectedId || null);

//   // ==========================================
//   // MARK INCOMING MESSAGES AS READ

  const unreadMessageIds = (dbMessages ?? [])
    .filter(
      (message) => message.sender_id !== currentUserId && !message.read_at,
    )
    .map((message) => message.id);

  const unreadMessageKey = unreadMessageIds.join(",");

  useEffect(() => {
    if (!selectedId || !currentUserId || !unreadMessageKey) return;

    const requestKey = `${selectedId}:${unreadMessageKey}`;

    if (lastReadRequestKey.current === requestKey) return;

    lastReadRequestKey.current = requestKey;
    let cancelled = false;

    const markMessagesAsRead = async () => {
      const { error } = await supabase.rpc(
        "mark_conversation_messages_read",
        {
          p_conversation_id: selectedId,
        },
      );

      if (error) {
        console.error("Read receipt error:", error);
        if (lastReadRequestKey.current === requestKey) {
          lastReadRequestKey.current = null;
        }
        return;
      }

      if (cancelled) return;
    };

    void markMessagesAsRead().catch((error) => {
      console.error("Read receipt error:", error);
      if (lastReadRequestKey.current === requestKey) {
        lastReadRequestKey.current = null;
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedId, currentUserId, unreadMessageKey, supabase]);

  // SELECTED CONVERSATION DATA
//   // ==========================================

//   const selectedConversation = conversations.find(
//     (conversation) => conversation.id === selectedId,
//   );

//   const conversationWithMessages = selectedConversation
//     ? {
//         ...selectedConversation,
//         messages: dbMessages ?? [],
//       }
//     : null;

//   // ==========================================
//   // SELECT CONVERSATION
//   // ==========================================

//   function handleSelect(id: string) {
//     if (id === selectedId) return;

//     setSelectedId(id);
//   }

//   // ==========================================
//   // START DIRECT CONVERSATION
//   // ==========================================

//   async function handleStartChat(userId: string) {
//     try {
//       if (!userId || userId === currentUserId) return;

//       const conversationId = await createDirectConversation(userId);

//       // Refresh sidebar
// //       // Open conversation
//       setSelectedId(conversationId);
//     } catch (error) {
//       console.error("Failed to start conversation:", error);
//     }
//   }

//   // ==========================================
//   // SEND TEXT MESSAGE
//   // ==========================================

//   async function handleSend(content: string) {
//     if (!selectedId || !content.trim()) return;

//     try {
//       await sendMessage({
//         conversationId: selectedId,
//         content: content.trim(),
//         messageType: "text",
//       });

//       // Refresh messages and sidebar
//       await Promise.all([
//         queryClient.invalidateQueries({
//           queryKey: ["messages", selectedId],
//         }),

//         queryClient.invalidateQueries({
//           queryKey: ["conversations", currentUserId],
//         }),
//       ]);
//     } catch (error) {
//       console.error("Message sending failed:", error);
//     }
//   }

//   // ==========================================
//   // SEND IMAGE / FILE ATTACHMENT
//   // ==========================================

//   async function handleAttachment(file: File) {
//     if (!selectedId || !file) return;

//     try {
//       await sendAttachment({
//         conversationId: selectedId,
//         file,
//       });

//       // Refresh messages and sidebar
//       await Promise.all([
//         queryClient.invalidateQueries({
//           queryKey: ["messages", selectedId],
//         }),

//         queryClient.invalidateQueries({
//           queryKey: ["conversations", currentUserId],
//         }),
//       ]);
//     } catch (error) {
//       console.error("Attachment upload failed:", error);
//     }
//   }

//   // ==========================================
//   // LOADING
//   // ==========================================

//   if (isLoading) {
//     return (
//       <ChatLayout>
//         <div className="flex h-full w-full items-center justify-center">
//           <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#6545db] border-t-transparent" />
//         </div>
//       </ChatLayout>
//     );
//   }

//   // ==========================================
//   // UI
//   // ==========================================

//   return (
//     <ChatLayout>
//       {/* LEFT PANEL - CHAT SIDEBAR */}
//       <div
//         className={`h-full w-full shrink-0 md:block md:w-[29.1%] md:min-w-[320px] md:max-w-[420px] ${
//           selectedId ? "hidden" : "block"
//         }`}
//       >
//         <ChatSidebar
//           conversations={conversations}
//           selectedId={selectedId}
//           onSelect={handleSelect}
//           currentUserId={currentUserId}
//           onStartChat={handleStartChat}
//         />
//       </div>

//       {/* RIGHT PANEL - CHAT WINDOW */}
//       <div
//         className={`h-full min-h-0 min-w-0 flex-1 ${
//           selectedId ? "flex" : "hidden"
//         } md:flex`}
//       >
//         {conversationWithMessages ? (
//           <ChatWindow
//             conversation={conversationWithMessages}
//             currentUserId={currentUserId}
//             onSend={handleSend}
//             onAttachment={handleAttachment}
//             onBack={() => setSelectedId("")}
//           />
//         ) : (
//           <div className="hidden flex-1 flex-col items-center justify-center bg-[#f4f4f5] px-6 text-center md:flex">
//             <div className="mb-6 flex h-24 w-24 items-center justify-center opacity-75">
//               <MessageIcon />
//             </div>

//             <h2 className="text-[17px] font-bold text-gray-900">
//               Welcome to Your Conversations
//             </h2>

//             <p className="mt-2 max-w-[320px] text-[13px] leading-relaxed text-gray-500">
//               Select a chat from the list to start exploring your messages or
//               begin a new conversation.
//             </p>
//           </div>
//         )}
//       </div>
//     </ChatLayout>
//   );
// }

"use client";

import { useEffect, useMemo, useState } from "react";

import type { ChatConversation } from "@/src/types/chat";

import ChatLayout from "./ChatLayout";
import { createClient } from "@/src/lib/supabase/client";

import MessageIcon from "@/src/components/icons/Message";
import ChatWindow from "@/src/components/chat/ChatWindow";
import ChatSidebar from "@/src/components/chat/ChatSidebar";

import { useConversations } from "@/src/hooks/useConversations";
import { useRealtimeMessages } from "@/src/hooks/useRealtimeChat";

import {
  useSendMessage,
  useSendAttachment,
  useMessages,
  useCreateDirectConversation,
} from "@/src/hooks/useChat";

type Props = {
  currentUserId?: string;
};

export default function ChatScreen({ currentUserId = "" }: Props) {
  const supabase = useMemo(() => createClient(), []);

  const {
    data: dbConversations,
    isLoading,
    refetch: refetchConversations,
  } = useConversations(currentUserId);

  const conversations = (dbConversations ?? []) as ChatConversation[];

  const { mutateAsync: sendMessage } = useSendMessage();

  const { mutateAsync: sendAttachment } = useSendAttachment();

  const { mutateAsync: createDirectConversation } =
    useCreateDirectConversation();

  const [selectedId, setSelectedId] = useState<string>("");

  const { data: dbMessages } = useMessages(selectedId);

  useRealtimeMessages(selectedId || null);

  // MARK INCOMING MESSAGES AS READ

  useEffect(() => {
    if (!selectedId || !currentUserId || !dbMessages?.length) return;

    const hasUnreadMessages = dbMessages.some(
      (message) => message.sender_id !== currentUserId && !message.read_at,
    );

    if (!hasUnreadMessages) return;

    let cancelled = false;

    const markMessagesAsRead = async () => {
      try {
        const { error } = await supabase.rpc(
          "mark_conversation_messages_read",
          {
            p_conversation_id: selectedId,
          },
        );

        if (error) {
          console.error("Read receipt error:", error);
          return;
        }

        if (cancelled) return;
      } catch (error) {
        console.error("Read receipt error:", error);
      }
    };

    void markMessagesAsRead();

    return () => {
      cancelled = true;
    };
  }, [selectedId, currentUserId, dbMessages, supabase]);

  // SELECTED CONVERSATION DATA

  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedId,
  );

  const conversationWithMessages = selectedConversation
    ? {
        ...selectedConversation,
        messages: dbMessages ?? [],
      }
    : null;

  // SELECT CONVERSATION

  function handleSelect(id: string) {
    if (id === selectedId) return;

    setSelectedId(id);
  }

  // START DIRECT CONVERSATION

  async function handleStartChat(userId: string) {
    try {
      if (!userId || userId === currentUserId) return;

      const conversationId = await createDirectConversation(userId);

      await refetchConversations();

      setSelectedId(conversationId);
    } catch (error) {
      console.error("Failed to start conversation:", error);
    }
  }

  // SEND TEXT MESSAGE

  async function handleSend(content: string) {
    if (!selectedId || !content.trim()) return;

    try {
      await sendMessage({
        conversationId: selectedId,
        content: content.trim(),
        messageType: "text",
      });
    } catch (error) {
      console.error("Message sending failed:", error);
    }
  }

  // SEND IMAGE / FILE ATTACHMENT

  async function handleAttachment(file: File) {
    if (!selectedId || !file) return;

    try {
      await sendAttachment({
        conversationId: selectedId,
        file,
      });
    } catch (error) {
      console.error("Attachment upload failed:", error);
    }
  }

  // LOADING

  if (isLoading) {
    return (
      <ChatLayout>
        <div className="flex h-full w-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-chart-4 border-t-transparent" />
        </div>
      </ChatLayout>
    );
  }

  // UI

  return (
    <ChatLayout>
      <div
        className={`h-full w-full shrink-0 md:block md:w-[29.1%] md:min-w-[320px] md:max-w-[420px] ${
          selectedId ? "hidden" : "block"
        }`}
      >
        <ChatSidebar
          conversations={conversations}
          selectedId={selectedId}
          onSelect={handleSelect}
          currentUserId={currentUserId}
          onStartChat={handleStartChat}
        />
      </div>

      <div
        className={`h-full min-h-0 min-w-0 flex-1 ${
          selectedId ? "flex" : "hidden"
        } md:flex`}
      >
        {conversationWithMessages ? (
          <ChatWindow
            conversation={conversationWithMessages}
            currentUserId={currentUserId}
            onSend={handleSend}
            onAttachment={handleAttachment}
            onBack={() => setSelectedId("")}
          />
        ) : (
          <div className="hidden flex-1 flex-col items-center justify-center bg-muted px-6 text-center md:flex">
            <div className="mb-6 flex h-24 w-24 items-center justify-center opacity-75">
              <MessageIcon />
            </div>

            <h2 className="text-[17px] font-bold text-foreground">
              Welcome to Your Conversations
            </h2>

            <p className="mt-2 max-w-[320px] text-[13px] leading-relaxed text-muted-foreground">
              Select a chat from the list to start exploring your messages or
              begin a new conversation.
            </p>
          </div>
        )}
      </div>
    </ChatLayout>
  );
}
