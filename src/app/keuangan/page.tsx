"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Printer,
  FileSpreadsheet,
  Edit2,
  Trash2,
  ArrowLeftRight,
  CreditCard,
  Banknote,
  DollarSign,
} from "lucide-react";

interface Transaksi {
  id: string;
  tipe: "masuk" | "keluar";
  tanggal: string;
  keterangan: string;
  nominal: number;
  metode: "cash" | "transfer";
  kategori?: string | null;
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
  const [filterTipe, setFilterTipe] = useState("all");
  const [filterMetode, setFilterMetode] = useState("all");

  // Modal Transaksi biasa
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaksi, setEditingTransaksi] = useState<Transaksi | null>(null);
  const [form, setForm] = useState({
    tipe: "masuk" as "masuk" | "keluar",
    tanggal: new Date().toISOString().split("T")[0],
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
    tanggal: new Date().toISOString().split("T")[0],
    catatan: "",
  });

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (filterTipe !== "all") params.append("tipe", filterTipe);
      if (filterMetode !== "all") params.append("metode", filterMetode);

      const res = await fetch(`/api/keuangan?${params.toString()}`);
      const data = await res.json();
      setTransaksiList(data.transaksi || []);
      if (data.ringkasan) {
        setRingkasan(data.ringkasan);
      }
    } catch {
      alert("Gagal memuat catatan keuangan");
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterTipe, filterMetode]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const openAdd = (tipe: "masuk" | "keluar", defaultMetode: "cash" | "transfer" = "cash") => {
    setEditingTransaksi(null);
    setForm({
      tipe,
      tanggal: new Date().toISOString().split("T")[0],
      keterangan: "",
      nominal: "",
      metode: defaultMetode,
    });
    setModalOpen(true);
  };

  const openEdit = (item: Transaksi) => {
    setEditingTransaksi(item);
    setForm({
      tipe: item.tipe,
      tanggal: item.tanggal,
      keterangan: item.keterangan,
      nominal: item.nominal.toString(),
      metode: item.metode || "cash",
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const action = editingTransaksi ? "update" : "create";
    try {
      const res = await fetch("/api/keuangan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id: editingTransaksi?.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal menyimpan transaksi");
      } else {
        setModalOpen(false);
        fetchData();
      }
    } catch {
      alert("Terjadi kesalahan sistem");
    }
  };

  const handleMutasi = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/keuangan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mutasi_internal", ...mutasiForm }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal melakukan mutasi dana");
      } else {
        setModalMutasiOpen(false);
        setMutasiForm({
          dari: "cash",
          ke: "transfer",
          nominal: "",
          tanggal: new Date().toISOString().split("T")[0],
          catatan: "",
        });
        fetchData();
      }
    } catch {
      alert("Terjadi kesalahan sistem");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus catatan transaksi ini?")) return;
    try {
      const res = await fetch("/api/keuangan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      fetchData();
    } catch {
      alert("Terjadi kesalahan");
    }
  };

  const exportCSV = () => {
    const headers = "ID,Tipe,Metode,Tanggal,Keterangan,Nominal\n";
    const rows = transaksiList
      .map(
        (t) =>
          `"${t.id}","${t.tipe}","${t.metode}","${t.tanggal}","${t.keterangan.replace(
            /"/g,
            '""'
          )}",${t.nominal}`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-kas-maulid-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar userName="Admin Panitia" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Wallet className="w-7 h-7 text-emerald-600" />
              Manajemen Saldo Kas Acara
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Transparansi saldo Dompet Tunai (Cash) &amp; Rekening Bank (Transfer) serta mutasi antar-kas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 no-print">
            <button
              onClick={() => window.print()}
              className="px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-xs transition"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak / PDF
            </button>

            <button
              onClick={exportCSV}
              className="px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-xs transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Ekspor CSV
            </button>

            <button
              onClick={() => setModalMutasiOpen(true)}
              className="px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Mutasi (Cash ⇋ Rekening)
            </button>

            <button
              onClick={() => openAdd("masuk")}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              + Kas Masuk
            </button>

            <button
              onClick={() => openAdd("keluar")}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              + Kas Keluar
            </button>
          </div>
        </div>

        {/* 3 Main Balance Cards (Cash, Rekening, Total) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {/* Card 1: Dompet Cash */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-emerald-600" />
                Saldo Dompet (Tunai / Cash)
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Tunai
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">
              {formatRupiah(ringkasan.saldoCash)}
            </h2>
            <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
              <span>Masuk: +{formatRupiah(ringkasan.cashMasuk)}</span>
              <span>Keluar: -{formatRupiah(ringkasan.cashKeluar)}</span>
            </div>
          </div>

          {/* Card 2: Rekening Bank */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-blue-600" />
                Saldo Rekening (Transfer Bank)
              </span>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                Bank
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">
              {formatRupiah(ringkasan.saldoRekening)}
            </h2>
            <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
              <span>Masuk: +{formatRupiah(ringkasan.transferMasuk)}</span>
              <span>Keluar: -{formatRupiah(ringkasan.transferKeluar)}</span>
            </div>
          </div>

          {/* Card 3: Total Semua Saldo */}
          <div className="bg-gradient-to-br from-slate-900 to-emerald-950 p-6 rounded-2xl text-white shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-200 flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-emerald-400" />
                Total Semua Saldo (Keseluruhan)
              </span>
              <span className="text-[11px] font-bold text-white bg-emerald-700/60 px-2 py-0.5 rounded-full">
                Grand Total
              </span>
            </div>
            <h2 className="text-3xl font-extrabold text-emerald-300 mt-1">
              {formatRupiah(ringkasan.saldoTotal)}
            </h2>
            <div className="mt-3 pt-3 border-t border-white/10 text-[11px] text-emerald-100/70 flex justify-between">
              <span>Total Masuk: +{formatRupiah(ringkasan.totalMasuk)}</span>
              <span>Total Keluar: -{formatRupiah(ringkasan.totalKeluar)}</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs mb-6 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Tipe */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500">Tipe:</span>
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs">
                <button
                  onClick={() => setFilterTipe("all")}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    filterTipe === "all" ? "bg-white text-slate-800 shadow-2xs" : "text-slate-600"
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setFilterTipe("masuk")}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    filterTipe === "masuk"
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "text-slate-600"
                  }`}
                >
                  Kas Masuk
                </button>
                <button
                  onClick={() => setFilterTipe("keluar")}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    filterTipe === "keluar"
                      ? "bg-rose-600 text-white shadow-2xs"
                      : "text-slate-600"
                  }`}
                >
                  Kas Keluar
                </button>
              </div>
            </div>

            {/* Filter Metode */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500">Kanal Saldo:</span>
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs">
                <button
                  onClick={() => setFilterMetode("all")}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    filterMetode === "all"
                      ? "bg-white text-slate-800 shadow-2xs"
                      : "text-slate-600"
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setFilterMetode("cash")}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    filterMetode === "cash"
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "text-slate-600"
                  }`}
                >
                  Dompet (Cash)
                </button>
                <button
                  onClick={() => setFilterMetode("transfer")}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    filterMetode === "transfer"
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "text-slate-600"
                  }`}
                >
                  Rekening (Transfer)
                </button>
              </div>
            </div>
          </div>

          {(filterTipe !== "all" || filterMetode !== "all") && (
            <button
              onClick={() => {
                setFilterTipe("all");
                setFilterMetode("all");
              }}
              className="text-xs text-rose-600 hover:underline"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Tabel Transaksi */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Tipe</th>
                  <th className="py-3.5 px-4">Metode / Kanal</th>
                  <th className="py-3.5 px-4">Tanggal</th>
                  <th className="py-3.5 px-4">Keterangan (Dari Siapa / Untuk Apa)</th>
                  <th className="py-3.5 px-4 text-right">Nominal</th>
                  <th className="py-3.5 px-4 text-right no-print">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transaksiList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      Belum ada transaksi yang sesuai kriteria.
                    </td>
                  </tr>
                ) : (
                  transaksiList.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4">
                        {t.tipe === "masuk" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            <ArrowDownLeft className="w-3 h-3" />
                            Masuk
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                            <ArrowUpRight className="w-3 h-3" />
                            Keluar
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {t.metode === "transfer" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                            <CreditCard className="w-3 h-3 text-blue-600" />
                            Rekening Bank
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            <Banknote className="w-3 h-3 text-emerald-600" />
                            Dompet Cash
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-600">{t.tanggal}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {t.keterangan}
                        {t.kategori === "mutasi_internal" && (
                          <span className="ml-2 text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                            Mutasi
                          </span>
                        )}
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-semibold text-sm ${
                          t.tipe === "masuk" ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {t.tipe === "masuk" ? "+" : "-"} {formatRupiah(t.nominal)}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1 no-print">
                        <button
                          onClick={() => openEdit(t)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL TRANSAKSI BIASA */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 no-print">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4">
                {editingTransaksi ? "Edit Catatan Keuangan" : "Tambah Catatan Kas"}
              </h3>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Jenis Transaksi *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, tipe: "masuk" })}
                      className={`py-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition ${
                        form.tipe === "masuk"
                          ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      Kas Masuk
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, tipe: "keluar" })}
                      className={`py-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition ${
                        form.tipe === "keluar"
                          ? "bg-rose-50 border-rose-500 text-rose-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      Kas Keluar
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Metode Pembayaran / Kanal Saldo *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, metode: "cash" })}
                      className={`py-2 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition ${
                        form.metode === "cash"
                          ? "bg-emerald-50 border-emerald-500 text-emerald-800 font-bold"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      Dompet Tunai (Cash)
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, metode: "transfer" })}
                      className={`py-2 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition ${
                        form.metode === "transfer"
                          ? "bg-blue-50 border-blue-500 text-blue-800 font-bold"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Rekening (Transfer)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Tanggal Transaksi *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.tanggal}
                    onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {form.tipe === "masuk"
                      ? "Dari Siapa (Sumber Dana / Donatur) *"
                      : "Untuk Apa (Keperluan Pengeluaran) *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={form.keterangan}
                    onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder={
                      form.tipe === "masuk"
                        ? "Contoh: Infaq Jamaah Jumat / Donatur Hamba Allah"
                        : "Contoh: DP Sewa Tenda & Sound System"
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nominal Rupiah (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={form.nominal}
                    onChange={(e) => setForm({ ...form, nominal: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                    placeholder="Contoh: 1500000"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                  >
                    Simpan Transaksi
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL MUTASI INTERNAL (CASH <-> REKENING) */}
        {modalMutasiOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 no-print">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-blue-600" />
                Mutasi Kas Internal (Cash ⇋ Rekening)
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Pencatatan perpindahan fisik saldo (misal: setor tunai dompet ke bank atau tarik tunai ATM ke dompet panitia).
              </p>

              <form onSubmit={handleMutasi} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Dari (Sumber Dana) *
                    </label>
                    <select
                      value={mutasiForm.dari}
                      onChange={(e) => {
                        const dariVal = e.target.value as "cash" | "transfer";
                        setMutasiForm({
                          ...mutasiForm,
                          dari: dariVal,
                          ke: dariVal === "cash" ? "transfer" : "cash",
                        });
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="cash">Dompet (Tunai / Cash)</option>
                      <option value="transfer">Rekening (Bank)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Ke (Tujuan Saldo) *
                    </label>
                    <select
                      value={mutasiForm.ke}
                      onChange={(e) => {
                        const keVal = e.target.value as "cash" | "transfer";
                        setMutasiForm({
                          ...mutasiForm,
                          ke: keVal,
                          dari: keVal === "cash" ? "transfer" : "cash",
                        });
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="transfer">Rekening (Bank)</option>
                      <option value="cash">Dompet (Tunai / Cash)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nominal Mutasi (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={mutasiForm.nominal}
                    onChange={(e) => setMutasiForm({ ...mutasiForm, nominal: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                    placeholder="Contoh: 1000000"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Tanggal Mutasi *
                  </label>
                  <input
                    type="date"
                    required
                    value={mutasiForm.tanggal}
                    onChange={(e) => setMutasiForm({ ...mutasiForm, tanggal: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Keterangan Tambahan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={mutasiForm.catatan}
                    onChange={(e) => setMutasiForm({ ...mutasiForm, catatan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Contoh: Tarik tunai ATM untuk konsumsi hari-H"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalMutasiOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
                  >
                    Proses Mutasi Saldo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
