"use client";

import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { ConfirmationModalData } from "@/src/types/modals";
import { Button } from "@/components/ui/button";

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
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
      >
        <h2
          id="confirmation-title"
          className="flex justify-between text-base font-semibold text-gray-900"
        >
          {title}

          <Button
            type="button"
            aria-label="Close modal"
            onClick={onCancel}
            disabled={loading}
            className="text-black disabled:opacity-50 bg-white hover:bg-white cursor-pointer"
          >
            <X size={20} />
          </Button>
        </h2>

        <p
          id="confirmation-message"
          className="mt-2 break-words text-sm leading-5 text-gray-500"
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
              className="!h-9 !min-w-[76px] cursor-pointer rounded-lg border border-gray-200 bg-white !px-4 !py-0 text-xs font-medium text-gray-700 shadow-none hover:bg-gray-50 hover:text-gray-700 disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-50"
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
            className="!h-9 !min-w-[76px] cursor-pointer rounded-lg bg-red-500 !px-5 !py-0 text-sm font-medium text-white shadow-none hover:bg-red-600 disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-60"
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
