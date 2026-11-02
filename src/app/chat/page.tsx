import { redirect } from "next/navigation";

import { createClient } from "@/src/lib/supabase/server";
import { ChatScreen } from "@/src/screen/chat";

export default async function ChatPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return <ChatScreen currentUserId={user.id} />;
}

