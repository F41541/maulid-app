"use client";

import React, { useState, useCallback, useRef } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "primary";
}

export function useConfirm() {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
  } | null>(null);

  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: string | ConfirmOptions): Promise<boolean> => {
    const opts: ConfirmOptions =
      typeof options === "string" ? { title: "Konfirmasi", message: options } : options;

    if (resolveRef.current) {
      resolveRef.current(false);
    }

    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialogState({
        isOpen: true,
        options: opts,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(true);
      resolveRef.current = null;
    }
    setDialogState(null);
  }, []);

  const handleCancel = useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
    setDialogState(null);
  }, []);

  const confirmDialog = dialogState ? (
    <ConfirmDialog
      isOpen={dialogState.isOpen}
      title={dialogState.options.title || "Konfirmasi"}
      message={dialogState.options.message}
      confirmText={dialogState.options.confirmText || "Ya, Lanjutkan"}
      cancelText={dialogState.options.cancelText || "Batal"}
      variant={dialogState.options.variant || "danger"}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  const ConfirmComponent = useCallback(() => confirmDialog, [confirmDialog]);

  return { confirm, confirmDialog, ConfirmComponent };
}
