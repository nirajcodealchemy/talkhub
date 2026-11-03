export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  last_message_type?: "text" | "image" | "file" | "video";
  attachment_url?: string | null;
  created_at: string;
  status?: "sent" | "delivered" | "read";
  reactions?: string[];
  reply_count?: number;
  read_at?: string | null;
  delivered_at?: string | null;
  last_message_read?: boolean;
};

export type ChatConversation = {
  id: string;
  name: string;
  avatar: string;
  last_message: string;
  last_message_time: string;
  last_message_type?: "text" | "image" | "file" | "video";
  last_message_read?: boolean;
  other_user_id?: string | null;
  unread_count: number;
  online: boolean;
  is_group?: boolean;
  last_message_sender?: string;
  messages: ChatMessage[];
};
