export type MessageType = "text" | "image" | "video" | "audio" | "file";

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  attachment_path?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
  created_at: string;
  edited_at?: string | null;
  read_at?: string | null;
  delivered_at?: string | null;
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
  last_message_timestamp?: string;
  last_message_type?: MessageType;
  last_message_read?: boolean;
  last_message_delivered?: boolean;
  other_user_id?: string | null;
  unread_count: number;
  online: boolean;
  is_group?: boolean;
  last_message_sender?: string;
  messages: ChatMessage[];
};
