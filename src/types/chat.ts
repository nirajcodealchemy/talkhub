export type MessageType =
  | "text"
  | "file"
  | "image"
  | "video"
  | "audio"
  | "sticker"
  | undefined;

type GroupEventType =
  | "member_left"
  | "member_added"
  | "member_banned"
  | "member_removed"
  | "member_unbanned"
  | "group_name_changed";

export type ChatMessage = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_system?: boolean;
  reactions?: string[];
  reply_count?: number;
  conversation_id: string;
  read_at?: string | null;
  deleted_for_me?: boolean;
  message_type: MessageType;
  edited_at?: string | null;
  reply_to_id: string | null;
  deleted_at?: string | null;
  delivered_at?: string | null;
  sticker_url?: string | null;
  attachment_url?: string | null;
  media_group_id?: string | null;
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
  forwarded_from_id?: string | null;
  is_deleted_for_everyone?: boolean;
  reply_to_message?: ChatMessage | null;
  status?: "sent" | "delivered" | "read";
  sender_profile?: MessageSenderProfile | null;
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
  avatar_url?: string | null;
  is_deleted_for_me: boolean;
  other_user_username: string;
  group_member_count?: number;
  last_message_read?: boolean;
  last_message_sender?: string;
  group_members?: GroupMember[];
  other_user_id?: string | null;
  last_message_timestamp?: string;
  last_message_type?: MessageType;
  is_deleted_for_everyone: boolean;
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
export type AIAction = "reply" | "summary";

export type HeaderProps = {
  onBack: () => void;
  currentUserId?: string;
  onOpenGroupInfo?: () => void;
  conversation: ChatConversation;
  onAIAction?: (action: AIAction) => void;
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

export type MessageImageGalleryProps = {
  isMine: boolean;
  message: ChatMessage;
  groupMessages?: ChatMessage[];
};

export type MessageTextContentProps = {
  isMine: boolean;
  message: ChatMessage;
};

export type ChatAttachmentProps = {
  isMine: boolean;
  message: ChatMessage;
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
  replyTo: ChatMessage | null;
  conversation: ChatConversation;
  onAttachment?: (file: File) => void;
  onForward: (message: ChatMessage) => void;
  onReply: (message: ChatMessage | null) => void;
  onAttachments?: (files: File[], caption?: string) => void;
  onSend: (
    message: string,
    replyToId?: string | null,
    messageType?: "text" | "sticker",
    stickerUrl?: string | null,
  ) => void | Promise<void>;
};

export type MessageSenderProfile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

export type GroupMember = {
  id: string;
  role: string;
  is_banned?: boolean;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

export type GroupModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  onCreated?: (conversationId: string) => void;
};

export type MessageInputProps = {
  isBanned?: boolean;
  isEditing: boolean;
  onTyping?: () => void;
  onCancelEdit: () => void;
  onStopTyping?: () => void;
  onCancelReply?: () => void;
  replyTo?: ChatMessage | null;
  conversationId: string | null;
  suggestedReply?: string | null;
  onSuggestionApplied?: () => void;
  editingMessage: ChatMessage | null;
  onEditSubmit: (content: string) => Promise<void>;
  onAttachment?: (file: File) => void | Promise<void>;
  onAttachments?: (files: File[], caption?: string) => void;
  onSend: (
    content: string,
    replyToId?: string | null,
    messageType?: "text" | "sticker",
    stickerUrl?: string,
  ) => void | Promise<void>;
};

export type MessageItemProps = {
  isMine: boolean;
  isGroup?: boolean;
  message: ChatMessage;
  groupMessages?: ChatMessage[];
  onReply: (message: ChatMessage) => void;
  onForward: (message: ChatMessage) => void;
  onEditRequest: (message: ChatMessage) => void;
};

export type MessageListProps = {
  isGroup?: boolean;
  currentUserId: string;
  messages: ChatMessage[];
  isLoadingOlder: boolean;
  onLoadOlder: () => void;
  hasMoreMessages: boolean;
  isOtherUserTyping?: boolean;
  onReply: (message: ChatMessage) => void;
  onForward: (message: ChatMessage) => void;
  onEditMessage: (message: ChatMessage) => void;
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
  isDeletedForMe: boolean | undefined;
  lastMessageSenderId?: string | null;
  lastMessageDeliveredAt?: string | null;
  isDeletedForEveryone: boolean | undefined;
  lastMessageType?:
    | "text"
    | "image"
    | "file"
    | "video"
    | "audio"
    | "sticker"
    | null;
};

export type ChatUser = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

export type AttachmentPreviewListProps = {
  files: File[];
  onRemove: (index: number) => void;
};

export type EmojiPickerPopoverProps = {
  onEmojiSelect: (emoji: string) => void;
};

export type RenderMessage = {
  key: string;
  message: ChatMessage;
  groupMessages?: ChatMessage[];
};

export type ConversationSummary = {
  is_group: boolean;
  title: string | null;
  conversation_id: string;
  avatar_url: string | null;
  last_message_at: string | null;
  last_message_type: string | null;
  last_message_content: string | null;
  last_message_read_at: string | null;
  unread_count: number | string | null;
  last_message_sender_id: string | null;
  last_message_delivered_at: string | null;
  last_message_deleted_for_me: boolean | null;
  last_message_deleted_for_everyone: boolean | null;
};

export type ChatScreenProps = {
  currentUserId?: string;
};

export type AICacheData = {
  suggestions: string[];
  summary: string;
};
