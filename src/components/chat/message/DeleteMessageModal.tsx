"use client";

import { useTranslations } from "next-intl";
import { Loader2, Trash2 } from "lucide-react";

type Props = {
  isOpen: boolean;
  isMine: boolean;
  isDeleting: boolean;
  deleteError: string;
  onClose: () => void;
  onDelete: (deleteForEveryone: boolean) => void;
};

export default function DeleteMessageModal({
  isOpen,
  isMine,
  onClose,
  onDelete,
  isDeleting,
  deleteError,
}: Props) {
  const t = useTranslations("screen.chat.DeleteMessageModal");
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isDeleting) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-message-title"
        className="w-full max-w-[380px] overflow-hidden rounded-2xl border border-border bg-background shadow-xl"
      >
        <div className="flex flex-col items-center px-6 pb-2 pt-7 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>

          <h2
            id="delete-message-title"
            className="text-lg font-semibold tracking-tight"
          >
            {t("title")}
          </h2>

          <p className="mt-1.5 text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>

        <div className="space-y-2 px-5 pb-5 pt-4">
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => onDelete(false)}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background py-3 text-sm font-medium transition hover:bg-accent disabled:opacity-50"
          >
            {t("deleteForMe")}
          </button>

          <button
            type="button"
            disabled={isDeleting || !isMine}
            onClick={() => onDelete(true)}
            className="flex w-full cursor-pointer text-white items-center justify-center gap-2 rounded-xl bg-destructive py-3 text-sm font-semibold text-destructive-foreground transition hover:bg-destructive/80 disabled:opacity-50"
          >
            {t("deleteForEveryone")}
          </button>

          {!isMine && (
            <p className="pt-1 text-center text-xs text-muted-foreground">
              {t("deleteRestrictionNote")}
            </p>
          )}

          {deleteError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
              {deleteError}
            </p>
          )}

          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="w-full cursor-pointer rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            {t("cancel")}
          </button>

          {isDeleting && (
            <div className="flex items-center justify-center gap-2 pt-1 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("deleting")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
