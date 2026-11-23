import { HeaderProps } from "./chat";

export type GroupInfoPanelProps = {
  onClose: () => void;
  currentUserId?: string;
  onGroupExited?: () => void;
  onAddMembers?: () => void;
  conversation: HeaderProps["conversation"];
};

export type Tab = "members" | "banned";
