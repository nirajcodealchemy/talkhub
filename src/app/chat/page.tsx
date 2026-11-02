import { redirect } from "next/navigation";

import ChatScreen from "@/src/screen/chat/ChatScreen";
import { createClient } from "@/src/lib/supabase/server";

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return <ChatScreen />;
}

