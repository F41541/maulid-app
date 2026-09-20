"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calculator,
  Plus,
  Printer,
  FileSpreadsheet,
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Layers,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { SpeedDialActions } from "@/components/shared/SpeedDialActions";
import { TableActionGroup } from "@/components/shared/TableActionGroup";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SkeletonTableRow } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatRupiah, getTodayString } from "@/lib/format";
import { exportToExcel, sanitizeFormula } from "@/lib/excel-export";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/use-confirm";
import {
  RabWadahModal,
  RabWadahFormData,
  RabItemModal,
  RabItemFormData,
} from "./components/RabModal";
import { RabPrintView } from "./components/RabPrintView";
import { RabWadah, RabItemDetail, RabRingkasanGlobal } from "@/types";

const INITIAL_WADAH_FORM: RabWadahFormData = {
  nama_anggaran: "",
  catatan: "",
};

const INITIAL_ITEM_FORM: RabItemFormData = {
  rab_id: "",
  nama_item: "",
  volume: "1",
  satuan: "pcs",
  harga_satuan: "",
  catatan: "",
};

export default function RabPage() {
  const toast = useToast();
  const { confirm, confirmDialog } = useConfirm();

  const [wadahList, setWadahList] = useState<RabWadah[]>([]);
  const [ringkasan, setRingkasan] = useState<RabRingkasanGlobal>({
    totalRencana: 0,
    totalRealisasi: 0,
    sisaAnggaran: 0,
    persentaseRealisasi: 0,
    totalWadah: 0,
    totalItems: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Accordion collapsed state per wadah
  const [collapsedWadah, setCollapsedWadah] = useState<Record<string, boolean>>({});

  // 1. Modal Wadah State
  const [wadahModalOpen, setWadahModalOpen] = useState(false);
  const [isEditingWadah, setIsEditingWadah] = useState(false);
  const [submittingWadah, setSubmittingWadah] = useState(false);
  const [wadahForm, setWadahForm] = useState<RabWadahFormData>(INITIAL_WADAH_FORM);

  // 2. Modal Item State
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [submittingItem, setSubmittingItem] = useState(false);
  const [activeWadahName, setActiveWadahName] = useState("");
  const [itemForm, setItemForm] = useState<RabItemFormData>(INITIAL_ITEM_FORM);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append("q", searchQuery.trim());

      const res = await fetch(`/api/rab?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Akses terbatas. Hanya Ketua, Wakil, atau Bendahara yang dapat mengakses RAB.");
        }
        throw new Error("Gagal memuat data Rencana Anggaran Biaya.");
      }
      const data = await res.json();
      setWadahList(data.wadah || []);
      setRingkasan(
        data.ringkasan || {
          totalRencana: 0,
          totalRealisasi: 0,
          sisaAnggaran: 0,
          persentaseRealisasi: 0,
          totalWadah: 0,
          totalItems: 0,
        }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan sistem saat memuat RAB";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle collapse state for a wadah card
  const toggleWadah = (id: string) => {
    setCollapsedWadah((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // --- WADAH HANDLERS ---
  const openAddWadah = () => {
    setWadahForm(INITIAL_WADAH_FORM);
    setIsEditingWadah(false);
    setWadahModalOpen(true);
  };

  const openEditWadah = (w: RabWadah) => {
    setWadahForm({
      id: w.id,
      nama_anggaran: w.nama_anggaran,
      catatan: w.catatan || "",
    });
    setIsEditingWadah(true);
    setWadahModalOpen(true);
  };

  const handleSaveWadah = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingWadah(true);
    try {
      const action = isEditingWadah ? "update_wadah" : "create_wadah";
      const res = await fetch("/api/rab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...wadahForm }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal menyimpan anggaran");
      } else {
        toast.success(isEditingWadah ? "Anggaran berhasil diperbarui" : "Anggaran berhasil dibuat");
        setWadahModalOpen(false);
        fetchData();
      }
    } catch {
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setSubmittingWadah(false);
    }
  };

  const handleDeleteWadah = async (w: RabWadah) => {
    const ok = await confirm({
      title: "Hapus Anggaran?",
      message: `Apakah Anda yakin ingin menghapus anggaran "${w.nama_anggaran}"? Seluruh rincian kebutuhan di dalamnya juga akan terhapus.`,
      confirmText: "Hapus Anggaran",
      cancelText: "Batal",
      variant: "danger",
    });
    if (!ok) return;

    try {
      const res = await fetch("/api/rab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_wadah", id: w.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal menghapus anggaran");
      } else {
        toast.success("Anggaran berhasil dihapus");
        fetchData();
      }
    } catch {
      toast.error("Terjadi kesalahan sistem saat menghapus");
    }
  };

  // --- ITEM HANDLERS ---
  const openAddItem = (w: RabWadah) => {
    setActiveWadahName(w.nama_anggaran);
    setItemForm({
      ...INITIAL_ITEM_FORM,
      rab_id: w.id,
    });
    setIsEditingItem(false);
    setItemModalOpen(true);
  };

  const openEditItem = (w: RabWadah, item: RabItemDetail) => {
    setActiveWadahName(w.nama_anggaran);
    setItemForm({
      id: item.id,
      rab_id: item.rab_id,
      nama_item: item.nama_item,
      volume: String(item.volume),
      satuan: item.satuan,
      harga_satuan: String(item.harga_satuan),
      catatan: item.catatan || "",
    });
    setIsEditingItem(true);
    setItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingItem(true);
    try {
      const action = isEditingItem ? "update_item" : "create_item";
      const res = await fetch("/api/rab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...itemForm }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal menyimpan rincian kebutuhan");
      } else {
        toast.success(isEditingItem ? "Rincian kebutuhan diperbarui" : "Kebutuhan berhasil ditambahkan");
        setItemModalOpen(false);
        fetchData();
      }
    } catch {
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setSubmittingItem(false);
    }
  };

  const handleDeleteItem = async (item: RabItemDetail) => {
    const ok = await confirm({
      title: "Hapus Rincian Kebutuhan?",
      message: `Hapus "${item.nama_item}" senilai ${formatRupiah(item.total_estimasi)}?`,
      confirmText: "Hapus",
      cancelText: "Batal",
      variant: "danger",
    });
    if (!ok) return;

    try {
      const res = await fetch("/api/rab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_item", id: item.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal menghapus item");
      } else {
        toast.success("Rincian kebutuhan berhasil dihapus");
        fetchData();
      }
    } catch {
      toast.error("Terjadi kesalahan sistem");
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (wadahList.length === 0) {
      toast.error("Tidak ada data anggaran untuk diekspor");
      return;
    }

    try {
      const rows: (string | number)[][] = [];
      let globalIdx = 1;

      for (const w of wadahList) {
        rows.push([
          `[POS: ${w.nama_anggaran.toUpperCase()}]`,
          "",
          "",
          "",
          "",
          "",
          `Rencana: ${formatRupiah(w.total_rencana)} | Kas: ${formatRupiah(w.total_realisasi)}`,
        ]);

        const items = w.items || [];
        for (const it of items) {
          rows.push([
            globalIdx++,
            sanitizeFormula(w.nama_anggaran),
            sanitizeFormula(it.nama_item),
            Number(it.volume),
            sanitizeFormula(it.satuan),
            Number(it.harga_satuan),
            Number(it.total_estimasi),
            sanitizeFormula(it.catatan || "-"),
          ]);
        }
        rows.push([]);
      }

      rows.push([
        "",
        "",
        "",
        "",
        "",
        "TOTAL RENCANA ANGGARAN",
        ringkasan.totalRencana,
      ]);
      rows.push([
        "",
        "",
        "",
        "",
        "",
        "TOTAL REALISASI KAS",
        ringkasan.totalRealisasi,
      ]);
      rows.push([
        "",
        "",
        "",
        "",
        "",
        "SISA ANGGARAN",
        ringkasan.sisaAnggaran,
      ]);

      const worksheetData = [
        ["No", "Anggaran", "Uraian Kebutuhan", "Volume", "Satuan", "Harga Satuan (Rp)", "Total Biaya (Rp)", "Catatan"],
        ...rows,
      ];

      exportToExcel({
        sheetName: "RAB & Realisasi",
        fileName: `rab-maulid-1448h-${getTodayString()}.xlsx`,
        data: worksheetData,
      });
      toast.success(`Berhasil mengekspor data RAB ke Excel`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengekspor data ke Excel";
      toast.error(msg);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 transition-colors w-full min-w-0">
      {/* Konten Interaktif Layar */}
      <div className="no-print">

        {/* 4 Main Stat Cards (Budget vs Actual Monitoring) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
          {/* Card 1: Total Rencana */}
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Rencana Anggaran
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Calculator className="w-5 h-5" />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
              {formatRupiah(ringkasan.totalRencana)}
            </h2>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Dari {ringkasan.totalWadah} pos wadah ({ringkasan.totalItems} item)</span>
            </div>
          </div>

          {/* Card 2: Realisasi Kas Keluar */}
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Realisasi Kas Keluar
              </span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
              {formatRupiah(ringkasan.totalRealisasi)}
            </h2>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              Total kas keluar yang terhubung ke RAB
            </div>
          </div>

          {/* Card 3: Sisa Kuota Anggaran */}
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Sisa Anggaran
              </span>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <h2
              className={`text-2xl sm:text-3xl font-bold mt-1 ${
                ringkasan.sisaAnggaran < 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-slate-900 dark:text-white"
              }`}
            >
              {formatRupiah(ringkasan.sisaAnggaran)}
            </h2>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              {ringkasan.sisaAnggaran < 0 ? "Melebihi estimasi rencana" : "Sisa pagu yang belum terpakai"}
            </div>
          </div>

          {/* Card 4: Persentase Penyerapan */}
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Penyerapan Dana
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-2xs">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
              {ringkasan.persentaseRealisasi}%
            </h2>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    ringkasan.persentaseRealisasi > 100
                      ? "bg-rose-500"
                      : ringkasan.persentaseRealisasi > 80
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(ringkasan.persentaseRealisasi, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar Pencarian */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs mb-6 w-full">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari anggaran atau rincian kebutuhan..."
              className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 min-h-[44px] bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden p-4">
            <table className="w-full">
              <tbody>
                <SkeletonTableRow columns={5} />
                <SkeletonTableRow columns={5} />
                <SkeletonTableRow columns={5} />
              </tbody>
            </table>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <ErrorState
            title="Gagal Memuat Data RAB"
            message={error}
            onRetry={fetchData}
          />
        )}

        {/* Empty State */}
        {!loading && !error && wadahList.length === 0 && (
          <EmptyState
            title="Belum Ada Anggaran"
            description="Mulai rancang RAB dengan membuat Judul Anggaran baru terlebih dahulu (misal: Anggaran Konsumsi, Anggaran Tenda & Panggung)."
            actionLabel="Buat Anggaran Pertama"
            onAction={openAddWadah}
          />
        )}

        {/* LIST OF WADAH CARDS (MASTER-DETAIL) */}
        {!loading && !error && wadahList.length > 0 && (
          <div className="space-y-6">
            {wadahList.map((w) => {
              const isCollapsed = !!collapsedWadah[w.id];
              const items = w.items || [];
              const isOverBudget = w.sisa_anggaran < 0;

              return (
                <div
                  key={w.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition"
                >
                  {/* Wadah Header */}
                  <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                    <div
                      className="flex items-center gap-3 cursor-pointer select-none"
                      onClick={() => toggleWadah(w.id)}
                    >
                      <button
                        type="button"
                        aria-label={isCollapsed ? "Buka Wadah" : "Tutup Wadah"}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition cursor-pointer"
                      >
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </button>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                          {w.nama_anggaran}
                          <Badge variant="default" className="text-[10px] py-0 px-2">
                            {w.items_count} item
                          </Badge>
                          {isOverBudget && (
                            <Badge variant="danger" className="text-[10px] py-0 px-2">
                              Over Budget
                            </Badge>
                          )}
                        </h3>
                        {w.catatan && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {w.catatan}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Financial Summary per Wadah */}
                    <div className="flex items-center gap-4 ml-auto flex-wrap">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block">
                          Rencana Anggaran
                        </span>
                        <span className="text-sm sm:text-base font-extrabold text-emerald-700 dark:text-emerald-300">
                          {formatRupiah(w.total_rencana)}
                        </span>
                      </div>

                      <div className="text-right border-l border-slate-200 dark:border-slate-700 pl-4">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block">
                          Kas Terpakai
                        </span>
                        <span className="text-sm sm:text-base font-extrabold text-blue-600 dark:text-blue-400">
                          {formatRupiah(w.total_realisasi)}
                        </span>
                      </div>

                      <div className="text-right border-l border-slate-200 dark:border-slate-700 pl-4">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block">
                          Sisa Saldo
                        </span>
                        <span
                          className={`text-sm sm:text-base font-extrabold ${
                            isOverBudget
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          {formatRupiah(w.sisa_anggaran)}
                        </span>
                      </div>

                      {/* Wadah Action Buttons */}
                      <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-700 pl-3">
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => openAddItem(w)}
                          className="h-8 px-2.5 text-xs inline-flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Tambah Item</span>
                        </Button>
                        <TableActionGroup
                          onEdit={() => openEditWadah(w)}
                          onDelete={() => handleDeleteWadah(w)}
                          editTooltip="Edit Anggaran"
                          deleteTooltip="Hapus Anggaran"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar Penyerapan Dana per Wadah */}
                  <div className="px-5 py-2 bg-slate-100/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 gap-3">
                    <span className="text-[11px] font-medium">
                      Penyerapan: <span className="font-bold text-slate-700 dark:text-slate-300">{w.persentase_realisasi}%</span>
                    </span>
                    <div className="flex-1 max-w-md bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isOverBudget
                            ? "bg-rose-500"
                            : w.persentase_realisasi > 80
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(w.persentase_realisasi, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Items Table inside Wadah */}
                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      {items.length === 0 ? (
                        <div className="py-8 px-4 text-center text-xs text-slate-400 dark:text-slate-500 flex flex-col items-center gap-2">
                          <p>Belum ada rincian kebutuhan di wadah ini.</p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openAddItem(w)}
                            className="text-xs"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Tambah Rincian Kebutuhan
                          </Button>
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                              <th className="py-3 px-4 w-12 text-center">No</th>
                              <th className="py-3 px-4">Nama Kebutuhan / Uraian</th>
                              <th className="py-3 px-4 text-center">Volume</th>
                              <th className="py-3 px-4 text-right">Harga Satuan</th>
                              <th className="py-3 px-4 text-right font-bold">Total Biaya</th>
                              <th className="py-3 px-4 hidden md:table-cell">Catatan</th>
                              <th className="py-3 px-4 text-right w-24">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {items.map((item, idx) => (
                              <tr
                                key={item.id}
                                className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors"
                              >
                                <td className="py-3.5 px-4 text-center text-slate-400 font-medium">
                                  {idx + 1}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className="font-semibold text-slate-900 dark:text-white block">
                                    {item.nama_item}
                                  </span>
                                  {item.catatan && (
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block md:hidden mt-0.5">
                                      {item.catatan}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {item.volume}
                                  </span>{" "}
                                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                                    {item.satuan}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono">
                                  {formatRupiah(item.harga_satuan)}
                                </td>
                                <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap font-mono">
                                  {formatRupiah(item.total_estimasi)}
                                </td>
                                <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 hidden md:table-cell text-[11px] max-w-xs truncate">
                                  {item.catatan || "-"}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <TableActionGroup
                                    onEdit={() => openEditItem(w, item)}
                                    onDelete={() => handleDeleteItem(item)}
                                    editTooltip="Edit Kebutuhan"
                                    deleteTooltip="Hapus dari Wadah"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tampilan Khusus Cetak Dokumen Resmi (@media print) */}
      <RabPrintView wadah={wadahList} ringkasan={ringkasan} />

      {/* Floating Speed Dial Actions di Kanan Bawah untuk Akses Cepat Mobile */}
      <SpeedDialActions
        triggerLabel="Aksi RAB"
        actions={[
          {
            label: "Cetak Dokumen",
            icon: Printer,
            variant: "secondary",
            onClick: () => window.print(),
          },
          {
            label: "Ekspor Excel (.xlsx)",
            icon: FileSpreadsheet,
            variant: "outline",
            onClick: handleExportExcel,
          },
          {
            label: "Buat Wadah Baru",
            icon: Plus,
            variant: "primary",
            onClick: openAddWadah,
          },
        ]}
      />

      {/* Modal 1: Buat / Edit Anggaran */}
      <RabWadahModal
        isOpen={wadahModalOpen}
        onClose={() => setWadahModalOpen(false)}
        onSubmit={handleSaveWadah}
        form={wadahForm}
        setForm={setWadahForm}
        isEditing={isEditingWadah}
        submitting={submittingWadah}
      />

      {/* Modal 2: Tambah / Edit Rincian Kebutuhan */}
      <RabItemModal
        isOpen={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        onSubmit={handleSaveItem}
        wadahName={activeWadahName}
        form={itemForm}
        setForm={setItemForm}
        isEditing={isEditingItem}
        submitting={submittingItem}
      />

      {confirmDialog}
    </main>
  );
}
