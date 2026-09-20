"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  wrapperClassName?: string;
  showPasswordToggle?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, leftIcon, rightIcon, wrapperClassName, type, showPasswordToggle = true, ...props }, ref) => {
    const isPassword = type === "password";
    const [showPassword, setShowPassword] = useState(false);

    const effectiveType = isPassword ? (showPassword ? "text" : "password") : type;

    const passwordToggle = isPassword && showPasswordToggle ? (
      <button
        type="button"
        onClick={() => setShowPassword((prev) => !prev)}
        className="p-1 -mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg"
        aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
        title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
        tabIndex={-1}
      >
        {showPassword ? (
          <EyeOff className="w-4 h-4" />
        ) : (
          <Eye className="w-4 h-4" />
        )}
      </button>
    ) : null;

    const effectiveRightIcon = rightIcon || passwordToggle;

    const inputElement = (
      <input
        ref={ref}
        type={effectiveType}
        className={cn(
          "w-full min-h-[44px] px-3.5 py-2.5 border rounded-xl text-sm transition-all duration-150 ease-[var(--spring-natural)]",
          "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500",
          "focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-900",
          error
            ? "border-rose-300 dark:border-rose-700 focus:ring-rose-500 text-rose-900 dark:text-rose-200"
            : "border-slate-300 dark:border-slate-700 focus:ring-emerald-500 focus:border-emerald-500",
          "disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed",
          leftIcon && "pl-10",
          effectiveRightIcon && "pr-10",
          className
        )}
        {...props}
      />
    );

    if (!leftIcon && !effectiveRightIcon) {
      return inputElement;
    }

    return (
      <div className={cn("relative w-full flex items-center", wrapperClassName)}>
        {leftIcon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            {leftIcon}
          </div>
        )}
        {inputElement}
        {effectiveRightIcon && (
          <div className="absolute right-3.5 flex items-center text-slate-400 dark:text-slate-500">
            {effectiveRightIcon}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
