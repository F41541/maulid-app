"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type SegmentedColor = "default" | "emerald" | "rose" | "amber" | "purple" | "slate" | "blue";

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  activeColor?: SegmentedColor;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}

const colorActiveStyles: Record<SegmentedColor, string> = {
  default: "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs",
  emerald: "bg-emerald-600 text-white shadow-2xs",
  rose: "bg-rose-600 text-white shadow-2xs",
  amber: "bg-amber-500 text-white shadow-2xs",
  purple: "bg-purple-600 text-white shadow-2xs",
  slate: "bg-slate-700 text-white shadow-2xs",
  blue: "bg-blue-600 text-white shadow-2xs",
};

const sizeStyles = {
  sm: "min-h-[44px] sm:min-h-[32px] min-w-[44px] sm:min-w-[36px] px-2.5 py-1 text-xs",
  md: "min-h-[44px] px-3.5 py-1.5 text-xs",
};

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = "md",
  className,
  ariaLabel = "Opsi Pilihan",
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 text-xs gap-0.5",
        className
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        const color = option.activeColor || "default";

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-lg font-semibold transition-all duration-150 ease-[var(--spring-snappy)] active:scale-95 cursor-pointer",
              "focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none",
              sizeStyles[size],
              isActive
                ? colorActiveStyles[color]
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
