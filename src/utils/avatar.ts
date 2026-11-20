const DEFAULT_AVATAR_BG = "8b34d7";
const DEFAULT_AVATAR_COLOR = "fff";

export function getAvatarUrl(
  name?: string | null,
  avatarUrl?: string | null,
): string {
  if (avatarUrl?.trim()) {
    return avatarUrl;
  }

  const displayName = name?.trim() || "User";

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    displayName,
  )}&background=${DEFAULT_AVATAR_BG}&color=${DEFAULT_AVATAR_COLOR}`;
}
