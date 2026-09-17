"use client";

import React from "react";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "Konfirmasi",
  cancelText = "Batal",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const Icon = variant === "danger" ? AlertCircle : AlertTriangle;
  const iconColors = {
    danger: "text-rose-600 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-400",
    warning: "text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400",
    primary: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400",
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} maxWidth="sm" showCloseButton={false}>
      <div className="flex items-start gap-4">
        <div className={cn("p-2.5 rounded-2xl shrink-0 shadow-2xs", iconColors[variant])}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="text-base font-bold text-slate-900 dark:text-white">{title}</h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
            {message}
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/60">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {cancelText}
        </Button>
        <Button
          variant={variant === "danger" ? "danger" : "primary"}
          size="sm"
          onClick={onConfirm}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}
