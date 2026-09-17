"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Network,
  Table as TableIcon,
  Printer,
  Edit2,
  UserCheck,
  FolderTree,
  Phone,
  UserPlus,
} from "lucide-react";
import { TableActionGroup } from "@/components/shared/TableActionGroup";
import { SpeedDialActions } from "@/components/shared/SpeedDialActions";
import { Button } from "@/components/ui/Button";
import { SkeletonCard, SkeletonTableRow } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/use-confirm";
import { useAuth } from "@/lib/use-auth";
import { PanitiaModal } from "./components/PanitiaModal";
import { SeksiModal } from "./components/SeksiModal";
import { BuatAkunModal } from "./components/BuatAkunModal";
import { PanitiaOrganogramCard } from "./components/PanitiaOrganogramCard";
import { Panitia, Seksi } from "@/types";

export default function StrukturPage() {
  const toast = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const { user: currentUser } = useAuth();
  const [panitiaList, setPanitiaList] = useState<Panitia[]>([]);
  const [seksiList, setSeksiList] = useState<Seksi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");

  // Modal Panitia
  const [modalPanitiaOpen, setModalPanitiaOpen] = useState(false);
  const [editingPanitia, setEditingPanitia] = useState<Panitia | null>(null);
  const [panitiaForm, setPanitiaForm] = useState({
    nama: "",
    jabatan: "Anggota Seksi",
    seksi_id: "",
    no_hp: "",
    catatan: "",
  });

  // Modal Seksi
  const [modalSeksiOpen, setModalSeksiOpen] = useState(false);
  const [editingSeksi, setEditingSeksi] = useState<Seksi | null>(null);
  const [seksiForm, setSeksiForm] = useState({
    nama_seksi: "",
    koordinator_id: "",
  });

  // Modal Buat Akun
  const [modalBuatAkunOpen, setModalBuatAkunOpen] = useState(false);
  const [selectedPanitiaForAccount, setSelectedPanitiaForAccount] = useState<Panitia | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/struktur");
      if (!res.ok) throw new Error("Gagal memuat data struktur organisasi");
      const data = await res.json();
      setPanitiaList(data.panitia || []);
      setSeksiList(data.seksi || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat data struktur";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAddPanitia = () => {
    setEditingPanitia(null);
    setPanitiaForm({
      nama: "",
      jabatan: "Anggota Seksi",
      seksi_id: "",
      no_hp: "",
      catatan: "",
    });
    setModalPanitiaOpen(true);
  };

  const openEditPanitia = (p: Panitia) => {
    setEditingPanitia(p);
    setPanitiaForm({
      nama: p.nama,
      jabatan: p.jabatan,
      seksi_id: p.seksi_id || "",
      no_hp: p.no_hp || "",
      catatan: p.catatan || "",
    });
    setModalPanitiaOpen(true);
  };

  const handleSavePanitia = async (e: React.FormEvent) => {
    e.preventDefault();
    const action = editingPanitia ? "update_panitia" : "create_panitia";
    const body = {
      action,
      id: editingPanitia?.id,
      ...panitiaForm,
    };

    try {
      const res = await fetch("/api/struktur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal menyimpan panitia");
      } else {
        toast.success(
          editingPanitia ? "Data panitia berhasil diperbarui" : "Panitia baru berhasil ditambahkan"
        );
        setModalPanitiaOpen(false);
        fetchData();
      }
    } catch {
      toast.error("Terjadi kesalahan sistem");
    }
  };

  const handleDeletePanitia = async (id: string, nama: string) => {
    const ok = await confirm({
      title: "Hapus Panitia",
      message: `Yakin hapus panitia "${nama}"?`,
      variant: "danger",
    });
    if (!ok) return;

    try {
      const res = await fetch("/api/struktur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_panitia", id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal menghapus panitia");
      } else {
        toast.success("Panitia berhasil dihapus");
        fetchData();
      }
    } catch {
      toast.error("Terjadi kesalahan sistem saat menghapus panitia");
    }
  };

  const openAddSeksi = () => {
    setEditingSeksi(null);
    setSeksiForm({
      nama_seksi: "",
      koordinator_id: panitiaList[0]?.id || "",
    });
    setModalSeksiOpen(true);
  };

  const openEditSeksi = (s: Seksi) => {
    setEditingSeksi(s);
    setSeksiForm({
      nama_seksi: s.nama_seksi,
      koordinator_id: s.koordinator_id || "",
    });
    setModalSeksiOpen(true);
  };

  const handleSaveSeksi = async (e: React.FormEvent) => {
    e.preventDefault();
    const action = editingSeksi ? "update_seksi" : "create_seksi";
    const body = {
      action,
      id: editingSeksi?.id,
      ...seksiForm,
    };

    try {
      const res = await fetch("/api/struktur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal menyimpan seksi");
      } else {
        toast.success(
          editingSeksi ? "Data seksi berhasil diperbarui" : "Seksi baru berhasil ditambahkan"
        );
        setModalSeksiOpen(false);
        fetchData();
      }
    } catch {
      toast.error("Terjadi kesalahan sistem");
    }
  };

  const handleDeleteSeksi = async (id: string, nama: string) => {
    const ok = await confirm({
      title: "Hapus Seksi",
      message: `Peringatan: Menghapus seksi "${nama}" akan menghapus seluruh tugas di seksi ini secara permanen, dan melepaskan anggota dari seksi ini. Lanjutkan?`,
      variant: "danger",
    });
    if (!ok) return;

    try {
      const res = await fetch("/api/struktur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_seksi", id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal menghapus seksi");
      } else {
        toast.success("Seksi berhasil dihapus");
        fetchData();
      }
    } catch {
      toast.error("Terjadi kesalahan sistem saat menghapus seksi");
    }
  };

  const isKetua = currentUser?.role === "ketua_panitia" || currentUser?.role === "admin";

  // Groupings for Org Chart
  const pelindung = panitiaList.filter((p) => p.jabatan === "Pelindung");
  const penasihat = panitiaList.filter((p) => p.jabatan === "Penasihat");
  const ketua = panitiaList.filter((p) => p.jabatan === "Ketua Panitia");
  const wakil = panitiaList.filter((p) => p.jabatan === "Wakil Ketua");
  const sekretaris = panitiaList.filter((p) => p.jabatan === "Sekretaris");
  const bendahara = panitiaList.filter((p) => p.jabatan === "Bendahara");

  return (
    <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 transition-colors w-full min-w-0">
        {/* Switch Modern Mode Tampilan: Bagan Visual / Tabel */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 no-print">
          <div className="inline-flex p-1 rounded-2xl bg-slate-200/80 dark:bg-slate-800 border border-slate-300/70 dark:border-slate-700 shadow-xs">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "chart"}
              onClick={() => setViewMode("chart")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer min-h-[40px] ${
                viewMode === "chart"
                  ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Network className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Bagan Visual</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "table"}
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer min-h-[40px] ${
                viewMode === "table"
                  ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <TableIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Tabel / Daftar</span>
            </button>
          </div>
        </div>

        {/* 5-State Resilience Handling */}
        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, idx) => (
                <SkeletonCard key={idx} />
              ))}
            </div>
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchData} className="my-6" />
        ) : panitiaList.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Belum Ada Anggota Panitia"
            description="Susunan struktur kepanitiaan Maulid belum diisi. Tambahkan panitia pertama sekarang."
            actionLabel="+ Tambah Anggota Panitia"
            onAction={openAddPanitia}
          />
        ) : viewMode === "chart" ? (
          <div className="space-y-8 bg-white dark:bg-slate-900 p-4 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors w-full min-w-0">
            {/* Title for print */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                Bagan Struktur Panitia Maulid Nabi Muhammad SAW
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Peringatan Hari Besar Islam (PHBI)
              </p>
            </div>

            {/* Level 1: Pelindung & Penasihat */}
            <div className="flex flex-wrap justify-center gap-6">
              {pelindung.map((p) => (
                <PanitiaOrganogramCard
                  key={p.id}
                  panitia={p}
                  roleLabel="Pelindung"
                  variant="amber"
                  isKetua={isKetua}
                  onEdit={openEditPanitia}
                />
              ))}

              {penasihat.map((p) => (
                <PanitiaOrganogramCard
                  key={p.id}
                  panitia={p}
                  roleLabel="Penasihat"
                  variant="amber"
                  isKetua={isKetua}
                  onEdit={openEditPanitia}
                />
              ))}
            </div>

            <div className="w-1 h-6 bg-slate-300 dark:bg-slate-700 mx-auto"></div>

            {/* Level 2: Ketua & Wakil */}
            <div className="flex flex-wrap justify-center gap-6">
              {ketua.map((p) => (
                <PanitiaOrganogramCard
                  key={p.id}
                  panitia={p}
                  roleLabel="Ketua Panitia"
                  variant="emerald"
                  isKetua={isKetua}
                  onEdit={openEditPanitia}
                />
              ))}

              {wakil.map((p) => (
                <PanitiaOrganogramCard
                  key={p.id}
                  panitia={p}
                  roleLabel="Wakil Ketua"
                  variant="emerald"
                  isKetua={isKetua}
                  onEdit={openEditPanitia}
                />
              ))}
            </div>

            <div className="w-1 h-6 bg-slate-300 dark:bg-slate-700 mx-auto"></div>

            {/* Level 3: Sekretaris & Bendahara */}
            <div className="flex flex-wrap justify-center gap-6">
              {sekretaris.map((p) => (
                <PanitiaOrganogramCard
                  key={p.id}
                  panitia={p}
                  roleLabel="Sekretaris"
                  variant="blue"
                  isKetua={isKetua}
                  onEdit={openEditPanitia}
                  className="sm:w-56"
                />
              ))}

              {bendahara.map((p) => (
                <PanitiaOrganogramCard
                  key={p.id}
                  panitia={p}
                  roleLabel="Bendahara"
                  variant="teal"
                  isKetua={isKetua}
                  onEdit={openEditPanitia}
                  className="sm:w-56"
                />
              ))}
            </div>

            <div className="w-full max-w-4xl h-0.5 bg-slate-200 dark:bg-slate-800 mx-auto my-4"></div>

            {/* Level 4: Koordinator Seksi & Anggota */}
            <div>
              <div className="text-center mb-6">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3.5 py-1 rounded-full border border-slate-200/60 dark:border-slate-700">
                  Koordinator Seksi &amp; Pembagian Tugas
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {seksiList.map((s) => {
                  const members = panitiaList.filter(
                    (p) => p.seksi_id === s.id && p.id !== s.koordinator_id
                  );
                  const koordinatorPanitia = panitiaList.find((p) => p.id === s.koordinator_id);

                  return (
                    <div
                      key={s.id}
                      className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                            <FolderTree className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            {s.nama_seksi}
                          </h4>
                          <TableActionGroup
                            onEdit={() => openEditSeksi(s)}
                            onDelete={() => handleDeleteSeksi(s.id, s.nama_seksi)}
                          />
                        </div>

                        {/* Koordinator Card */}
                        <div className="mt-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded uppercase">
                              Koordinator / PJ
                            </span>
                            {isKetua && koordinatorPanitia?.user_id && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                <UserCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                @{koordinatorPanitia.user_username}
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-slate-900 dark:text-white text-xs mt-1.5">
                            {s.koordinator_nama}
                          </p>
                          {s.koordinator_hp && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {s.koordinator_hp}
                            </p>
                          )}
                        </div>

                        {/* Anggota List */}
                        <div className="mt-3">
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                            Anggota ({members.length}):
                          </span>
                          {members.length === 0 ? (
                            <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                              Belum ada anggota
                            </p>
                          ) : (
                            <ul className="space-y-1">
                              {members.map((m) => (
                                <li
                                  key={m.id}
                                  className="text-xs text-slate-700 dark:text-slate-200 flex items-center justify-between bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800"
                                >
                                  <div className="truncate mr-1">
                                    <span>{m.nama}</span>
                                    {m.no_hp && (
                                      <span className="text-[10px] text-slate-400 ml-1.5">
                                        {m.no_hp}
                                      </span>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>

                      {/* Seksi Progress */}
                      <div className="mt-4 pt-2 border-t border-slate-200/60 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
                        <span>Tugas: {s.tugas_selesai ?? 0}/{s.total_tugas ?? 0} Selesai</span>
                        <span>
                          {(s.total_tugas ?? 0) > 0
                            ? Math.round(((s.tugas_selesai ?? 0) / (s.total_tugas ?? 1)) * 100)
                            : 0}
                          %
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* View Mode: Table */
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Daftar Seluruh Anggota Panitia
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Total: {panitiaList.length} orang
                </p>
              </div>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse text-sm min-w-[640px]">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    <th className="py-3 px-4">Nama Lengkap</th>
                    <th className="py-3 px-4">Jabatan</th>
                    <th className="py-3 px-4">Seksi</th>
                    <th className="py-3 px-4">Kontak / No HP</th>
                    <th className="py-3 px-4">Catatan</th>
                    <th className="py-3 px-4">Akun Pengguna</th>
                    <th className="py-3 px-4 text-right no-print">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {panitiaList.map((p, idx) => (
                    <tr
                      key={p.id}
                      style={{ animationDelay: `${Math.min(idx * 35, 350)}ms` }}
                      className="animate-stagger-item hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition"
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {p.nama}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800">
                          {p.jabatan}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 text-xs">
                        {p.nama_seksi ? (
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">
                            {p.nama_seksi}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 text-xs">
                        {p.no_hp || <span className="text-slate-400 italic">-</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs max-w-[200px] truncate">
                        {p.catatan || "-"}
                      </td>
                      <td className="py-3 px-4">
                        {p.user_id ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 font-medium">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            @{p.user_username}
                          </span>
                        ) : isKetua ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPanitiaForAccount(p);
                              setModalBuatAkunOpen(true);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
                            title="Buat Akun Pengguna"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Buat Akun</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right no-print">
                        <div className="flex items-center justify-end gap-1.5">
                          <TableActionGroup
                            onEdit={() => openEditPanitia(p)}
                            onDelete={() => handleDeletePanitia(p.id, p.nama)}
                            editTooltip="Edit data panitia"
                            deleteTooltip="Hapus data panitia"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Floating Speed Dial Actions di Kanan Bawah */}
        <SpeedDialActions
          triggerLabel="Aksi Struktur"
          actions={[
            {
              label: "Cetak / PDF",
              icon: Printer,
              variant: "secondary",
              onClick: () => window.print(),
            },
            {
              label: "Seksi Baru",
              icon: FolderTree,
              variant: "outline",
              onClick: openAddSeksi,
            },
            {
              label: "Tambah Anggota",
              icon: Plus,
              variant: "primary",
              onClick: openAddPanitia,
            },
          ]}
        />

        <PanitiaModal
          isOpen={modalPanitiaOpen}
          onClose={() => setModalPanitiaOpen(false)}
          onSubmit={handleSavePanitia}
          isEdit={Boolean(editingPanitia)}
          form={panitiaForm}
          setForm={setPanitiaForm}
          seksiList={seksiList}
        />

        <SeksiModal
          isOpen={modalSeksiOpen}
          onClose={() => setModalSeksiOpen(false)}
          onSubmit={handleSaveSeksi}
          isEdit={Boolean(editingSeksi)}
          form={seksiForm}
          setForm={setSeksiForm}
          panitiaList={panitiaList}
        />

        <BuatAkunModal
          isOpen={modalBuatAkunOpen}
          onClose={() => {
            setModalBuatAkunOpen(false);
            setSelectedPanitiaForAccount(null);
          }}
          panitia={selectedPanitiaForAccount}
          onSuccess={fetchData}
        />

        {confirmDialog}
      </main>
  );
}
