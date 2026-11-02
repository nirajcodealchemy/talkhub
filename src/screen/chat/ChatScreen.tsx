// "use client";

// import React, { useEffect, useRef, useState } from "react";
// import { useTranslations } from "next-intl";
// import { useRouter } from "next/navigation";
// import MessageSquare from "@/src/components/icons/Message";
// import { MoreVertical, LogOut } from "lucide-react";
// import { Confirmation } from "@/src/components/modal/ConfirmationModal";
// import { useLogout } from "@/src/hooks/useLogout";

// export default function ChatScreen() {
//   const t = useTranslations("screen.chat.ChatScreen");
//   const router = useRouter();
//   const logoutMutation = useLogout();

//   const [isMenuOpen, setIsMenuOpen] = useState(false);
//   const [showLogoutModal, setShowLogoutModal] = useState(false);

//   const menuRef = useRef<HTMLDivElement>(null);

//   // Close dropdown menu on outside click
//   useEffect(() => {
//     function handleClickOutside(event: MouseEvent) {
//       if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
//         setIsMenuOpen(false);
//       }
//     }

//     if (isMenuOpen) {
//       document.addEventListener("mousedown", handleClickOutside);
//     }

//     return () => {
//       document.removeEventListener("mousedown", handleClickOutside);
//     };
//   }, [isMenuOpen]);

//   const handleLogout = async () => {
//     try {
//       await logoutMutation.mutateAsync();
//       setShowLogoutModal(false);
//       router.push("/login");
//     } catch (error) {
//       console.error("Logout failed:", error);
//     }
//   };

//   return (
//     <div className="flex h-screen w-full overflow-hidden bg-white">
//       {/* Left Sidebar */}
//       <aside className="flex h-full w-full shrink-0 flex-col border-r border-gray-200 bg-white md:w-[355px]">
//         {/* Header */}
//         <header className="flex h-[50px] shrink-0 items-center justify-between border-b border-gray-100 px-3">
//           <h1 className="text-base font-bold tracking-tight text-gray-900">
//             {t("chats")}
//           </h1>

//           {/* Three-dot Menu */}
//           <div className="relative" ref={menuRef}>
//             <button
//               type="button"
//               aria-label={t("moreOptions")}
//               aria-expanded={isMenuOpen}
//               onClick={() => setIsMenuOpen((prev) => !prev)}
//               className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none"
//             >
//               <MoreVertical className="h-5 w-5" />
//             </button>

//             {/* Dropdown Menu */}
//             {isMenuOpen && (
//               <div className="absolute right-0 top-10 z-30 w-44 rounded-xl border border-gray-100 bg-white py-1.5 shadow-lg">
//                 <button
//                   type="button"
//                   onClick={() => {
//                     setIsMenuOpen(false);
//                     setShowLogoutModal(true);
//                   }}
//                   className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2 text-left text-sm font-medium text-logout-red transition-colors hover:bg-logout-red-light"
//                 >
//                   <LogOut className="h-4 w-4" />
//                   <span>{t("logout")}</span>
//                 </button>
//               </div>
//             )}
//           </div>
//         </header>

//         {/* Empty Conversations State */}
//         <div className="flex flex-1 select-none flex-col items-center justify-center px-4 pb-2">
//           {/* Conversation Skeleton Preview */}
//           <div className="mb-5 flex flex-col gap-1">
//             {/* Conversation 1 */}
//             <div className="ml-2 flex h-7 w-[116px] items-center gap-2 rounded-md border border-gray-100 bg-gray-50 px-2 shadow-sm">
//               <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-dark-gray text-[8px] font-semibold text-white">
//                 SF
//               </div>

//               <div className="flex flex-1 flex-col gap-1">
//                 <div className="h-[5px] w-8 rounded-full bg-dark-gray" />
//                 <div className="h-[5px] w-full rounded-full bg-light-gray" />
//               </div>
//             </div>

//             {/* Conversation 2 */}
//             <div className="ml-6 flex h-7 w-[116px] items-center gap-2 rounded-md border border-gray-100 bg-gray-50 px-2 shadow-sm">
//               <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-dark-gray text-[8px] font-semibold text-white">
//                 VN
//               </div>

//               <div className="flex flex-1 flex-col gap-1">
//                 <div className="h-[5px] w-8 rounded-full bg-dark-gray" />
//                 <div className="h-[5px] w-full rounded-full bg-light-gray" />
//               </div>
//             </div>

//             {/* Conversation 3 */}
//             <div className="flex h-7 w-[116px] items-center gap-2 rounded-md border border-gray-100 bg-gray-50 px-2 shadow-sm">
//               <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-dark-gray text-[8px] font-semibold text-white">
//                 MS
//               </div>

//               <div className="flex flex-1 flex-col gap-1">
//                 <div className="h-[5px] w-8 rounded-full bg-dark-gray" />
//                 <div className="h-[5px] w-full rounded-full bg-light-gray" />
//               </div>
//             </div>
//           </div>

//           {/* Empty State Description */}
//           <h2 className="text-sm font-bold text-gray-900">
//             {t("noConversationsTitle")}
//           </h2>

//           <p className="mt-1 max-w-[210px] text-center text-xs leading-relaxed text-gray-500">
//             {t("noConversationsDescription")}
//           </p>
//         </div>
//       </aside>

//       {/* Right Main Area - Keep Existing Design */}
//       <main className="hidden flex-1 select-none flex-col items-center justify-center bg-grey-50 p-8 text-center md:flex">
//         {/* Chat Bubbles Icon */}
//         <div className="relative mb-6 flex h-24 w-24 items-center justify-center">
//           <MessageSquare aria-hidden="true" />
//         </div>

//         {/* Welcome Text */}
//         <h2 className="text-base font-bold text-grey-900">
//           {t("welcomeTitle")}
//         </h2>

//         <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-grey-500">
//           {t("welcomeDescription")}
//         </p>
//       </main>

//       {/* Logout Confirmation Modal */}
//       <Confirmation
//         isOpen={showLogoutModal}
//         title={t("logoutConfirmTitle")}
//         message={t("logoutConfirmMessage")}
//         confirm={t("logoutConfirmButton")}
//         loading={logoutMutation.isPending}
//         onCancel={() => setShowLogoutModal(false)}
//         onConfirm={handleLogout}
//       />
//     </div>
//   );
// }

"use client";

import { useEffect, useState } from "react";

import ChatLayout from "./ChatLayout";
import { ChatConversation } from "@/src/types/chat";
import ChatWindow from "@/src/components/chat/ChatWindow";
import ChatSidebar from "@/src/components/chat/ChatSidebar";
import { useConversations } from "@/src/hooks/useConversations";
import { useRealtimeMessages } from "@/src/hooks/useRealtimeChat";

type Props = {
  currentUserId: string;
};

export default function ChatScreen({ currentUserId }: Props) {
  const { data: dbConversations, isLoading } = useConversations(currentUserId);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");

  useRealtimeMessages(selectedId || null);

  useEffect(() => {
    if (dbConversations && dbConversations.length > 0) {
      setConversations(dbConversations as ChatConversation[]);
      if (!selectedId) {
        setSelectedId(dbConversations[0].id);
      }
    }
  }, [dbConversations]);

  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedId,
  );

  function handleSelect(id: string) {
    setSelectedId(id);

    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === id
          ? { ...conversation, unread_count: 0 }
          : conversation,
      ),
    );
  }

  function handleSend(content: string) {
    const newMessage = {
      id: crypto.randomUUID(),
      conversation_id: selectedId,
      sender_id: currentUserId,
      content,
      message_type: "text" as const,
      created_at: new Date().toISOString(),
      status: "sent" as const,
    };

    setConversations((previous) =>
      previous.map((conversation) => {
        if (conversation.id !== selectedId) return conversation;

        return {
          ...conversation,
          messages: [...conversation.messages, newMessage],
          last_message: content,
          last_message_time: new Date().toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          }),
          last_message_sender: "You",
        };
      }),
    );
  }

  function handleAttachment(file: File) {
    const isImage = file.type.startsWith("image/");

    const newMessage = {
      id: crypto.randomUUID(),
      conversation_id: selectedId,
      sender_id: currentUserId,
      content: file.name,
      message_type: isImage ? ("image" as const) : ("file" as const),
      created_at: new Date().toISOString(),
      status: "sent" as const,
      attachment_url: isImage ? URL.createObjectURL(file) : null,
    };

    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === selectedId
          ? {
              ...conversation,
              messages: [...conversation.messages, newMessage],
              last_message: isImage ? "[Image]" : file.name,
            }
          : conversation,
      ),
    );
  }

  if (isLoading) {
    return (
      <ChatLayout>
        <div className="flex h-full w-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#6545db] border-t-transparent" />
        </div>
      </ChatLayout>
    );
  }

  return (
    <ChatLayout>
      {/* LEFT PANEL: All conversations */}
      <div className="h-full w-[29.1%] min-w-[320px] max-w-[420px] shrink-0 max-md:hidden">
        <ChatSidebar
          conversations={conversations}
          selectedId={selectedId}
          onSelect={handleSelect}
          currentUserId={currentUserId}
        />
      </div>

      {/* RIGHT PANEL: Selected conversation only */}
      <div className="flex h-full min-h-0 min-w-0 flex-1">
        {selectedConversation ? (
          <ChatWindow
            conversation={selectedConversation}
            currentUserId={currentUserId}
            onSend={handleSend}
            onAttachment={handleAttachment}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center bg-[#f7f7f8]">
            <p className="text-sm text-gray-500">
              {conversations.length === 0
                ? "No conversations yet. Create a group or start a chat!"
                : "Select a conversation to start chatting"}
            </p>
          </div>
        )}
      </div>
    </ChatLayout>
  );
}
