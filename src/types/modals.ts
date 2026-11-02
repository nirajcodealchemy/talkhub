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
