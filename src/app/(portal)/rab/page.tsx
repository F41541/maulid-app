"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calculator,
  Plus,
  Printer,
  FileSpreadsheet,
  LayoutGrid,
  List,
  Search,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { SpeedDialActions } from "@/components/shared/SpeedDialActions";
import { TableActionGroup } from "@/components/shared/TableActionGroup";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SkeletonTableRow } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import Pagination from "@/components/ui/Pagination";
import { formatRupiah, getTodayString } from "@/lib/format";
import { exportToExcel, sanitizeFormula } from "@/lib/excel-export";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/use-confirm";
import { RabModal, RabFormData } from "./components/RabModal";
import { RabPrintView } from "./components/RabPrintView";
import { RabItem, RabSeksiGroup, RabRingkasan } from "@/types";

const INITIAL_FORM: RabFormData = {
  seksi_id: "umum",
  nama_item: "",
  volume: "1",
  satuan: "pcs",
  harga_satuan: "",
  catatan: "",
};

export default function RabPage() {
  const toast = useToast();
  const { confirm, confirmDialog } = useConfirm();

  const [items, setItems] = useState<RabItem[]>([]);
  const [groups, setGroups] = useState<RabSeksiGroup[]>([]);
  const [ringkasan, setRingkasan] = useState<RabRingkasan>({
    totalAnggaran: 0,
    totalItem: 0,
    seksiCount: 0,
  });
  const [seksiList, setSeksiList] = useState<Array<{ id: string; nama_seksi: string }>>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterSeksi, setFilterSeksi] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");

  // Collapsed sections in grouped view
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Pagination for flat table
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<RabFormData>(INITIAL_FORM);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterSeksi !== "all") params.append("seksi_id", filterSeksi);
      if (searchQuery.trim()) params.append("q", searchQuery.trim());

      const res = await fetch(`/api/rab?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Akses terbatas. Hanya Ketua, Wakil, atau Bendahara yang dapat mengakses RAB.");
        }
        throw new Error("Gagal memuat data Rencana Anggaran Biaya.");
      }
      const data = await res.json();
      setItems(data.items || []);
      setGroups(data.groups || []);
      setRingkasan(
        data.ringkasan || {
          totalAnggaran: 0,
          totalItem: 0,
          seksiCount: 0,
        }
      );
      setSeksiList(data.seksiList || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan sistem saat memuat RAB";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [filterSeksi, searchQuery, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle collapse state for a group
  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Open modal for new item
  const openAdd = (defaultSeksiId: string = "umum") => {
    setForm({
      ...INITIAL_FORM,
      seksi_id: defaultSeksiId,
    });
    setIsEditing(false);
    setModalOpen(true);
  };

  // Open modal for editing existing item
  const openEdit = (item: RabItem) => {
    setForm({
      id: item.id,
      seksi_id: item.seksi_id || "umum",
      nama_item: item.nama_item,
      volume: String(item.volume),
      satuan: item.satuan,
      harga_satuan: String(item.harga_satuan),
      catatan: item.catatan || "",
    });
    setIsEditing(true);
    setModalOpen(true);
  };

  // Handle Save (Create / Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const action = isEditing ? "update" : "create";
      const res = await fetch("/api/rab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal menyimpan item anggaran");
      } else {
        toast.success(isEditing ? "Item anggaran berhasil diperbarui" : "Item berhasil ditambahkan ke RAB");
        setModalOpen(false);
        fetchData();
      }
    } catch {
      toast.error("Terjadi kesalahan sistem saat menyimpan");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete with Confirmation Dialog
  const handleDelete = async (item: RabItem) => {
    const ok = await confirm({
      title: "Hapus Item Anggaran?",
      message: `Apakah Anda yakin ingin menghapus "${item.nama_item}" senilai ${formatRupiah(item.total_estimasi)} dari RAB?`,
      confirmText: "Hapus",
      cancelText: "Batal",
      variant: "danger",
    });
    if (!ok) return;

    try {
      const res = await fetch("/api/rab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: item.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal menghapus item anggaran");
      } else {
        toast.success("Item anggaran berhasil dihapus");
        fetchData();
      }
    } catch {
      toast.error("Terjadi kesalahan sistem");
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (items.length === 0) {
      toast.error("Tidak ada data anggaran untuk diekspor");
      return;
    }

    try {
      const rows = items.map((it, idx) => [
        idx + 1,
        sanitizeFormula(it.nama_seksi || "Umum / Kepanitiaan"),
        sanitizeFormula(it.nama_item),
        Number(it.volume),
        sanitizeFormula(it.satuan),
        Number(it.harga_satuan),
        Number(it.total_estimasi),
        sanitizeFormula(it.catatan || "-"),
      ]);

      const worksheetData = [
        ["No", "Seksi", "Uraian Kebutuhan", "Volume", "Satuan", "Harga Satuan (Rp)", "Total Biaya (Rp)", "Catatan"],
        ...rows,
        [],
        ["", "", "", "", "", "TOTAL KESELURUHAN", ringkasan.totalAnggaran, ""],
      ];

      exportToExcel({
        sheetName: "RAB Maulid",
        fileName: `rab-maulid-1448h-${getTodayString()}.xlsx`,
        data: worksheetData,
      });
      toast.success(`Berhasil mengekspor ${items.length} item RAB ke Excel`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengekspor data ke Excel";
      toast.error(msg);
    }
  };

  // Derived pagination for Flat View
  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
  }, [items, currentPage, itemsPerPage]);

  return (
    <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 transition-colors w-full min-w-0">
      {/* Konten Interaktif Layar */}
      <div className="no-print">
        {/* Switch Modern Mode Tampilan: Per Seksi / Tabel Rata (Mengikuti gaya /struktur) */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 no-print">
          <div className="inline-flex p-1 rounded-2xl bg-slate-200/80 dark:bg-slate-800 border border-slate-300/70 dark:border-slate-700 shadow-xs">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "grouped"}
              onClick={() => setViewMode("grouped")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer min-h-[40px] ${
                viewMode === "grouped"
                  ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Per Seksi</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "flat"}
              onClick={() => setViewMode("flat")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer min-h-[40px] ${
                viewMode === "flat"
                  ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <List className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Tabel Rata</span>
            </button>
          </div>
        </div>

        {/* 3 Main Stat Cards (Consistent with Keuangan / Dashboard) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-8">
          {/* Card 1: Total Anggaran */}
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
              {formatRupiah(ringkasan.totalAnggaran)}
            </h2>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Estimasi biaya seluruh kepanitiaan</span>
            </div>
          </div>

          {/* Card 2: Total Item Kebutuhan */}
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Item Kebutuhan
              </span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
                <List className="w-5 h-5" />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
              {ringkasan.totalItem} <span className="text-sm font-normal text-slate-500">item</span>
            </h2>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              Rincian barang, sewa, & konsumsi
            </div>
          </div>

          {/* Card 3: Seksi Beranggaran */}
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Seksi Beranggaran
              </span>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
              {ringkasan.seksiCount} <span className="text-sm font-normal text-slate-500">divisi</span>
            </h2>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              Divisi dengan kebutuhan terdata
            </div>
          </div>
        </div>

        {/* Toolbar: Filter Seksi & Search */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs mb-6 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-center">
            {/* Filter Seksi */}
            <div className="flex flex-col gap-1">
              <label htmlFor="filter-seksi" className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Filter Seksi:
              </label>
              <select
                id="filter-seksi"
                value={filterSeksi}
                onChange={(e) => {
                  setFilterSeksi(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter Berdasarkan Seksi"
                className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 min-h-[44px] bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Semua Seksi & Umum</option>
                <option value="umum">Umum / Kepanitiaan</option>
                {seksiList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nama_seksi}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label htmlFor="search-rab" className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Cari Kebutuhan / Uraian:
              </label>
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="search-rab"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Ketik nama kebutuhan atau catatan spesifikasi..."
                  className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 min-h-[44px] bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden p-4">
            <table className="w-full">
              <tbody>
                <SkeletonTableRow columns={6} />
                <SkeletonTableRow columns={6} />
                <SkeletonTableRow columns={6} />
                <SkeletonTableRow columns={6} />
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
        {!loading && !error && items.length === 0 && (
          <EmptyState
            title="Belum Ada Kebutuhan Anggaran"
            description="Mulai rancang estimasi biaya kepanitiaan dengan menambahkan item kebutuhan per seksi."
            actionLabel="Tambah Kebutuhan Baru"
            onAction={() => openAdd(filterSeksi !== "all" ? filterSeksi : "umum")}
          />
        )}

        {/* VIEW MODE 1: GROUPED PER SEKSI */}
        {!loading && !error && items.length > 0 && viewMode === "grouped" && (
          <div className="space-y-6">
            {groups.map((group) => {
              const groupKey = group.seksi_id || "umum";
              const isCollapsed = !!collapsedGroups[groupKey];

              return (
                <div
                  key={groupKey}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition"
                >
                  {/* Seksi Header with Subtotal & Add Button */}
                  <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                    <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => toggleGroup(groupKey)}>
                      <button
                        type="button"
                        aria-label={isCollapsed ? "Buka Seksi" : "Tutup Seksi"}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition"
                      >
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </button>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          {group.nama_seksi}
                          <Badge variant="default" className="text-[10px] py-0 px-2">
                            {group.items.length} item
                          </Badge>
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 ml-auto">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block">
                          Subtotal Seksi:
                        </span>
                        <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-300">
                          {formatRupiah(group.subtotal)}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openAdd(group.seksi_id || "umum")}
                        className="h-8 px-2.5 text-xs inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Tambah</span>
                      </Button>
                    </div>
                  </div>

                  {/* Seksi Items Table */}
                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      {group.items.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                          Belum ada item anggaran pada seksi ini. Klik &quot;Tambah&quot; untuk menginput.
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
                            {group.items.map((item, idx) => (
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
                                    onEdit={() => openEdit(item)}
                                    onDelete={() => handleDelete(item)}
                                    editTooltip="Edit Kebutuhan"
                                    deleteTooltip="Hapus dari RAB"
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

        {/* VIEW MODE 2: FLAT TABLE VIEW */}
        {!loading && !error && items.length > 0 && viewMode === "flat" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="py-3.5 px-4 w-12 text-center">No</th>
                    <th className="py-3.5 px-4">Seksi</th>
                    <th className="py-3.5 px-4">Nama Kebutuhan</th>
                    <th className="py-3.5 px-4 text-center">Volume</th>
                    <th className="py-3.5 px-4 text-right">Harga Satuan</th>
                    <th className="py-3.5 px-4 text-right font-bold">Total Biaya</th>
                    <th className="py-3.5 px-4 hidden md:table-cell">Catatan</th>
                    <th className="py-3.5 px-4 text-right w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedItems.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3.5 px-4 text-center text-slate-400 font-medium">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge variant="blue" className="text-[11px]">
                          {item.nama_seksi || "Umum / Kepanitiaan"}
                        </Badge>
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
                          onEdit={() => openEdit(item)}
                          onDelete={() => handleDelete(item)}
                          editTooltip="Edit Kebutuhan"
                          deleteTooltip="Hapus dari RAB"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={items.length}
                  itemName="kebutuhan"
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tampilan Khusus Cetak Dokumen Resmi (@media print) */}
      <RabPrintView
        groups={groups}
        items={items}
        totalAnggaran={ringkasan.totalAnggaran}
      />

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
            label: "Tambah Kebutuhan",
            icon: Plus,
            variant: "primary",
            onClick: () => openAdd("umum"),
          },
        ]}
      />

      {/* Subcomponent Modal Tambah / Edit */}
      <RabModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSave}
        form={form}
        setForm={setForm}
        seksiList={seksiList}
        isEditing={isEditing}
        submitting={submitting}
      />

      {confirmDialog}
    </main>
  );
}
