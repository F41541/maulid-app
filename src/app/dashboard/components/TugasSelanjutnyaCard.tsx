"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckSquare, ArrowRight, Clock, User, CheckCircle2, AlertCircle } from "lucide-react";
import { formatTanggal } from "@/lib/format";
import { useToast } from "@/lib/toast";

export interface UrgentTaskItem {
  id: string;
  nama_tugas: string;
  nama_seksi?: string | null;
  status: "Belum Mulai" | "Proses" | "Selesai";
  deadline?: string | null;
  pj_nama?: string | null;
  is_umum?: number | boolean | null;
}

interface TugasSelanjutnyaCardProps {
  tasks: UrgentTaskItem[];
  onTaskUpdated?: () => void;
}

export function TugasSelanjutnyaCard({
  tasks,
  onTaskUpdated,
}: TugasSelanjutnyaCardProps) {
  const toast = useToast();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Take the first 2 tasks
  const displayTasks = tasks.slice(0, 2);

  const handleStatusChange = async (
    id: string,
    namaTugas: string,
    newStatus: "Belum Mulai" | "Proses" | "Selesai"
  ) => {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/tugas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_status", id, status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal memperbarui status tugas");
      } else {
        toast.success(`Status "${namaTugas}" diubah ke ${newStatus}`);
        if (onTaskUpdated) {
          onTaskUpdated();
        }
      }
    } catch {
      toast.error("Terjadi kesalahan sistem saat memperbarui status");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <section
      aria-label="Tugas Selanjutnya"
      className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-xs mb-8 transition-colors"
    >
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800">
            <CheckSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
              Tugas Selanjutnya
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Checklist tugas mendesak yang memerlukan penanganan
            </p>
          </div>
        </div>
        <Link
          href="/tugas"
          className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 transition"
        >
          Semua Tugas <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {displayTasks.length === 0 ? (
        <div className="py-6 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            Semua tugas saat ini telah selesai!
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Tidak ada tugas tertunda yang memerlukan tindakan mendesak.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayTasks.map((t) => {
            const isUmum = Boolean(t.is_umum);
            const isUpdating = updatingId === t.id;

            return (
              <div
                key={t.id}
                className="bg-slate-50/80 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-700 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-600 transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                        isUmum
                          ? "bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                          : "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                      }`}
                    >
                      {isUmum ? "Tugas Semua Divisi" : t.nama_seksi || "Seksi Panitia"}
                    </span>
                    {t.deadline && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatTanggal(t.deadline)}
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-snug">
                    {t.nama_tugas}
                  </h4>

                  {t.pj_nama && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1.5">
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>PJ: <strong className="font-medium text-slate-700 dark:text-slate-300">{t.pj_nama}</strong></span>
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Status Tugas:
                  </span>
                  <select
                    disabled={isUpdating}
                    value={t.status}
                    onChange={(e) =>
                      handleStatusChange(
                        t.id,
                        t.nama_tugas,
                        e.target.value as "Belum Mulai" | "Proses" | "Selesai"
                      )
                    }
                    aria-label={`Ubah status untuk tugas ${t.nama_tugas}`}
                    className={`text-xs font-semibold rounded-xl px-2.5 py-1.5 border focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer ${
                      t.status === "Selesai"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800"
                        : t.status === "Proses"
                        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                    }`}
                  >
                    <option value="Belum Mulai">Belum Mulai</option>
                    <option value="Proses">Sedang Proses</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
