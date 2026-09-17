"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type StatusVariant = "emerald" | "amber" | "rose" | "slate" | "blue";

export interface StatusOption {
  value: string;
  label: string;
  variant?: StatusVariant;
}

export interface StatusSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange"> {
  value: string;
  onChange: (value: string) => void;
  options?: StatusOption[];
  type?: "kehadiran" | "tugas";
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  printFallback?: boolean;
}

const DEFAULT_KEHADIRAN_OPTIONS: StatusOption[] = [
  { value: "Hadir", label: "Hadir", variant: "emerald" },
  { value: "Tidak Hadir", label: "Tidak Hadir", variant: "rose" },
  { value: "Belum Konfirmasi", label: "Belum Konfirmasi", variant: "slate" },
];

const DEFAULT_TUGAS_OPTIONS: StatusOption[] = [
  { value: "Belum Mulai", label: "Belum Mulai", variant: "slate" },
  { value: "Proses", label: "Sedang Proses", variant: "amber" },
  { value: "Selesai", label: "Selesai", variant: "emerald" },
];

export function getStatusStyle(
  val: string,
  type?: "kehadiran" | "tugas",
  variant?: StatusVariant
): string {
  if (type === "kehadiran" || val === "Hadir" || val === "Tidak Hadir" || val === "Belum Konfirmasi") {
    if (val === "Hadir") {
      return "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800";
    }
    if (val === "Tidak Hadir") {
      return "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800";
    }
    return "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700";
  }

  // Type tugas or general
  if (variant === "emerald" || val === "Selesai" || val === "aktif") {
    return "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800 focus:ring-emerald-500";
  }
  if (variant === "amber" || val === "Proses" || val === "Sedang Proses") {
    return "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800 focus:ring-amber-500";
  }
  if (variant === "rose" || val === "void" || val === "Nonaktif") {
    return "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800 focus:ring-rose-500";
  }
  return "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 focus:ring-slate-400";
}

export function StatusSelect({
  value,
  onChange,
  options,
  type,
  disabled = false,
  ariaLabel,
  className,
  printFallback = false,
  ...props
}: StatusSelectProps) {
  const resolvedType =
    type ||
    (value === "Hadir" || value === "Tidak Hadir" || value === "Belum Konfirmasi"
      ? "kehadiran"
      : "tugas");

  const resolvedOptions =
    options ||
    (resolvedType === "kehadiran"
      ? DEFAULT_KEHADIRAN_OPTIONS
      : DEFAULT_TUGAS_OPTIONS);

  const currentOption = resolvedOptions.find((o) => o.value === value);
  const statusClasses = getStatusStyle(value, resolvedType, currentOption?.variant);

  return (
    <>
      <select
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel || props["aria-label"]}
        className={cn(
          "text-xs font-semibold rounded-xl px-2.5 py-1.5 border min-h-[36px] transition-colors focus:outline-none focus:ring-2 cursor-pointer shadow-2xs no-print",
          statusClasses,
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        {...props}
      >
        {resolvedOptions.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            {opt.label}
          </option>
        ))}
      </select>
      {printFallback && (
        <span className="hidden print:inline text-xs font-semibold">{value}</span>
      )}
    </>
  );
}

export default StatusSelect;
