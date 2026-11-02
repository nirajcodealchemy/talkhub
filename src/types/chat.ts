export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: "text" | "image" | "file";
  attachment_url?: string | null;
  created_at: string;
  status?: "sent" | "delivered" | "read";
  reactions?: string[];
  reply_count?: number;
};

export type ChatConversation = {
  id: string;
  name: string;
  avatar: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  online: boolean;
  is_group?: boolean;
  last_message_sender?: string;
  messages: ChatMessage[];
};
