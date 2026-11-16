"use client";

import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { ConfirmationModalData } from "@/src/types/modals";

export const Confirmation = ({
  title,
  isOpen,
  confirm,
  message,
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmationModalData) => {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      confirmBtnRef.current?.focus();
    }
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      void onConfirm();
    } else {
      onCancel?.();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-message"
        className="w-full max-w-sm rounded-xl bg-background p-6 shadow-xl"
      >
        <h2
          id="confirmation-title"
          className="flex justify-between text-base font-semibold text-foreground"
        >
          {title}

          <Button
            type="button"
            aria-label="Close modal"
            onClick={onCancel}
            disabled={loading}
            className="cursor-pointer bg-background text-foreground hover:bg-background disabled:opacity-50"
          >
            <X size={20} />
          </Button>
        </h2>

        <p
          id="confirmation-message"
          className="mt-2 break-words text-sm leading-5 text-muted-foreground"
        >
          {message}
        </p>

        <div className="mt-6 flex justify-end gap-3">
          {onConfirm ? (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="!h-9 !min-w-[76px] cursor-pointer rounded-lg border border-border bg-background !px-4 !py-0 text-xs font-medium text-foreground shadow-none hover:bg-muted hover:text-foreground disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </Button>
          ) : (
            ""
          )}

          <Button
            ref={confirmBtnRef}
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="!h-9 !min-w-[76px] cursor-pointer rounded-lg bg-destructive !px-5 !py-0 text-sm font-medium text-white shadow-none hover:bg-destructive/90 disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              confirm
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
