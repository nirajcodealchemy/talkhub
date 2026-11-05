export type MessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "file"
  | undefined;

export type ChatMessage = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  reactions?: string[];
  reply_count?: number;
  conversation_id: string;
  read_at?: string | null;
  message_type: MessageType;
  edited_at?: string | null;
  delivered_at?: string | null;
  attachment_url?: string | null;
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
  status?: "sent" | "delivered" | "read";
};

export type ChatConversation = {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
  is_group?: boolean;
  last_message: string;
  unread_count: number;
  messages: ChatMessage[];
  other_user_phone: string;
  other_user_avatar: string;
  last_message_time: string;
  other_user_username: string;
  last_message_read?: boolean;
  last_message_sender?: string;
  other_user_id?: string | null;
  last_message_timestamp?: string;
  last_message_type?: MessageType;
  last_message_delivered?: boolean;
};

type Info = {
  name: string;
  other_user_phone: string;
  other_user_avatar: string;
};

export type ConversationModalProps = {
  userId: Info;
  isOpen: boolean;
  onClose: () => void;
};

export type HeaderProps = {
  onBack?: () => void;
  conversation: ChatConversation;
};

export type ChatListProps = {
  selectedId: string;
  onSelect: (id: string) => void;
  conversations: ChatConversation[];
};

export type ChatListItemProps = {
  selected: boolean;
  onClick: () => void;
  conversation: ChatConversation;
};

export type ChatSideBarProps = {
  selectedId: string;
  currentUserId?: string;
  onSelect: (id: string) => void;
  conversations: ChatConversation[];
  onStartChat?: (userId: string) => void | Promise<void>;
};

export type ChatWindowProps = {
  onBack?: () => void;
  currentUserId: string;
  onLoadOlder: () => void;
  isLoadingOlder: boolean;
  hasMoreMessages: boolean;
  conversation: ChatConversation;
  onSend: (message: string) => void;
  onAttachment?: (file: File) => void;
};

export type GroupModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
};

export type MessageInputProps = {
  conversationId: string | null;
  onSend: (message: string) => void;
  onAttachment?: (file: File) => void;
};

export type MessageItemProps = {
  isMine: boolean;
  message: ChatMessage;
};

export type MessageListProps = {
  currentUserId: string;
  messages: ChatMessage[];
  isLoadingOlder: boolean;
  onLoadOlder: () => void;
  hasMoreMessages: boolean;
};

export type UserListItemProps = {
  user: ChatUser;
  isOpening?: boolean;
  onClick: () => void;
  unreadCount?: number;
  isCurrentUser: boolean;
  currentUserId?: string;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  lastMessageReadAt?: string | null;
  lastMessageSenderId?: string | null;
  lastMessageDeliveredAt?: string | null;
  lastMessageType?: "text" | "image" | "file" | "video" | "audio" | null;
};

export type ChatUser = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};
