import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

export function ErrorState({
  title = "Gagal Memuat Data",
  message = "Terjadi gangguan saat mengambil data dari server. Silakan coba kembali.",
  onRetry,
  className,
  compact = false,
}: ErrorStateProps) {
  if (compact) {
    return (
      <div
        role="alert"
        className={cn(
          "flex items-center justify-between gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-800 dark:text-rose-200",
          className
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span className="truncate font-medium">{message}</span>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 min-h-[44px] sm:min-h-[36px] min-w-[44px] px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold transition-all duration-150 ease-[var(--spring-snappy)] inline-flex items-center justify-center gap-1.5 active:scale-95 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-500 focus-visible:outline-none cursor-pointer"
            aria-label="Coba lagi memuat data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl",
        "bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-800/50",
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3.5 shadow-2xs">
        <AlertCircle className="w-6 h-6" />
      </div>

      <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
        {title}
      </h4>
      <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mb-5 leading-relaxed">
        {message}
      </p>

      {onRetry && (
        <Button
          size="sm"
          variant="danger"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Coba Lagi
        </Button>
      )}
    </div>
  );
}
