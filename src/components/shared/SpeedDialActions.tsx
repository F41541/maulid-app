"use client";

import React, { useState, useEffect, useRef } from "react";
import { Plus, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SpeedDialVariant = "primary" | "secondary" | "outline" | "danger" | "blue" | "emerald";

export interface SpeedDialItem {
  label: string;
  icon?: LucideIcon | React.ReactNode;
  onClick: () => void;
  variant?: SpeedDialVariant;
  ariaLabel?: string;
  disabled?: boolean;
}

export interface SpeedDialActionsProps {
  actions: SpeedDialItem[];
  triggerLabel?: string;
  className?: string;
}

const variantStyles: Record<SpeedDialVariant, string> = {
  primary:
    "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md border border-emerald-500/40 active:scale-95",
  emerald:
    "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md border border-emerald-500/40 active:scale-95",
  secondary:
    "bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white shadow-md border border-slate-600/40 active:scale-95",
  outline:
    "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-md border border-slate-200 dark:border-slate-700 active:scale-95",
  danger:
    "bg-rose-600 hover:bg-rose-700 text-white shadow-md border border-rose-500/40 active:scale-95",
  blue:
    "bg-blue-600 hover:bg-blue-700 text-white shadow-md border border-blue-500/40 active:scale-95",
};

export function SpeedDialActions({
  actions,
  triggerLabel = "Menu Aksi",
  className,
}: SpeedDialActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (!actions || actions.length === 0) return null;

  return (
    <>
      {/* Backdrop overlay when open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/25 backdrop-blur-[1px] no-print animate-kinetic-backdrop transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Floating Speed Dial Container */}
      <div
        ref={containerRef}
        className={cn(
          "fixed right-4 sm:right-6 bottom-20 md:bottom-6 z-40 no-print flex flex-col items-end",
          className
        )}
      >
        {/* Actions Menu (Emerge Upwards Parallel / Aligned) */}
        {isOpen && (
          <div
            role="menu"
            aria-orientation="vertical"
            aria-label="Daftar Aksi Cepat"
            className="flex flex-col-reverse items-end gap-2.5 mb-3 animate-in fade-in slide-in-from-bottom-3 duration-150"
          >
            {actions.map((action, index) => {
              const variant = action.variant || "outline";
              let IconElement: React.ReactNode = null;
              if (React.isValidElement(action.icon)) {
                IconElement = action.icon;
              } else if (action.icon) {
                const IconComponent = action.icon as React.ElementType;
                IconElement = <IconComponent className="w-4 h-4 shrink-0" />;
              }

              return (
                <button
                  key={index}
                  type="button"
                  role="menuitem"
                  disabled={action.disabled}
                  onClick={() => {
                    setIsOpen(false);
                    action.onClick();
                  }}
                  aria-label={action.ariaLabel || action.label}
                  className={cn(
                    "flex items-center gap-2.5 px-4 py-2.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer min-h-[44px]",
                    variantStyles[variant],
                    action.disabled && "opacity-50 cursor-not-allowed pointer-events-none"
                  )}
                >
                  {IconElement}
                  <span className="whitespace-nowrap">{action.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Floating Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label={isOpen ? "Tutup menu aksi" : triggerLabel}
          title={isOpen ? "Tutup menu aksi" : triggerLabel}
          className={cn(
            "w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-900/30 flex items-center justify-center transition-all duration-200 active:scale-90 focus-visible:ring-4 focus-visible:ring-emerald-500/50 focus-visible:outline-none cursor-pointer border-2 border-white/20",
            isOpen && "bg-slate-800 hover:bg-slate-900 shadow-slate-900/40"
          )}
        >
          <Plus
            className={cn(
              "w-6 h-6 transition-transform duration-200",
              isOpen ? "rotate-45" : "rotate-0"
            )}
          />
        </button>
      </div>
    </>
  );
}
