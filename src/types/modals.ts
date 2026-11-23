import { ChatUser } from "./chat";

export type { ConfirmationModalData } from "../schemas/auth";

// Legacy type for backward compatibility
export type ConfirmationType = {
  title: string;
  isOpen: boolean;
  confirm: string;
  loading?: boolean;
  message?: string;
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
