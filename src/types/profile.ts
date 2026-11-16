export type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

export type EditProfileProps = {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
};
