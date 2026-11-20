import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChatScreen } from "@/src/screen/chat";

// This page needs the request's auth cookies before it can render.
export const instant = false;

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
