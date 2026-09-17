"use client";

import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import {
  UserCheck,
  Plus,
  Search,
  Printer,
  FileSpreadsheet,
  Crown,
  Star,
  MapPin,
  CheckCircle,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { SpeedDialActions } from "@/components/shared/SpeedDialActions";
import { TableActionGroup } from "@/components/shared/TableActionGroup";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { SkeletonTableRow } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import * as XLSX from "xlsx";
import { useDebounce } from "@/lib/use-debounce";
import { getTodayString } from "@/lib/format";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/use-confirm";
import { useAuth } from "@/lib/use-auth";
import { TamuModal } from "./components/TamuModal";

interface Tamu {
  id: string;
  nama: string;
  alamat: string | null;
  status: string;
  pengundang: string | null;
  kehadiran: string;
  catatan: string | null;
}

interface TamuStats {
  total: number;
  vvip: number;
  vip: number;
  reguler: number;
  hadir: number;
  tidak_hadir: number;
  belum_konfirmasi: number;
}

export default function TamuPage() {
  const toast = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const { user: currentUser } = useAuth();
  const [tamuList, setTamuList] = useState<Tamu[]>([]);
  const [stats, setStats] = useState<TamuStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterKehadiran, setFilterKehadiran] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTamu, setEditingTamu] = useState<Tamu | null>(null);

  const [form, setForm] = useState({
    nama: "",
    alamat: "",
    status: "VIP",
    pengundang: "Ketua Panitia",
    kehadiran: "Hadir",
    catatan: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (filterKehadiran !== "all") params.append("kehadiran", filterKehadiran);
      if (debouncedSearch.trim()) params.append("q", debouncedSearch.trim());

      const res = await fetch(`/api/tamu?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal memuat data tamu");
      const data = await res.json();
      setTamuList(data.tamu || []);
      setStats(data.stats || null);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Gagal memuat daftar tamu undangan";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterKehadiran, debouncedSearch, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAdd = () => {
    setEditingTamu(null);
    setForm({
      nama: "",
      alamat: "",
      status: "VIP",
      pengundang: "Ketua Panitia",
      kehadiran: "Hadir",
      catatan: "",
    });
    setModalOpen(true);
  };

  const openEdit = (t: Tamu) => {
    setEditingTamu(t);
    setForm({
      nama: t.nama,
      alamat: t.alamat || "",
      status: t.status,
      pengundang: t.pengundang || "",
      kehadiran: t.kehadiran,
      catatan: t.catatan || "",
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const action = editingTamu ? "update" : "create";
    try {
      const res = await fetch("/api/tamu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id: editingTamu?.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal menyimpan data tamu");
      } else {
        toast.success(editingTamu ? "Data tamu diperbarui" : "Tamu undangan ditambahkan");
        setModalOpen(false);
        fetchData();
      }
    } catch {
      toast.error("Terjadi kesalahan sistem");
    }
  };

  const handleQuickKehadiran = async (id: string, kehadiran: string) => {
    try {
      const res = await fetch("/api/tamu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_kehadiran", id, kehadiran }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal mengubah kehadiran");
        return;
      }
      toast.success(`Status kehadiran diubah ke "${kehadiran}"`);
      fetchData();
    } catch {
      toast.error("Gagal mengubah kehadiran");
    }
  };

  const handleDelete = async (id: string, nama: string) => {
    const ok = await confirm({
      title: "Hapus Tamu Undangan",
      message: `Hapus tamu undangan "${nama}"?`,
      variant: "danger",
    });
    if (!ok) return;

    try {
      const res = await fetch("/api/tamu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal menghapus tamu undangan");
      } else {
        toast.success("Tamu undangan berhasil dihapus");
        fetchData();
      }
    } catch {
      toast.error("Terjadi kesalahan sistem");
    }
  };

  const exportExcelLabel = () => {
    const sanitizeFormula = (val: string) => {
      if (val && ["=", "+", "-", "@"].includes(val.charAt(0))) {
        return `'${val}`;
      }
      return val;
    };

    const rows = tamuList.map((t) => [
      sanitizeFormula(t.nama),
      "di",
      sanitizeFormula(t.alamat || "Tempat"),
    ]);

    const worksheetData = [
      ["Nama Tamu", "di", "Tempat"],
      ...rows,
    ];

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Label Tamu");
    XLSX.writeFile(wb, `label-tamu-undangan-${getTodayString()}.xlsx`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "VVIP":
        return (
          <Badge variant="amber" icon={<Crown className="w-3 h-3 text-amber-700 dark:text-amber-300" />}>
            VVIP
          </Badge>
        );
      case "VIP":
        return (
          <Badge variant="purple" icon={<Star className="w-3 h-3 text-purple-700 dark:text-purple-300" />}>
            VIP
          </Badge>
        );
      case "Reguler":
      default:
        return <Badge variant="default">Reguler</Badge>;
    }
  };

  return (
    <Navbar
      userName={currentUser?.nama}
      userRole={currentUser?.role}
      userJabatan={currentUser?.jabatan}
    >
      <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 transition-colors w-full min-w-0">

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <StatCard
              compact
              title="Total Tamu"
              value={stats.total}
              icon={UserCheck}
              iconColor="slate"
            />
            <StatCard
              compact
              title="Terkonfirmasi Hadir"
              value={stats.hadir}
              icon={CheckCircle}
              iconColor="emerald"
            />
            <StatCard
              compact
              title="VVIP & VIP"
              value={stats.vvip + stats.vip}
              icon={Crown}
              iconColor="amber"
            />
            <StatCard
              compact
              title="Belum Konfirmasi"
              value={stats.belum_konfirmasi}
              icon={HelpCircle}
              iconColor="slate"
            />
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs mb-6 flex flex-wrap items-center justify-between gap-3 no-print w-full min-w-0">
          <div className="flex flex-wrap items-center gap-3 flex-1 w-full sm:w-auto min-w-0">
            {/* Search */}
            <div className="relative flex-1 min-w-0 w-full sm:w-auto sm:min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama tamu atau pihak pengundang..."
                aria-label="Cari nama tamu atau pihak pengundang"
                className="w-full pl-9 pr-3.5 py-2.5 min-h-[44px] text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Filter Kategori Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Kategori:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                aria-label="Filter Kategori Tamu"
                className="text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 min-h-[44px] bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Semua Kategori</option>
                <option value="VVIP">VVIP</option>
                <option value="VIP">VIP</option>
                <option value="Reguler">Reguler</option>
              </select>
            </div>

            {/* Filter Kehadiran */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Kehadiran:</span>
              <select
                value={filterKehadiran}
                onChange={(e) => setFilterKehadiran(e.target.value)}
                aria-label="Filter Kehadiran Tamu"
                className="text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 min-h-[44px] bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Semua Kehadiran</option>
                <option value="Hadir">Hadir</option>
                <option value="Tidak Hadir">Tidak Hadir</option>
                <option value="Belum Konfirmasi">Belum Konfirmasi</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabel Tamu */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-sm min-w-[640px]">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Nama Lengkap &amp; Status</th>
                  <th className="py-3.5 px-4">Alamat / Instansi</th>
                  <th className="py-3.5 px-4">Undangan Dari</th>
                  <th className="py-3.5 px-4">Kehadiran</th>
                  <th className="py-3.5 px-4">Catatan</th>
                  <th className="py-3.5 px-4 text-right no-print">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <SkeletonTableRow key={idx} columns={6} />
                  ))
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="p-6">
                      <ErrorState message={error} onRetry={fetchData} compact />
                    </td>
                  </tr>
                ) : tamuList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6">
                      <EmptyState
                        icon={UserCheck}
                        title="Belum Ada Data Tamu"
                        description={
                          searchQuery || filterStatus !== "all" || filterKehadiran !== "all"
                            ? "Tidak ada tamu undangan yang sesuai dengan kata kunci atau filter pencarian."
                            : "Belum ada daftar tamu undangan kehormatan yang dicatat."
                        }
                        actionLabel="+ Tambah Tamu Baru"
                        onAction={openAdd}
                        secondaryActionLabel={
                          searchQuery || filterStatus !== "all" || filterKehadiran !== "all"
                            ? "Reset Filter"
                            : undefined
                        }
                        onSecondaryAction={() => {
                          setSearchQuery("");
                          setFilterStatus("all");
                          setFilterKehadiran("all");
                        }}
                      />
                    </td>
                  </tr>
                ) : (
                  tamuList.map((t, idx) => (
                    <tr
                      key={t.id}
                      style={{ animationDelay: `${Math.min(idx * 35, 350)}ms` }}
                      className="animate-stagger-item hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {t.nama}
                          </span>
                          {getStatusBadge(t.status)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 text-xs">
                        {t.alamat ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            {t.alamat}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                        {t.pengundang || <span className="text-slate-400 italic">-</span>}
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={t.kehadiran}
                          onChange={(e) => handleQuickKehadiran(t.id, e.target.value)}
                          aria-label={`Ubah status kehadiran untuk ${t.nama}`}
                          className={cn(
                            "text-xs font-semibold border rounded-xl px-2.5 py-1.5 min-h-[36px] no-print cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors",
                            t.kehadiran === "Hadir"
                              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                              : t.kehadiran === "Tidak Hadir"
                              ? "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                          )}
                        >
                          <option value="Hadir">Hadir</option>
                          <option value="Tidak Hadir">Tidak Hadir</option>
                          <option value="Belum Konfirmasi">Belum Konfirmasi</option>
                        </select>
                        <span className="hidden print:inline text-xs font-semibold">{t.kehadiran}</span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 max-w-[200px] truncate">
                        {t.catatan || "-"}
                      </td>
                      <td className="py-3.5 px-4 text-right no-print">
                        <TableActionGroup
                          onEdit={() => openEdit(t)}
                          onDelete={() => handleDelete(t.id, t.nama)}
                          editTooltip="Edit data tamu"
                          deleteTooltip="Hapus data tamu"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Floating Speed Dial Actions di Kanan Bawah */}
        <SpeedDialActions
          triggerLabel="Aksi Tamu"
          actions={[
            {
              label: "Cetak / PDF",
              icon: Printer,
              variant: "secondary",
              onClick: () => window.print(),
            },
            {
              label: "Ekspor Label (.xlsx)",
              icon: FileSpreadsheet,
              variant: "outline",
              onClick: exportExcelLabel,
            },
            {
              label: "+ Tambah Tamu",
              icon: Plus,
              variant: "primary",
              onClick: openAdd,
            },
          ]}
        />

        <TamuModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSave}
          isEdit={Boolean(editingTamu)}
          form={form}
          setForm={setForm}
        />

        {confirmDialog}
      </main>
    </Navbar>
  );
}
