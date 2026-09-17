import React from "react";
import { Edit2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TableActionGroupProps {
  onEdit?: () => void;
  onDelete?: () => void;
  editTooltip?: string;
  deleteTooltip?: string;
  children?: React.ReactNode;
  className?: string;
}

export function TableActionGroup({
  onEdit,
  onDelete,
  editTooltip = "Edit data",
  deleteTooltip = "Hapus data",
  children,
  className,
}: TableActionGroupProps) {
  return (
    <div className={cn("flex items-center justify-end gap-1.5 no-print", className)}>
      {children}
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          title={editTooltip}
          aria-label={editTooltip}
          className="min-w-[44px] min-h-[44px] sm:min-w-[38px] sm:min-h-[38px] p-2 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-xl transition-all duration-150 ease-[var(--spring-snappy)] active:scale-90 inline-flex items-center justify-center focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          title={deleteTooltip}
          aria-label={deleteTooltip}
          className="min-w-[44px] min-h-[44px] sm:min-w-[38px] sm:min-h-[38px] p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-all duration-150 ease-[var(--spring-snappy)] active:scale-90 inline-flex items-center justify-center focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-500 focus-visible:outline-none"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
