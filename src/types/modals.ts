import { ChatUser } from "./chat";

export type { ConfirmationModalData } from "../schemas/auth";

// Legacy type for backward compatibility
export type ConfirmationType = {
  title: string;
  isOpen: boolean;
  confirm: string;
  message?: string;
  loading?: boolean;
  onClick?: () => void;
  onCancel?: () => void;
  onConfirm?: () => void;
};

export type AddMembersPanelProps = {
  users: ChatUser[];
  onBack: () => void;
  onAdded: () => void;
  currentUserId: string;
  conversationId: string;
  isUsersLoading: boolean;
  existingMemberIds: string[];
};

export type GiphyContentType = "stickers" | "gifs";

export type GiphyProps = {
  onSelect: (url: string) => void;
};

export type DeleteMessageModalProps = {
  isOpen: boolean;
  isMine: boolean;
  isDeleting: boolean;
  deleteError: string;
  onClose: () => void;
  onDelete: (deleteForEveryone: boolean) => void;
};
