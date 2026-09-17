import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage?: number;
  itemName?: string;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 20,
  itemName = "transaksi",
  onPageChange,
  className,
}: PaginationProps) {
  if (totalItems === 0) {
    return null;
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div
      className={cn(
        "px-4 py-3.5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30 no-print",
        className
      )}
    >
      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
        Menampilkan {startItem} - {endItem} dari {totalItems} {itemName}
      </span>

      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          className="px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 cursor-pointer"
          aria-label="Halaman Sebelumnya"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Sebelumnya</span>
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
          <button
            key={pageNum}
            type="button"
            onClick={() => onPageChange(pageNum)}
            className={cn(
              "w-8 h-8 sm:w-9 sm:h-9 min-h-[36px] text-xs font-bold rounded-xl transition flex items-center justify-center cursor-pointer",
              currentPage === pageNum
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
            aria-label={`Halaman ${pageNum}`}
            aria-current={currentPage === pageNum ? "page" : undefined}
          >
            {pageNum}
          </button>
        ))}

        <button
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          className="px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 cursor-pointer"
          aria-label="Halaman Selanjutnya"
        >
          <span>Selanjutnya</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
