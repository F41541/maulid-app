"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xs border border-transparent dark:bg-emerald-600 dark:hover:bg-emerald-500",
  secondary:
    "bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 border border-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-700",
  outline:
    "bg-transparent hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-800",
  ghost:
    "bg-transparent hover:bg-slate-100 active:bg-slate-200 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 border border-transparent",
  danger:
    "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs border border-transparent dark:bg-rose-600 dark:hover:bg-rose-500",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "min-h-[44px] sm:min-h-[38px] px-3 py-1.5 text-xs rounded-xl gap-1.5",
  md: "min-h-[44px] px-4 py-2 text-xs sm:text-sm rounded-xl gap-2",
  lg: "min-h-[48px] px-6 py-3 text-sm sm:text-base rounded-2xl gap-2.5",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={cn(
          "inline-flex items-center justify-center font-semibold select-none cursor-pointer",
          "transition-all duration-150 ease-[var(--spring-snappy)] active:scale-[0.97]",
          "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500 focus-visible:outline-none",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:pointer-events-none",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);
Button.displayName = "Button";
