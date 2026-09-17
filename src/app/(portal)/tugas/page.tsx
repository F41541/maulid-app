"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckSquare,
  Plus,
  Clock,
  User,
  Image as ImageIcon,
  Users,
} from "lucide-react";
import { SpeedDialActions } from "@/components/shared/SpeedDialActions";
import { TableActionGroup } from "@/components/shared/TableActionGroup";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatTanggal } from "@/lib/format";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/use-confirm";
import { useAuth } from "@/lib/use-auth";
import { isKetuaRole } from "@/lib/role-utils";
import { TugasModal, type TugasFormData } from "./components/TugasModal";
import { StatusSelect } from "@/components/ui/StatusSelect";
import { Tugas } from "@/types";

type TugasItem = Tugas;

interface SeksiOption {
  id: string;
  nama_seksi: string;
}

interface PanitiaOption {
  id: string;
  nama: string;
  jabatan: string;
  seksi_id?: string | null;
  user_id?: string | null;
}

interface ProgressStat {
  id: string;
  nama_seksi: string;
  total: number;
  selesai: number;
  proses: number;
  belum_mulai: number;
}

export default function TugasPage() {
  const toast = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const { user: currentUser } = useAuth();
  const [tugasList, setTugasList] = useState<TugasItem[]>([]);
  const [seksiList, setSeksiList] = useState<SeksiOption[]>([]);
  const [panitiaList, setPanitiaList] = useState<PanitiaOption[]>([]);
  const [progressStats, setProgressStats] = useState<ProgressStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterSeksi, setFilterSeksi] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTugas, setEditingTugas] = useState<TugasItem | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState<TugasFormData>({
    seksi_id: "",
    nama_tugas: "",
    deskripsi: "",
    status: "Belum Mulai",
    deadline: "",
    pj_id: "",
    foto_dokumentasi: "",
    is_umum: 0,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterSeksi && filterSeksi !== "all") params.append("seksi_id", filterSeksi);
      if (filterStatus && filterStatus !== "all") params.append("status", filterStatus);

      const res = await fetch(`/api/tugas?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal memuat daftar tugas");
      const data = await res.json();
      setTugasList(data.tugas || []);
      setSeksiList(data.seksi || []);
      setPanitiaList(data.panitia || []);
      setProgressStats(data.progressStats || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat tugas";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [filterSeksi, filterStatus, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/tugas/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal mengunggah foto");
      } else {
        setForm((prev) => ({ ...prev, foto_dokumentasi: data.url }));
        toast.success("Foto dokumentasi berhasil diunggah");
      }
    } catch {
      toast.error("Terjadi kesalahan saat mengunggah foto");
    } finally {
      setUploading(false);
    }
  };

  const isKetua = isKetuaRole(currentUser?.role, currentUser?.jabatan);
  const canCreateUmum = isKetua || currentUser?.role === "sekretaris" || currentUser?.role === "wakil_ketua";

  const matchingPanitia = panitiaList.find(
    (p) =>
      (currentUser?.id && p.user_id === currentUser.id) ||
      (currentUser?.nama && p.nama.toLowerCase() === currentUser.nama.toLowerCase())
  );

  const userSeksiId = currentUser?.seksi_id || matchingPanitia?.seksi_id || (seksiList.length > 0 ? seksiList[0].id : "");
  const userSeksiObj = seksiList.find((s) => s.id === userSeksiId);
  const userSeksiName = userSeksiObj?.nama_seksi || currentUser?.jabatan || "";
  const userPanitiaName = matchingPanitia?.nama || currentUser?.nama || "";

  const openAdd = () => {
    setEditingTugas(null);
    setForm({
      seksi_id: isKetua ? (seksiList[0]?.id || "") : userSeksiId,
      nama_tugas: "",
      deskripsi: "",
      status: "Belum Mulai",
      deadline: "",
      pj_id: "",
      foto_dokumentasi: "",
      is_umum: 0,
    });
    setModalOpen(true);
  };

  const openEdit = (tugas: TugasItem) => {
    setEditingTugas(tugas);
    setForm({
      seksi_id: tugas.seksi_id || "",
      nama_tugas: tugas.nama_tugas,
      deskripsi: tugas.deskripsi || "",
      status: tugas.status,
      deadline: tugas.deadline || "",
      pj_id: tugas.pj_id || "",
      foto_dokumentasi: tugas.foto_dokumentasi || "",
      is_umum: tugas.is_umum ? 1 : 0,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const action = editingTugas ? "update" : "create";
    try {
      const res = await fetch("/api/tugas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id: editingTugas?.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal menyimpan tugas");
      } else {
        toast.success(
          editingTugas ? "Tugas berhasil diperbarui" : "Tugas baru berhasil ditambahkan"
        );
        setModalOpen(false);
        fetchData();
      }
    } catch {
      toast.error("Terjadi kesalahan sistem");
    }
  };

  const handleQuickStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch("/api/tugas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_status", id, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal memperbarui status");
        return;
      }
      toast.success(`Status tugas diubah ke "${newStatus}"`);
      fetchData();
    } catch {
      toast.error("Gagal memperbarui status");
    }
  };

  const handleDelete = async (id: string, nama: string) => {
    const ok = await confirm({
      title: "Hapus Tugas",
      message: `Hapus tugas "${nama}"?`,
      variant: "danger",
    });
    if (!ok) return;

    try {
      const res = await fetch("/api/tugas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal menghapus tugas");
      } else {
        toast.success("Tugas berhasil dihapus");
        fetchData();
      }
    } catch {
      toast.error("Terjadi kesalahan saat menghapus tugas");
    }
  };

  const umumTasks = tugasList.filter((t) => t.is_umum === 1);
  const seksiTasks = tugasList.filter((t) => t.is_umum !== 1);

  const renderTaskCard = (t: TugasItem, idx: number) => (
    <div
      key={t.id}
      style={{ animationDelay: `${Math.min(idx * 35, 350)}ms` }}
      className={`animate-stagger-item bg-white dark:bg-slate-900 rounded-3xl border ${
        t.is_umum === 1
          ? "border-indigo-200/80 dark:border-indigo-800/80 ring-1 ring-indigo-400/20 shadow-xs"
          : "border-slate-200/80 dark:border-slate-800 shadow-xs"
      } p-5 flex flex-col justify-between hover:shadow-md transition group`}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          {t.is_umum === 1 ? (
            <span className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3 h-3" />
              Tugas Bersama (Semua Divisi)
            </span>
          ) : (
            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md uppercase tracking-wider">
              {t.nama_seksi || "Seksi"}
            </span>
          )}
          <TableActionGroup
            onEdit={() => openEdit(t)}
            onDelete={() => handleDelete(t.id, t.nama_tugas)}
            editTooltip="Edit tugas"
            deleteTooltip="Hapus tugas"
          />
        </div>

        <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug">
          {t.nama_tugas}
        </h3>

        {t.deskripsi && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed line-clamp-3">
            {t.deskripsi}
          </p>
        )}

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">PJ: {t.pj_nama || "Belum ditugaskan"}</span>
          </div>
          {t.deadline && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Deadline: {formatTanggal(t.deadline)}</span>
            </div>
          )}
          {t.foto_dokumentasi && (
            <button
              type="button"
              onClick={() => setPreviewImage(t.foto_dokumentasi || null)}
              className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold pt-1 cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5 shrink-0" />
              <span>Lihat Bukti Foto</span>
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
        <StatusSelect
          value={t.status}
          onChange={(val) =>
            handleQuickStatusChange(
              t.id,
              val as "Belum Mulai" | "Proses" | "Selesai"
            )
          }
          aria-label={`Ubah status ${t.nama_tugas}`}
          type="tugas"
        />
      </div>
    </div>
  );

  return (
    <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 transition-colors w-full min-w-0">
        {/* Progress Grid per Seksi */}
        {progressStats.length > 0 && (
          <div className="flex flex-wrap gap-3 sm:gap-4 mb-6">
            {progressStats.map((stat) => {
              const pct = stat.total > 0 ? Math.round((stat.selesai / stat.total) * 100) : 0;
              return (
                <div
                  key={stat.id}
                  className="w-full sm:flex-1 sm:min-w-[calc(50%-0.75rem)] lg:min-w-[calc(33.333%-1rem)] bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[150px]">
                      {stat.nama_seksi}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      {pct}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 flex justify-between">
                    <span>{stat.selesai} selesai</span>
                    <span>{stat.total} total</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs mb-6 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Seksi:</span>
              <select
                value={filterSeksi}
                onChange={(e) => setFilterSeksi(e.target.value)}
                aria-label="Filter seksi tugas"
                className="text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 min-h-[44px] bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Semua Seksi</option>
                {seksiList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nama_seksi}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Status:</span>
              <select
                value={filterStatus || "all"}
                onChange={(e) => setFilterStatus(e.target.value === "all" ? "" : e.target.value)}
                aria-label="Filter status tugas"
                className="text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 min-h-[44px] bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Semua Status</option>
                <option value="Belum Mulai">Belum Mulai</option>
                <option value="Proses">Sedang Proses</option>
                <option value="Selesai">Selesai</option>
              </select>
            </div>
          </div>
        </div>

        {/* 5-State Resilience Handling for Tasks */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, idx) => (
              <SkeletonCard key={idx} />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchData} className="my-6" />
        ) : tugasList.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="Belum Ada Tugas"
            description={
              filterSeksi || filterStatus
                ? "Tidak ada tugas yang sesuai dengan kriteria filter yang dipilih."
                : "Belum ada checklist tugas yang ditambahkan ke seksi kepanitiaan."
            }
            actionLabel="+ Tambah Tugas Baru"
            onAction={openAdd}
            secondaryActionLabel={
              filterSeksi || filterStatus ? "Reset Filter" : undefined
            }
            onSecondaryAction={() => {
              setFilterSeksi("");
              setFilterStatus("");
            }}
          />
        ) : (
          <div className="space-y-8">
            {/* Bagian Tugas Bersama (Seluruh Divisi) jika ada */}
            {umumTasks.length > 0 && (
              <section aria-labelledby="tugas-bersama-heading" className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-indigo-100 dark:border-indigo-900/40">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h2 id="tugas-bersama-heading" className="text-sm font-bold text-slate-900 dark:text-white">
                        Tugas Bersama (Semua Divisi)
                      </h2>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Checklist koordinasi lintas seksi yang berlaku untuk seluruh panitia
                      </p>
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {umumTasks.length} Tugas
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {umumTasks.map((t, idx) => renderTaskCard(t, idx))}
                </div>
              </section>
            )}

            {/* Bagian Tugas Seksi / Divisi */}
            <section aria-labelledby="tugas-seksi-heading" className="space-y-3">
              {umumTasks.length > 0 && (
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                      📋
                    </div>
                    <div>
                      <h2 id="tugas-seksi-heading" className="text-sm font-bold text-slate-900 dark:text-white">
                        Tugas Khusus Seksi
                      </h2>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Checklist tugas spesifik divisi operasional
                      </p>
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {seksiTasks.length} Tugas
                  </span>
                </div>
              )}
              {seksiTasks.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  Belum ada tugas khusus seksi yang ditambahkan.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {seksiTasks.map((t, idx) => renderTaskCard(t, idx))}
                </div>
              )}
            </section>
          </div>
        )}

        <TugasModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSave}
          isEdit={Boolean(editingTugas)}
          isKetua={isKetua}
          canCreateUmum={canCreateUmum}
          userJabatanName={userSeksiName}
          userPanitiaName={userPanitiaName}
          form={form}
          setForm={setForm}
          seksiList={seksiList}
          panitiaList={panitiaList}
          uploading={uploading}
          handleFileUpload={handleFileUpload}
        />

        {/* Modal Preview Foto */}
        <Modal
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          title="Dokumentasi / Bukti Tugas"
        >
          {previewImage && (
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950/5 flex justify-center p-2">
                <img
                  src={previewImage}
                  alt="Foto Dokumentasi"
                  className="max-h-[65vh] object-contain rounded-xl"
                />
              </div>
              <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <a
                  href={previewImage}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1"
                >
                  Buka Gambar Asli ↗
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Floating Speed Dial Actions di Kanan Bawah */}
        <SpeedDialActions
          triggerLabel="Aksi Tugas"
          actions={[
            {
              label: "Tambah Tugas",
              icon: Plus,
              variant: "primary",
              onClick: openAdd,
            },
          ]}
        />

        {confirmDialog}
      </main>
  );
}
