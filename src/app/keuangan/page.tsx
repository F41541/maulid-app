"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Navbar from "@/components/Navbar";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Printer,
  FileSpreadsheet,
  ArrowLeftRight,
  CreditCard,
  Banknote,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { SpeedDialActions } from "@/components/shared/SpeedDialActions";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SkeletonTableRow } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatRupiah, formatTanggal, getTodayString } from "@/lib/format";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/use-confirm";
import { useAuth } from "@/lib/use-auth";
import { TransaksiModal } from "./components/TransaksiModal";
import { MutasiModal } from "./components/MutasiModal";
import { VoidModal } from "./components/VoidModal";

interface Transaksi {
  id: string;
  tipe: "masuk" | "keluar";
  tanggal: string;
  keterangan: string;
  nominal: number;
  metode: "cash" | "transfer";
  kategori?: string | null;
  status?: "aktif" | "void" | "reversal" | null;
  void_reason?: string | null;
  void_by?: string | null;
  void_at?: string | null;
  void_ref_id?: string | null;
  pair_id?: string | null;
}

interface Ringkasan {
  totalMasuk: number;
  totalKeluar: number;
  saldoTotal: number;
  cashMasuk: number;
  cashKeluar: number;
  saldoCash: number;
  transferMasuk: number;
  transferKeluar: number;
  saldoRekening: number;
}

export default function KeuanganPage() {
  const toast = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const { user: currentUser } = useAuth();
  const [transaksiList, setTransaksiList] = useState<Transaksi[]>([]);
  const [ringkasan, setRingkasan] = useState<Ringkasan>({
    totalMasuk: 0,
    totalKeluar: 0,
    saldoTotal: 0,
    cashMasuk: 0,
    cashKeluar: 0,
    saldoCash: 0,
    transferMasuk: 0,
    transferKeluar: 0,
    saldoRekening: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTipe, setFilterTipe] = useState("all");
  const [filterMetode, setFilterMetode] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "aktif" | "void">("aktif");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Pagination (20 transaksi per halaman)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Modal Transaksi biasa
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    tipe: "masuk" as "masuk" | "keluar",
    tanggal: getTodayString(),
    keterangan: "",
    nominal: "",
    metode: "cash" as "cash" | "transfer",
  });

  // Modal Mutasi Internal (Cash <-> Rekening)
  const [modalMutasiOpen, setModalMutasiOpen] = useState(false);
  const [mutasiForm, setMutasiForm] = useState({
    dari: "cash" as "cash" | "transfer",
    ke: "transfer" as "cash" | "transfer",
    nominal: "",
    tanggal: getTodayString(),
    catatan: "",
  });

  // Modal Void Transaksi
  const [modalVoidOpen, setModalVoidOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<Transaksi | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterTipe !== "all") params.append("tipe", filterTipe);
      if (filterMetode !== "all") params.append("metode", filterMetode);
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(`/api/keuangan?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal mengambil data kas.");
      const data = await res.json();
      setTransaksiList(data.transaksi || []);
      setRingkasan(
        data.ringkasan || {
          totalMasuk: 0,
          totalKeluar: 0,
          saldoTotal: 0,
          cashMasuk: 0,
          cashKeluar: 0,
          saldoCash: 0,
          transferMasuk: 0,
          transferKeluar: 0,
          saldoRekening: 0,
        }
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Terjadi kesalahan sistem saat memuat kas";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [filterTipe, filterMetode, filterStatus, startDate, endDate, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived pagination list
  const totalPages = Math.max(1, Math.ceil(transaksiList.length / itemsPerPage));
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return transaksiList.slice(start, start + itemsPerPage);
  }, [transaksiList, currentPage, itemsPerPage]);

  const openAdd = (tipe: "masuk" | "keluar", defaultMetode: "cash" | "transfer" = "cash") => {
    setForm({
      tipe,
      tanggal: getTodayString(),
      keterangan: "",
      nominal: "",
      metode: defaultMetode,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/keuangan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal menyimpan transaksi");
      } else {
        toast.success("Transaksi berhasil dicatat");
        setModalOpen(false);
        fetchData();
      }
    } catch {
      toast.error("Terjadi kesalahan sistem");
    }
  };

  const handleMutasi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mutasiForm.dari === mutasiForm.ke) {
      toast.error("Sumber dana dan tujuan mutasi tidak boleh sama");
      return;
    }
    const nominalNum = parseFloat(mutasiForm.nominal);
    if (!nominalNum || nominalNum <= 0) {
      toast.error("Nominal mutasi harus lebih besar dari 0");
      return;
    }

    try {
      const res = await fetch("/api/keuangan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mutasi_internal", ...mutasiForm }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal memproses mutasi kas");
      } else {
        toast.success("Mutasi kas berhasil dicatat!");
        setModalMutasiOpen(false);
        setMutasiForm({
          dari: "cash",
          ke: "transfer",
          nominal: "",
          tanggal: getTodayString(),
          catatan: "",
        });
        fetchData();
      }
    } catch {
      toast.error("Terjadi kesalahan sistem");
    }
  };

  const openVoidModal = (item: Transaksi) => {
    setVoidTarget(item);
    setVoidReason("");
    setModalVoidOpen(true);
  };

  const handleConfirmVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidTarget) return;
    if (!voidReason.trim()) {
      toast.error("Alasan pembatalan / void wajib diisi untuk audit trail");
      return;
    }
    try {
      const res = await fetch("/api/keuangan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "void",
          id: voidTarget.id,
          reason: voidReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal membatalkan transaksi");
      } else {
        toast.success("Transaksi berhasil di-void (dibatalkan)");
        setModalVoidOpen(false);
        setVoidTarget(null);
        fetchData();
      }
    } catch {
      toast.error("Terjadi kesalahan sistem saat memproses void");
    }
  };

  const exportExcel = async () => {
    try {
      const params = new URLSearchParams();
      if (filterTipe !== "all") params.append("tipe", filterTipe);
      if (filterMetode !== "all") params.append("metode", filterMetode);
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(`/api/keuangan?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal mengambil data kas dari database");
      const data = await res.json();
      const allRows: Transaksi[] = data.transaksi || [];

      if (allRows.length === 0) {
        toast.error("Tidak ada transaksi untuk diekspor sesuai filter saat ini");
        return;
      }

      const sanitizeFormula = (val: unknown) => {
        if (typeof val === "string" && ["=", "+", "-", "@"].includes(val.charAt(0))) {
          return `'${val}`;
        }
        return val;
      };

      const rows = allRows.map((t, idx) => [
        idx + 1,
        sanitizeFormula(t.id),
        t.tipe === "masuk" ? "Kas Masuk" : "Kas Keluar",
        t.metode === "cash" ? "Dompet Tunai" : "Rekening Bank",
        t.status === "void" ? "Dibatalkan / Void" : "Aktif",
        sanitizeFormula(t.tanggal),
        sanitizeFormula(t.keterangan),
        t.nominal,
        sanitizeFormula(t.void_reason || "-"),
      ]);

      const worksheetData = [
        ["No", "ID Transaksi", "Tipe", "Metode", "Status", "Tanggal", "Keterangan", "Nominal (Rp)", "Alasan Void"],
        ...rows,
      ];

      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Laporan Kas");
      XLSX.writeFile(wb, `laporan-kas-maulid-${getTodayString()}.xlsx`);
      toast.success(`Berhasil mengekspor ${allRows.length} transaksi ke Excel`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengekspor data ke Excel";
      toast.error(msg);
    }
  };

  return (
    <Navbar
      userName={currentUser?.nama}
      userRole={currentUser?.role}
      userJabatan={currentUser?.jabatan}
    >
      <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 transition-colors w-full min-w-0">

        {/* 3 Main Balance Cards (Cash, Rekening, Total) */}
        {/* Balance Cards: Total Saldo (Full Width, Warna Putih) diikuti Saldo Dompet & Saldo Rekening (Dibagi 2) */}
        <div className="space-y-5 mb-8">
          {/* Card 1: Total Semua Saldo (Full Width & Warna Putih) */}
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition text-slate-900 dark:text-white">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Semua Saldo Kas (Keseluruhan)
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-1">
              {formatRupiah(ringkasan.saldoTotal)}
            </h2>
            <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap justify-between gap-2">
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                Total Masuk: +{formatRupiah(ringkasan.totalMasuk)}
              </span>
              <span className="font-medium text-rose-600 dark:text-rose-400">
                Total Keluar: -{formatRupiah(ringkasan.totalKeluar)}
              </span>
            </div>
          </div>

          {/* Sub Cards: Saldo Dompet & Saldo Rekening (Dibagi 2) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Card 2: Dompet Cash */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:shadow-md transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Saldo Dompet (Tunai / Cash)
                </span>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
                  <Banknote className="w-5 h-5" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {formatRupiah(ringkasan.saldoCash)}
              </h2>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
                <span>Masuk: +{formatRupiah(ringkasan.cashMasuk)}</span>
                <span>Keluar: -{formatRupiah(ringkasan.cashKeluar)}</span>
              </div>
            </div>

            {/* Card 3: Rekening Bank */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:shadow-md transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Saldo Rekening (Transfer Bank)
                </span>
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {formatRupiah(ringkasan.saldoRekening)}
              </h2>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
                <span>Masuk: +{formatRupiah(ringkasan.transferMasuk)}</span>
                <span>Keluar: -{formatRupiah(ringkasan.transferKeluar)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs mb-6 no-print w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 w-full items-end">
            {/* Filter Tipe */}
            <div className="flex flex-col gap-1 w-full min-w-0">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Tipe:</span>
              <select
                value={filterTipe}
                onChange={(e) => {
                  setFilterTipe(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter Tipe Transaksi"
                className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 min-h-[44px] bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Semua Tipe</option>
                <option value="masuk">Kas Masuk</option>
                <option value="keluar">Kas Keluar</option>
              </select>
            </div>

            {/* Filter Metode */}
            <div className="flex flex-col gap-1 w-full min-w-0">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Kanal Saldo:</span>
              <select
                value={filterMetode}
                onChange={(e) => {
                  setFilterMetode(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter Kanal Saldo"
                className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 min-h-[44px] bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Semua Kanal</option>
                <option value="cash">Dompet (Cash)</option>
                <option value="transfer">Rekening (Transfer)</option>
              </select>
            </div>

            {/* Filter Status */}
            <div className="flex flex-col gap-1 w-full min-w-0">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value as "aktif" | "void" | "all");
                  setCurrentPage(1);
                }}
                aria-label="Filter Status Transaksi"
                className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 min-h-[44px] bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="aktif">Aktif</option>
                <option value="void">Dibatalkan / Void</option>
                <option value="all">Semua Status</option>
              </select>
            </div>

            {/* Filter Rentang Tanggal (Dari s/d Sampai) */}
            <div className="flex flex-col gap-1 w-full min-w-0">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Dari:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter Dari Tanggal"
                className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 min-h-[44px] bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-col gap-1 w-full min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Sampai:</span>
                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                      setCurrentPage(1);
                    }}
                    className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:underline flex items-center gap-1 cursor-pointer"
                    title="Reset filter tanggal"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Reset Tanggal</span>
                  </button>
                )}
              </div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter Sampai Tanggal"
                className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 min-h-[44px] bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Tabel Transaksi */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-sm min-w-[640px]">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Tipe</th>
                  <th className="py-3.5 px-4">Metode / Kanal</th>
                  <th className="py-3.5 px-4">Tanggal</th>
                  <th className="py-3.5 px-4">Keterangan (Dari Siapa / Untuk Apa)</th>
                  <th className="py-3.5 px-4 text-right">Nominal</th>
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
                ) : transaksiList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6">
                      <EmptyState
                        icon={Wallet}
                        title="Belum Ada Transaksi"
                        description={
                          filterTipe !== "all" ||
                          filterMetode !== "all" ||
                          filterStatus !== "aktif"
                            ? "Tidak ada transaksi yang cocok dengan kombinasi filter yang dipilih."
                            : "Belum ada transaksi kas yang dicatat untuk kepanitiaan ini."
                        }
                        actionLabel="+ Catat Kas Masuk"
                        onAction={() => openAdd("masuk")}
                        secondaryActionLabel={
                          filterTipe !== "all" ||
                          filterMetode !== "all" ||
                          filterStatus !== "aktif"
                            ? "Reset Filter"
                            : undefined
                        }
                        onSecondaryAction={() => {
                          setFilterTipe("all");
                          setFilterMetode("all");
                          setFilterStatus("aktif");
                        }}
                      />
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((t, idx) => {
                    const isVoid = t.status === "void" || t.status === "reversal";
                    return (
                      <tr
                        key={t.id}
                        style={{ animationDelay: `${Math.min(idx * 35, 350)}ms` }}
                        className={`animate-stagger-item transition ${
                          isVoid
                            ? "bg-slate-50/90 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500"
                            : "hover:bg-slate-50/60 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            {t.tipe === "masuk" ? (
                              <Badge
                                variant={isVoid ? "default" : "primary"}
                                icon={<ArrowDownLeft className="w-3 h-3" />}
                              >
                                Masuk
                              </Badge>
                            ) : (
                              <Badge
                                variant={isVoid ? "default" : "danger"}
                                icon={<ArrowUpRight className="w-3 h-3" />}
                              >
                                Keluar
                              </Badge>
                            )}
                            {t.status === "void" && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 px-1.5 py-0.5 rounded">
                                VOID
                              </span>
                            )}
                            {t.status === "reversal" && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded">
                                PEMBALIK
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {t.metode === "transfer" ? (
                            <Badge
                              variant={isVoid ? "default" : "blue"}
                              icon={<CreditCard className="w-3 h-3 text-blue-600 dark:text-blue-400" />}
                            >
                              Rekening Bank
                            </Badge>
                          ) : (
                            <Badge
                              variant={isVoid ? "default" : "primary"}
                              icon={<Banknote className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                            >
                              Dompet Cash
                            </Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatTanggal(t.tanggal)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span
                              className={`font-semibold text-slate-800 dark:text-slate-200 ${
                                isVoid ? "line-through text-slate-400 dark:text-slate-500" : ""
                              }`}
                            >
                              {t.keterangan}
                            </span>
                            {t.kategori === "mutasi_internal" && (
                              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                                ⇄ Mutasi Internal
                              </span>
                            )}
                            {t.status === "void" && t.void_reason && (
                              <span className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5 italic">
                                Alasan Void: &quot;{t.void_reason}&quot;
                              </span>
                            )}
                            {t.status === "reversal" && t.void_reason && (
                              <span className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 italic">
                                Catatan Pembalik: &quot;{t.void_reason}&quot;
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold">
                          <span
                            className={
                              isVoid
                                ? "text-slate-400 dark:text-slate-600 line-through"
                                : t.tipe === "masuk"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }
                          >
                            {t.tipe === "masuk" ? "+" : "-"}
                            {formatRupiah(t.nominal)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right no-print">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isVoid ? (
                              <button
                                type="button"
                                onClick={() => openVoidModal(t)}
                                title="Batalkan (Void Transaksi)"
                                aria-label="Batalkan (Void Transaksi)"
                                className="min-h-[44px] sm:min-h-[32px] min-w-[44px] px-3 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl border border-rose-200 dark:border-rose-800 transition-all duration-150 ease-[var(--spring-snappy)] active:scale-95 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-500 focus-visible:outline-none cursor-pointer"
                              >
                                Void
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 italic px-2">Dibatalkan</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Kontrol Pagination (20 transaksi per halaman) */}
          {!loading && !error && transaksiList.length > 0 && (
            <div className="px-4 py-3.5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30 no-print">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, transaksiList.length)} dari {transaksiList.length} transaksi
              </span>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                    onClick={() => setCurrentPage(pageNum)}
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
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 cursor-pointer"
                  aria-label="Halaman Selanjutnya"
                >
                  <span>Selanjutnya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Floating Speed Dial Actions di Kanan Bawah */}
        <SpeedDialActions
          triggerLabel="Aksi Keuangan"
          actions={[
            {
              label: "Cetak / PDF",
              icon: Printer,
              variant: "secondary",
              onClick: () => window.print(),
            },
            {
              label: "Ekspor Excel (.xlsx)",
              icon: FileSpreadsheet,
              variant: "outline",
              onClick: exportExcel,
            },
            {
              label: "Mutasi Antar-Kas",
              icon: ArrowLeftRight,
              variant: "blue",
              onClick: () => setModalMutasiOpen(true),
            },
            {
              label: "+ Kas Masuk",
              icon: Plus,
              variant: "primary",
              onClick: () => openAdd("masuk"),
            },
            {
              label: "+ Kas Keluar",
              icon: Plus,
              variant: "danger",
              onClick: () => openAdd("keluar"),
            },
          ]}
        />

        {/* Subcomponent Modals */}
        <TransaksiModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSave}
          form={form}
          setForm={setForm}
        />

        <MutasiModal
          isOpen={modalMutasiOpen}
          onClose={() => setModalMutasiOpen(false)}
          onSubmit={handleMutasi}
          mutasiForm={mutasiForm}
          setMutasiForm={setMutasiForm}
        />

        <VoidModal
          isOpen={modalVoidOpen}
          onClose={() => setModalVoidOpen(false)}
          onSubmit={handleConfirmVoid}
          voidTarget={voidTarget}
          voidReason={voidReason}
          setVoidReason={setVoidReason}
        />

        {confirmDialog}
      </main>
    </Navbar>
  );
}
