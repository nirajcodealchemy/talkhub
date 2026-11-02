// "use client";

// import { useConversations } from "@/src/hooks/useConversations";
// import ChatLayout from "@/src/screen/chat/ChatLayout";
// import ChatScreen from "@/src/screen/chat/ChatScreen";

// export default function ChatPage() {
//   const { data: conversations, isLoading } = useConversations();

//   if (isLoading) {
//     return <div className="h-screen animate-pulse bg-gray-50" />;
//   }

//   if (!conversations?.length) {
//     return <ChatScreen />;
//   }

//   return <ChatLayout />;
// }

import type { ReactNode } from "react";

type ChatLayoutProps = {
  children: ReactNode;
};

export default function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <main className="fixed inset-0 flex h-dvh w-full overflow-hidden bg-white">
      {children}
    </main>
  );
}
