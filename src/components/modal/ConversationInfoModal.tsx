"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getAvatarUrl } from "@/src/utils/avatar";
import { Phone, UserRound, X } from "lucide-react";
import { ConversationModalProps } from "@/src/types/chat";

export default function ConversationInfoModal({
  isOpen,
  userId,
  onClose,
}: ConversationModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const t = useTranslations("screen.chat.ConversationInfoModal");

  if (!isOpen || !mounted) return null;

  const name = userId?.name || "User";

  const avatar = getAvatarUrl(name, userId?.other_user_avatar);
  return createPortal(
    <div
      className="fixed inset-0 z-99999 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-info-title"
        className="relative z-100000 w-full max-w-sm overflow-hidden rounded-2xl bg-background shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2
            id="contact-info-title"
            className="text-lg font-semibold text-foreground"
          >
            {t("title")}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="cursor-pointer rounded-full p-2 text-muted-foreground transition hover:bg-muted"
          >
            <X size={20} />
          </button>
        </div>

        {/* Profile information */}
        <div className="px-5 py-7">
          <div className="flex flex-col items-center">
            <img
              alt={name}
              src={avatar}
              className="h-24 w-24 rounded-full object-cover"
            />

            <h3 className="mt-4 text-xl font-semibold text-foreground">
              {name}
            </h3>
          </div>

          <div className="mt-7 space-y-4">
            {/* Full name */}
            <div className="flex items-center gap-3 rounded-xl bg-muted p-4">
              <UserRound size={20} className="shrink-0 text-chart-4" />

              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{t("fullName")}</p>
                <p className="truncate text-sm font-medium text-foreground">
                  {userId?.name || t("notProvided")}
                </p>
              </div>
            </div>

            {/* Phone number */}
            <div className="flex items-center gap-3 rounded-xl bg-muted p-4">
              <Phone size={20} className="shrink-0 text-chart-4" />

              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  {t("phoneNumber")}
                </p>
                <p className="text-sm font-medium text-foreground">
                  {userId?.other_user_phone || t("notProvided")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
