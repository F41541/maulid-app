"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CalendarCheck,
  Plus,
  Printer,
  Clock,
  Mic,
  CheckCircle2,
} from "lucide-react";
import { SpeedDialActions } from "@/components/shared/SpeedDialActions";
import { TableActionGroup } from "@/components/shared/TableActionGroup";
import { Button } from "@/components/ui/Button";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/use-confirm";
import { useAuth } from "@/lib/use-auth";
import { isKetuaRole, isWakilRole } from "@/lib/role-utils";
import { formatTanggal, getTodayString } from "@/lib/format";
import { RundownModal } from "./components/RundownModal";
import { RundownItem } from "@/types";

export default function RundownPage() {
  const toast = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const { user: currentUser } = useAuth();
  const [items, setItems] = useState<RundownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RundownItem | null>(null);

  const [form, setForm] = useState({
    hari: getTodayString(),
    waktu: "",
    nama_kegiatan: "",
    nama_pengisi: "",
    catatan: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/rundown");
      if (!res.ok) throw new Error("Gagal mengambil data susunan acara.");
      const data = await res.json();
      setItems(data.rundown || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat susunan acara";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAdd = () => {
    setEditingItem(null);
    setForm({
      hari: getTodayString(),
      waktu: "",
      nama_kegiatan: "",
      nama_pengisi: "",
      catatan: "",
    });
    setModalOpen(true);
  };

  const openEdit = (item: RundownItem) => {
    setEditingItem(item);
    setForm({
      hari: /^\d{4}-\d{2}-\d{2}$/.test(item.hari || "") ? item.hari : getTodayString(),
      waktu: item.waktu,
      nama_kegiatan: item.nama_kegiatan,
      nama_pengisi: item.nama_pengisi || "",
      catatan: item.catatan || "",
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const action = editingItem ? "update" : "create";
    try {
      const res = await fetch("/api/rundown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id: editingItem?.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal menyimpan kegiatan");
      } else {
        toast.success(
          editingItem ? "Kegiatan berhasil diperbarui" : "Kegiatan berhasil ditambahkan"
        );
        setModalOpen(false);
        fetchData();
      }
    } catch {
      toast.error("Terjadi kesalahan sistem");
    }
  };

  const handleDelete = async (id: string, nama: string) => {
    const ok = await confirm({
      title: "Hapus Susunan Acara",
      message: `Hapus kegiatan "${nama}"?`,
      variant: "danger",
    });
    if (!ok) return;

    try {
      const res = await fetch("/api/rundown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal menghapus kegiatan");
      } else {
        toast.success("Kegiatan berhasil dihapus");
        fetchData();
      }
    } catch {
      toast.error("Terjadi kesalahan sistem");
    }
  };

  const canEditRundown = Boolean(
    currentUser &&
      (isKetuaRole(currentUser.role, currentUser.jabatan) ||
        isWakilRole(currentUser.role, currentUser.jabatan) ||
        currentUser.role === "wakil_ketua" ||
        currentUser.role === "sekretaris")
  );

  const sortedItems = useMemo(() => {
    const now = new Date();
    const nowTime = now.getTime();

    return items.map((item) => {
      const timeMatch = item.waktu.match(/(\d{1,2})[:.](\d{2})/);
      let hours = 0;
      let minutes = 0;
      if (timeMatch) {
        hours = parseInt(timeMatch[1], 10);
        minutes = parseInt(timeMatch[2], 10);
      }
      let d = new Date(now);
      if (item.hari && /^\d{4}-\d{2}-\d{2}$/.test(item.hari)) {
        const [y, m, day] = item.hari.split("-").map(Number);
        d = new Date(y, m - 1, day);
      }
      d.setHours(hours, minutes, 0, 0);
      const ts = d.getTime();
      const isPast = ts < nowTime;
      return { ...item, timestamp: ts, isPast };
    });
  }, [items]);

  return (
    <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 transition-colors w-full min-w-0">

        {/* Print Header */}
        <div className="hidden print-only mb-6 text-center">
          <h2 className="text-xl font-bold text-slate-900">
            SUSUNAN ACARA MAULID NABI MUHAMMAD SAW
          </h2>
          <p className="text-xs text-slate-600">Panduan Tertib Pelaksanaan Acara</p>
        </div>

        {/* 5-State Resilience Handling */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <SkeletonCard key={idx} />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchData} className="my-6" />
        ) : sortedItems.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="Belum Ada Susunan Acara"
            description="Belum ada agenda atau susunan kegiatan yang dijadwalkan untuk acara ini."
            actionLabel={canEditRundown ? "+ Tambah Rangkaian Acara" : undefined}
            onAction={canEditRundown ? openAdd : undefined}
          />
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedItems.map((item, index) => (
                <div
                  key={item.id}
                  style={{ animationDelay: `${Math.min(index * 35, 350)}ms` }}
                  className={`animate-stagger-item p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition group relative ${
                    item.isPast
                      ? "opacity-50 dark:opacity-40 grayscale bg-slate-50/40 dark:bg-slate-900/30"
                      : "hover:bg-slate-50/60 dark:hover:bg-slate-800/50"
                  }`}
                >
                  {/* Garis penyambung vertikal timeline ke urutan berikutnya (ada jeda/jangan nempel) */}
                  {index < sortedItems.length - 1 && (
                    <div
                      aria-hidden="true"
                      className="absolute left-[29px] sm:left-[33px] top-[52px] sm:top-[56px] -bottom-2 sm:-bottom-3 w-0.5 bg-slate-200 dark:bg-slate-700 rounded-full pointer-events-none z-0"
                    />
                  )}

                  <div className="flex items-start gap-4 z-10">
                    {/* Urutan badge tanpa tombol atas-bawah */}
                    <div className="flex flex-col items-center justify-center shrink-0">
                      <span className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-center shadow-2xs border border-emerald-200 dark:border-emerald-800">
                        {item.urutan}
                      </span>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          {item.hari ? formatTanggal(item.hari) : "Hari H"}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {item.waktu}
                        </span>
                        {item.isPast && (
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            Selesai / Lewat
                          </span>
                        )}
                      </div>

                      <h3
                        className={`font-bold text-base ${
                          item.isPast
                            ? "line-through text-slate-500 dark:text-slate-400"
                            : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {item.nama_kegiatan}
                      </h3>

                      {item.nama_pengisi && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
                          <Mic className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Oleh: {item.nama_pengisi}</span>
                        </div>
                      )}

                      {item.catatan && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800 italic">
                          Catatan: {item.catatan}
                        </p>
                      )}
                    </div>
                  </div>

                  {canEditRundown && (
                    <TableActionGroup
                      onEdit={() => openEdit(item)}
                      onDelete={() => handleDelete(item.id, item.nama_kegiatan)}
                      editTooltip="Edit kegiatan"
                      deleteTooltip="Hapus kegiatan"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Floating Speed Dial Actions di Kanan Bawah */}
        <SpeedDialActions
          triggerLabel="Aksi Rundown"
          actions={[
            {
              label: "Cetak / PDF",
              icon: Printer,
              variant: "secondary",
              onClick: () => window.print(),
            },
            ...(canEditRundown
              ? [
                  {
                    label: "Tambah Rangkaian Acara",
                    icon: Plus,
                    variant: "primary" as const,
                    onClick: openAdd,
                  },
                ]
              : []),
          ]}
        />

        <RundownModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSave}
          isEdit={Boolean(editingItem)}
          form={form}
          setForm={setForm}
        />

        {confirmDialog}
      </main>
  );
}
