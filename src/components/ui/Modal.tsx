"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  showCloseButton?: boolean;
}

const maxWidthMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "md",
  className,
  showCloseButton = true,
}: ModalProps) {
  const isMouseDownOnBackdrop = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 no-print overflow-y-auto animate-kinetic-backdrop"
      onMouseDown={(e) => {
        isMouseDownOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (isMouseDownOnBackdrop.current && e.target === e.currentTarget) {
          onClose();
        }
        isMouseDownOnBackdrop.current = false;
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-dialog-title" : undefined}
        aria-describedby={description ? "modal-dialog-desc" : undefined}
        className={cn(
          "bg-white dark:bg-slate-800/95 rounded-2xl shadow-2xl w-full p-6 border border-slate-200/80 dark:border-slate-700 relative my-8",
          "animate-kinetic-scale",
          maxWidthMap[maxWidth],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || description || showCloseButton) && (
          <div className="flex items-start justify-between mb-5 gap-3 border-b border-slate-100 dark:border-slate-700/60 pb-3.5">
            <div>
              {title && (
                <h3
                  id="modal-dialog-title"
                  className="text-lg font-bold text-slate-900 dark:text-white leading-tight"
                >
                  {title}
                </h3>
              )}
              {description && (
                <p id="modal-dialog-desc" className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="min-w-[44px] min-h-[44px] p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-xl transition-all duration-150 ease-[var(--spring-snappy)] active:scale-90 inline-flex items-center justify-center focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                aria-label="Tutup dialog"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function ModalFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface ModalSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  bordered?: boolean;
}

export function ModalSection({
  title,
  bordered = true,
  className,
  children,
  ...props
}: ModalSectionProps) {
  return (
    <div
      className={cn(
        "space-y-3",
        bordered && "border-t border-slate-100 dark:border-slate-800 pt-3",
        className
      )}
      {...props}
    >
      {title && (
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
          {title}
        </span>
      )}
      {children}
    </div>
  );
}
