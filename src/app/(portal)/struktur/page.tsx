"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Network,
  Table as TableIcon,
  ListOrdered,
  Printer,
  Edit2,
  UserCheck,
  FolderTree,
  Phone,
  UserPlus,
  Search,
  X,
  Filter,
  ArrowLeftRight,
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
import { PindahPosisiModal } from "./components/PindahPosisiModal";
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
  const [viewMode, setViewMode] = useState<"chart" | "table" | "list">("chart");

  // Search & Filter State (Mode Tabel)
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSeksi, setFilterSeksi] = useState("");
  const [filterJabatan, setFilterJabatan] = useState("");

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

  // Modal Pindah Posisi (Jabatan & Seksi)
  const [modalPindahOpen, setModalPindahOpen] = useState(false);
  const [selectedPanitiaForMove, setSelectedPanitiaForMove] = useState<Panitia | null>(null);

  const openMovePanitia = (p: Panitia) => {
    setSelectedPanitiaForMove(p);
    setModalPindahOpen(true);
  };

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
      koordinator_id: "",
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
  const canEditStruktur =
    currentUser?.role === "ketua_panitia" ||
    currentUser?.role === "wakil_ketua" ||
    currentUser?.role === "admin";

  // Groupings for Org Chart
  const pelindung = panitiaList.filter((p) => p.jabatan === "Pelindung");
  const penasihat = panitiaList.filter((p) => p.jabatan === "Penasihat");
  const ketua = panitiaList.filter((p) => p.jabatan === "Ketua Panitia");
  const wakil = panitiaList.filter((p) => p.jabatan === "Wakil Ketua");
  const sekretaris = panitiaList.filter((p) => p.jabatan === "Sekretaris");
  const bendahara = panitiaList.filter((p) => p.jabatan === "Bendahara");

  // Search & Filter (Mode Tabel)
  const uniqueJabatanList = Array.from(
    new Set(panitiaList.map((p) => p.jabatan).filter(Boolean))
  );

  const filteredPanitiaList = panitiaList.filter((p) => {
    const queryLower = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !queryLower ||
      p.nama.toLowerCase().includes(queryLower) ||
      (p.jabatan && p.jabatan.toLowerCase().includes(queryLower)) ||
      (p.nama_seksi && p.nama_seksi.toLowerCase().includes(queryLower)) ||
      (p.no_hp && p.no_hp.toLowerCase().includes(queryLower)) ||
      (p.catatan && p.catatan.toLowerCase().includes(queryLower)) ||
      (p.user_username && p.user_username.toLowerCase().includes(queryLower));

    const matchesSeksi =
      !filterSeksi ||
      (filterSeksi === "none" ? !p.seksi_id : p.seksi_id === filterSeksi);

    const matchesJabatan = !filterJabatan || p.jabatan === filterJabatan;

    return matchesSearch && matchesSeksi && matchesJabatan;
  });

  const isFiltered = Boolean(searchQuery.trim() || filterSeksi || filterJabatan);
  const resetFilters = () => {
    setSearchQuery("");
    setFilterSeksi("");
    setFilterJabatan("");
  };

  // Groupings for Structured List & Print View
  const structureGroups = useMemo(() => {
    const standardRoles = [
      "Pelindung",
      "Penasihat",
      "Ketua Panitia",
      "Wakil Ketua",
      "Sekretaris",
      "Bendahara",
    ];

    const groups: Array<{
      title: string;
      items: Array<{ name: string; isCoordinator?: boolean }>;
    }> = [];

    // 1. Jabatan Utama (Pelindung s.d. Bendahara)
    for (const role of standardRoles) {
      const members = panitiaList.filter((p) => p.jabatan === role);
      if (members.length > 0) {
        groups.push({
          title: role,
          items: members.map((p) => ({ name: p.nama })),
        });
      }
    }

    // 2. Jabatan Non-Seksi Lainnya (jika ada)
    const otherNonSeksi = panitiaList.filter(
      (p) => !p.seksi_id && !standardRoles.includes(p.jabatan)
    );
    const otherRolesMap = new Map<string, typeof otherNonSeksi>();
    otherNonSeksi.forEach((p) => {
      const role =
        p.jabatan === "Anggota Seksi"
          ? "Anggota (Tanpa Seksi)"
          : p.jabatan || "Lainnya";
      if (!otherRolesMap.has(role)) otherRolesMap.set(role, []);
      otherRolesMap.get(role)!.push(p);
    });
    otherRolesMap.forEach((members, role) => {
      groups.push({
        title: role,
        items: members.map((p) => ({ name: p.nama })),
      });
    });

    // 3. Seksi-Seksi Kepanitiaan
    seksiList.forEach((s) => {
      const groupItems: Array<{ name: string; isCoordinator?: boolean }> = [];
      const coords = panitiaList.filter(
        (p) =>
          p.id === s.koordinator_id ||
          (p.seksi_id === s.id && p.jabatan === "Koordinator Seksi")
      );

      if (coords.length > 0) {
        coords.forEach((c) =>
          groupItems.push({ name: c.nama, isCoordinator: true })
        );
      } else if (s.koordinator_nama) {
        groupItems.push({ name: s.koordinator_nama, isCoordinator: true });
      }

      const coordIds = new Set(coords.map((c) => c.id));
      if (s.koordinator_id) coordIds.add(s.koordinator_id);

      const members = panitiaList.filter(
        (p) =>
          p.seksi_id === s.id &&
          !coordIds.has(p.id) &&
          p.jabatan !== "Koordinator Seksi"
      );
      members.forEach((m) => {
        groupItems.push({ name: m.nama, isCoordinator: false });
      });

      groups.push({
        title: s.nama_seksi,
        items: groupItems,
      });
    });

    // 4. Panitia dengan seksi_id yatim (orphan seksi) jika ada
    const orphanMembers = panitiaList.filter(
      (p) => p.seksi_id && !seksiList.some((s) => s.id === p.seksi_id)
    );
    if (orphanMembers.length > 0) {
      groups.push({
        title: "Seksi Lainnya",
        items: orphanMembers.map((p) => ({
          name: p.nama,
          isCoordinator: p.jabatan === "Koordinator Seksi",
        })),
      });
    }

    return groups;
  }, [panitiaList, seksiList]);

  return (
    <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 transition-colors w-full min-w-0">
        {/* Switch Modern Mode Tampilan: Bagan Visual / Tabel / Susunan Panitia */}
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
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "list"}
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer min-h-[40px] ${
                viewMode === "list"
                  ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <ListOrdered className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Susunan Panitia</span>
            </button>
          </div>
        </div>

        {/* Konten Interaktif Layar */}
        <div className="no-print">
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
              {pelindung.length > 0 && (
                <PanitiaOrganogramCard
                  panitiaList={pelindung}
                  roleLabel="Pelindung"
                  variant="amber"
                  isKetua={isKetua}
                  onEdit={canEditStruktur ? openEditPanitia : undefined}
                  onMove={canEditStruktur ? openMovePanitia : undefined}
                />
              )}

              {penasihat.length > 0 && (
                <PanitiaOrganogramCard
                  panitiaList={penasihat}
                  roleLabel="Penasihat"
                  variant="amber"
                  isKetua={isKetua}
                  onEdit={canEditStruktur ? openEditPanitia : undefined}
                  onMove={canEditStruktur ? openMovePanitia : undefined}
                />
              )}
            </div>

            <div className="w-1 h-6 bg-slate-300 dark:bg-slate-700 mx-auto"></div>

            {/* Level 2: Ketua & Wakil */}
            <div className="flex flex-wrap justify-center gap-6">
              {ketua.length > 0 && (
                <PanitiaOrganogramCard
                  panitiaList={ketua}
                  roleLabel="Ketua Panitia"
                  variant="emerald"
                  isKetua={isKetua}
                  onEdit={canEditStruktur ? openEditPanitia : undefined}
                  onMove={canEditStruktur ? openMovePanitia : undefined}
                />
              )}

              {wakil.length > 0 && (
                <PanitiaOrganogramCard
                  panitiaList={wakil}
                  roleLabel="Wakil Ketua"
                  variant="emerald"
                  isKetua={isKetua}
                  onEdit={canEditStruktur ? openEditPanitia : undefined}
                  onMove={canEditStruktur ? openMovePanitia : undefined}
                />
              )}
            </div>

            <div className="w-1 h-6 bg-slate-300 dark:bg-slate-700 mx-auto"></div>

            {/* Level 3: Sekretaris & Bendahara */}
            <div className="flex flex-wrap justify-center gap-6">
              {sekretaris.length > 0 && (
                <PanitiaOrganogramCard
                  panitiaList={sekretaris}
                  roleLabel="Sekretaris"
                  variant="blue"
                  isKetua={isKetua}
                  onEdit={canEditStruktur ? openEditPanitia : undefined}
                  onMove={canEditStruktur ? openMovePanitia : undefined}
                  className="sm:w-56"
                />
              )}

              {bendahara.length > 0 && (
                <PanitiaOrganogramCard
                  panitiaList={bendahara}
                  roleLabel="Bendahara"
                  variant="teal"
                  isKetua={isKetua}
                  onEdit={canEditStruktur ? openEditPanitia : undefined}
                  onMove={canEditStruktur ? openMovePanitia : undefined}
                  className="sm:w-56"
                />
              )}
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
                        {s.koordinator_nama ? (
                          <div className="mt-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-xs relative group/coord">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded uppercase">
                                Koordinator / PJ
                              </span>
                              <div className="flex items-center gap-1">
                                {isKetua && koordinatorPanitia?.user_id && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                    <UserCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    @{koordinatorPanitia.user_username}
                                  </span>
                                )}
                                {canEditStruktur && koordinatorPanitia && (
                                  <button
                                    type="button"
                                    onClick={() => openMovePanitia(koordinatorPanitia)}
                                    className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer no-print opacity-0 group-hover/coord:opacity-100"
                                    aria-label={`Pindah posisi ${koordinatorPanitia.nama}`}
                                    title="Pindah Posisi / Jabatan"
                                  >
                                    <ArrowLeftRight className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
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
                        ) : (
                          <div className="mt-3 bg-slate-100/70 dark:bg-slate-800/40 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 shadow-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded uppercase">
                                Belum Ditentukan
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-1.5">
                              Koordinator belum dipilih
                            </p>
                          </div>
                        )}

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
                                  className="text-xs text-slate-700 dark:text-slate-200 flex items-center justify-between bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800 group/member"
                                >
                                  <div className="truncate mr-1">
                                    <span>{m.nama}</span>
                                    {m.no_hp && (
                                      <span className="text-[10px] text-slate-400 ml-1.5">
                                        {m.no_hp}
                                      </span>
                                    )}
                                  </div>
                                  {canEditStruktur && (
                                    <button
                                      type="button"
                                      onClick={() => openMovePanitia(m)}
                                      className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer no-print opacity-0 group-hover/member:opacity-100 shrink-0"
                                      aria-label={`Pindah posisi ${m.nama}`}
                                      title="Pindah Posisi / Jabatan"
                                    >
                                      <ArrowLeftRight className="w-3 h-3" />
                                    </button>
                                  )}
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
        ) : viewMode === "table" ? (
          /* View Mode: Table */
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Daftar Seluruh Anggota Panitia
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Total: {filteredPanitiaList.length} orang {isFiltered && `(difilter dari ${panitiaList.length})`}
                </p>
              </div>

              {/* Search & Filter Controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search Input */}
                <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama, kontak, catatan..."
                    className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white placeholder:text-slate-400"
                    aria-label="Cari panitia"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      aria-label="Hapus pencarian"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Seksi */}
                <select
                  value={filterSeksi}
                  onChange={(e) => setFilterSeksi(e.target.value)}
                  className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  aria-label="Filter seksi"
                >
                  <option value="">Semua Seksi</option>
                  <option value="none">Tanpa Seksi</option>
                  {seksiList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama_seksi}
                    </option>
                  ))}
                </select>

                {/* Filter Jabatan */}
                <select
                  value={filterJabatan}
                  onChange={(e) => setFilterJabatan(e.target.value)}
                  className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  aria-label="Filter jabatan"
                >
                  <option value="">Semua Jabatan</option>
                  {uniqueJabatanList.map((j) => (
                    <option key={j} value={j}>
                      {j}
                    </option>
                  ))}
                </select>

                {/* Reset Button */}
                {isFiltered && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
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
                  {filteredPanitiaList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-xs text-slate-400 dark:text-slate-500">
                        <p>Tidak ada panitia yang sesuai dengan filter atau pencarian.</p>
                        {isFiltered && (
                          <button
                            type="button"
                            onClick={resetFilters}
                            className="mt-2 inline-block font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                          >
                            Reset semua filter
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredPanitiaList.map((p, idx) => (
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* View Mode: List (Susunan Panitia) */
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Susunan Struktur Kepanitiaan
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Format hierarki resmi per seksi dan koordinator ({structureGroups.length} divisi / jabatan)
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => window.print()}
                className="text-xs"
              >
                <Printer className="w-4 h-4 mr-1.5" />
                Cetak / Simpan PDF
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {structureGroups.map((group, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs"
                >
                  <div className="flex items-center gap-2 pb-2.5 mb-3 border-b border-slate-100 dark:border-slate-800">
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      {group.title}
                    </h4>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    {group.items.length === 0 ? (
                      <li className="italic text-slate-400 dark:text-slate-500">
                        - Belum ada anggota
                      </li>
                    ) : (
                      group.items.map((item, itemIdx) => (
                        <li key={itemIdx} className="flex items-baseline">
                          <span className="mr-2 text-slate-400 font-bold select-none">
                            -
                          </span>
                          <span className="truncate">
                            <span className="font-medium text-slate-900 dark:text-white">
                              {item.name}
                            </span>
                            {item.isCoordinator && (
                              <span className="ml-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded">
                                (Koordinator)
                              </span>
                            )}
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>

        {/* Tampilan Resmi Khusus Cetak / PDF (A4 Portrait Table) */}
        <div className="hidden print:block print-only">
          <div className="text-center mb-5 pb-3 border-b-2 border-slate-900">
            <h1 className="text-base font-bold uppercase tracking-wider text-slate-900">
              SUSUNAN STRUKTUR ORGANISASI KEPANITIAAN
            </h1>
            <h2 className="text-sm font-semibold uppercase text-slate-800">
              PERINGATAN MAULID NABI MUHAMMAD SAW 1448 H / 2026 M
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Peringatan Hari Besar Islam (PHBI)
            </p>
          </div>

          {panitiaList.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-500 italic">
              Belum ada data struktur kepanitiaan.
            </p>
          ) : (
            <table className="print-table w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border border-slate-400">
                  <th className="w-10 text-center py-2 px-2 border border-slate-400 font-bold">No</th>
                  <th className="w-48 text-left py-2 px-3 border border-slate-400 font-bold">Jabatan / Seksi</th>
                  <th className="text-left py-2 px-3 border border-slate-400 font-bold">Susunan Personel &amp; Anggota</th>
                  <th className="w-24 text-center py-2 px-2 border border-slate-400 font-bold">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {structureGroups.map((group, idx) => (
                  <tr key={idx} className="border border-slate-300">
                    <td className="text-center py-2 px-2 font-medium border border-slate-300 align-top">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900 border border-slate-300 align-top">
                      {group.title}
                    </td>
                    <td className="py-2 px-3 border border-slate-300 align-top">
                      {group.items.length === 0 ? (
                        <span className="italic text-slate-400">- Belum ada anggota</span>
                      ) : (
                        <ul className="space-y-1">
                          {group.items.map((item, itemIdx) => (
                            <li key={itemIdx} className="flex items-baseline">
                              <span className="mr-1.5 font-bold text-slate-500">-</span>
                              <span>
                                {item.name}
                                {item.isCoordinator && (
                                  <span className="font-semibold text-slate-900 ml-1.5">
                                    (Koordinator)
                                  </span>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="text-center py-2 px-2 font-medium text-slate-700 border border-slate-300 align-top">
                      {group.items.length} orang
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="mt-6 pt-3 border-t border-slate-300 flex justify-between items-center text-[10px] text-slate-600">
            <span>Dicetak dari Aplikasi Manajemen Maulid Nabi</span>
            <span>
              Tanggal Cetak:{" "}
              {new Date().toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

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

        <PindahPosisiModal
          isOpen={modalPindahOpen}
          onClose={() => {
            setModalPindahOpen(false);
            setSelectedPanitiaForMove(null);
          }}
          panitia={selectedPanitiaForMove}
          seksiList={seksiList}
          onSuccess={fetchData}
        />

        {confirmDialog}
      </main>
  );
}
