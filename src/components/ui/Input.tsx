import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full min-h-[44px] px-3.5 py-2.5 border rounded-xl text-sm transition-all duration-150 ease-[var(--spring-natural)]",
          "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500",
          "focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-900",
          error
            ? "border-rose-300 dark:border-rose-700 focus:ring-rose-500 text-rose-900 dark:text-rose-200"
            : "border-slate-300 dark:border-slate-700 focus:ring-emerald-500 focus:border-emerald-500",
          "disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
