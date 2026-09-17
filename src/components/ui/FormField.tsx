"use client";

import React, { useId } from "react";
import { cn } from "@/lib/utils";

export interface FormFieldProps {
  label: string;
  id?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactElement<{
    id?: string;
    required?: boolean;
    error?: boolean;
    "aria-invalid"?: boolean | "true" | "false";
    "aria-describedby"?: string;
  }>;
}

export function FormField({
  label,
  id: customId,
  required,
  hint,
  error,
  className,
  children,
}: FormFieldProps) {
  const autoId = useId();
  const id = customId || children.props.id || autoId;
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={id}
        className="block text-xs font-semibold text-slate-700 dark:text-slate-300 select-none"
      >
        {label} {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {React.cloneElement(children, {
        id,
        required: required ?? children.props.required,
        ...(error ? { error: true, "aria-invalid": true } : {}),
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
      })}
      {hint && !error && (
        <p id={hintId} className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
