import React from "react";
import { Edit2, UserCheck, ArrowLeftRight } from "lucide-react";
import { Panitia } from "@/types";
import { cn } from "@/lib/utils";

export interface PanitiaOrganogramCardProps {
  panitia?: Panitia;
  panitiaList?: Panitia[];
  roleLabel: string;
  variant?: "amber" | "emerald" | "blue" | "teal";
  isKetua?: boolean;
  onEdit?: (panitia: Panitia) => void;
  onMove?: (panitia: Panitia) => void;
  className?: string;
}

const variantStyles = {
  amber: {
    container: "bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 shadow-xs",
    badge: "text-amber-800 dark:text-amber-300 bg-amber-200/60 dark:bg-amber-900/60",
    editBtn: "hover:bg-amber-200 dark:hover:bg-amber-800 text-amber-800 dark:text-amber-200",
    accountBorder: "border-amber-200/60 dark:border-amber-800/60",
    accountBadge: "text-amber-900 dark:text-amber-200 bg-amber-200/50 dark:bg-amber-900/40",
  },
  emerald: {
    container: "bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-500 shadow-sm",
    badge: "text-emerald-800 dark:text-emerald-300 bg-emerald-200/70 dark:bg-emerald-900/70",
    editBtn: "hover:bg-emerald-200 dark:hover:bg-emerald-800 text-emerald-800 dark:text-emerald-200",
    accountBorder: "border-emerald-200/60 dark:border-emerald-800/60",
    accountBadge: "text-emerald-900 dark:text-emerald-200 bg-emerald-200/60 dark:bg-emerald-900/60",
  },
  blue: {
    container: "bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-700 shadow-xs",
    badge: "text-blue-800 dark:text-blue-300 bg-blue-200/60 dark:bg-blue-900/60",
    editBtn: "hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200",
    accountBorder: "border-blue-200/60 dark:border-blue-800/60",
    accountBadge: "text-blue-900 dark:text-blue-200 bg-blue-200/50 dark:bg-blue-900/40",
  },
  teal: {
    container: "bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-700 shadow-xs",
    badge: "text-teal-800 dark:text-teal-300 bg-teal-200/60 dark:bg-teal-900/60",
    editBtn: "hover:bg-teal-200 dark:hover:bg-teal-800 text-teal-800 dark:text-teal-200",
    accountBorder: "border-teal-200/60 dark:border-teal-800/60",
    accountBadge: "text-teal-900 dark:text-teal-200 bg-teal-200/50 dark:bg-teal-900/40",
  },
};

export function PanitiaOrganogramCard({
  panitia,
  panitiaList,
  roleLabel,
  variant = "amber",
  isKetua = false,
  onEdit,
  onMove,
  className,
}: PanitiaOrganogramCardProps) {
  const styles = variantStyles[variant];
  const members = panitiaList && panitiaList.length > 0 ? panitiaList : (panitia ? [panitia] : []);

  if (members.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-2xl p-4 w-full max-w-xs sm:w-64 text-center relative transition-all",
        styles.container,
        className
      )}
    >
      <span
        className={cn(
          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block",
          styles.badge
        )}
      >
        {roleLabel}
      </span>

      <div className="mt-2 space-y-2">
        {members.map((p, idx) => (
          <div key={p.id} className="relative group/person">
            {idx > 0 && (
              <div className={cn("border-t my-2.5", styles.accountBorder)} />
            )}

            {(onEdit || onMove) && (
              <div className="absolute top-0 right-0 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover/person:opacity-100 transition no-print">
                {onMove && (
                  <button
                    type="button"
                    onClick={() => onMove(p)}
                    className={cn("p-1 rounded transition cursor-pointer", styles.editBtn)}
                    aria-label={`Pindah posisi ${p.nama}`}
                    title="Pindah Posisi / Jabatan"
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                  </button>
                )}
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(p)}
                    className={cn("p-1 rounded transition cursor-pointer", styles.editBtn)}
                    aria-label={`Edit ${p.nama}`}
                    title="Edit Data Panitia"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
              {p.nama}
            </h3>

            {p.no_hp && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {p.no_hp}
              </p>
            )}

            {p.catatan && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {p.catatan}
              </p>
            )}

            {isKetua && p.user_id && p.user_username && (
              <div className={cn("mt-2 pt-2 border-t", styles.accountBorder)}>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium",
                    styles.accountBadge
                  )}
                >
                  <UserCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  @{p.user_username}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
