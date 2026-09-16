"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import {
  UserCheck,
  Plus,
  Search,
  Filter,
  Printer,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Crown,
  Star,
  Sparkles,
  Users,
  MapPin,
  HelpCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";

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
  const [tamuList, setTamuList] = useState<Tamu[]>([]);
  const [stats, setStats] = useState<TamuStats | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterKehadiran, setFilterKehadiran] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

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

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (filterKehadiran !== "all") params.append("kehadiran", filterKehadiran);
      if (searchQuery.trim()) params.append("q", searchQuery.trim());

      const res = await fetch(`/api/tamu?${params.toString()}`);
      const data = await res.json();
      setTamuList(data.tamu || []);
      setStats(data.stats || null);
    } catch {
      alert("Gagal memuat daftar tamu undangan");
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterStatus, filterKehadiran, searchQuery]);

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
        alert(data.error || "Gagal menyimpan data tamu");
      } else {
        setModalOpen(false);
        fetchData();
      }
    } catch {
      alert("Terjadi kesalahan sistem");
    }
  };

  const handleQuickKehadiran = async (id: string, kehadiran: string) => {
    try {
      await fetch("/api/tamu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_kehadiran", id, kehadiran }),
      });
      fetchData();
    } catch {
      alert("Gagal mengubah kehadiran");
    }
  };

  const handleDelete = async (id: string, nama: string) => {
    if (!confirm(`Hapus tamu undangan "${nama}"?`)) return;
    try {
      const res = await fetch("/api/tamu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      fetchData();
    } catch {
      alert("Terjadi kesalahan sistem");
    }
  };

  const exportCSV = () => {
    const headers = "ID,Nama Tamu,Status,Alamat,Tamu Dari / Pengundang,Kehadiran,Catatan\n";
    const rows = tamuList
      .map(
        (t) =>
          `"${t.id}","${t.nama.replace(/"/g, '""')}","${t.status}","${(t.alamat || "").replace(
            /"/g,
            '""'
          )}","${(t.pengundang || "").replace(/"/g, '""')}","${t.kehadiran}","${(
            t.catatan || ""
          ).replace(/"/g, '""')}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daftar-tamu-undangan-maulid-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "VVIP":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
            <Crown className="w-3 h-3 text-amber-700" /> VVIP
          </span>
        );
      case "VIP":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-900 border border-purple-200">
            <Star className="w-3 h-3 text-purple-700" /> VIP
          </span>
        );
      case "Reguler":
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            Reguler
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar userName="Admin Panitia" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <UserCheck className="w-7 h-7 text-emerald-600" />
              Daftar Tamu Undangan
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Data undangan kehormatan Maulid Nabi, klasifikasi VVIP/VIP, alamat, dan pihak pengundang.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 no-print">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-xs transition"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak / PDF
            </button>

            <button
              onClick={exportCSV}
              className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-xs transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Ekspor CSV
            </button>

            <button
              onClick={openAdd}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              + Tambah Tamu Undangan
            </button>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print-only mb-6 text-center">
          <h2 className="text-xl font-bold text-slate-900 uppercase">
            DAFTAR TAMU UNDANGAN ACARA MAULID NABI MUHAMMAD SAW
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">Peringatan Hari Besar Islam (PHBI)</p>
        </div>

        {/* Stats Summary Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6 no-print">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500 block">Total Undangan</span>
              <span className="text-xl font-bold text-slate-800">{stats.total} orang</span>
            </div>
            <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 shadow-2xs">
              <span className="text-[11px] font-medium text-amber-800 block">VVIP</span>
              <span className="text-xl font-bold text-amber-900">{stats.vvip || 0}</span>
            </div>
            <div className="bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 shadow-2xs">
              <span className="text-[11px] font-medium text-purple-800 block">VIP</span>
              <span className="text-xl font-bold text-purple-900">{stats.vip || 0}</span>
            </div>
            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-700 block">Reguler</span>
              <span className="text-xl font-bold text-slate-800">{stats.reguler || 0}</span>
            </div>
            <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
              <span className="text-[11px] font-medium text-emerald-800 block">Konfirmasi Hadir</span>
              <span className="text-xl font-bold text-emerald-900">{stats.hadir || 0}</span>
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-6 flex flex-wrap items-center justify-between gap-4 no-print">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, alamat, pengundang..."
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Filter Status */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="all">Semua Kategori</option>
                <option value="VVIP">VVIP</option>
                <option value="VIP">VIP</option>
                <option value="Reguler">Reguler</option>
              </select>
            </div>

            {/* Filter Kehadiran */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">Kehadiran:</span>
              <select
                value={filterKehadiran}
                onChange={(e) => setFilterKehadiran(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="all">Semua Status</option>
                <option value="Hadir">Hadir</option>
                <option value="Belum Konfirmasi">Belum Konfirmasi</option>
                <option value="Tidak Hadir">Tidak Hadir</option>
              </select>
            </div>
          </div>

          {(filterStatus !== "all" || filterKehadiran !== "all" || searchQuery) && (
            <button
              onClick={() => {
                setFilterStatus("all");
                setFilterKehadiran("all");
                setSearchQuery("");
              }}
              className="text-xs text-rose-600 hover:underline"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Tabel Tamu Undangan */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Nama Tamu Undangan</th>
                  <th className="py-3 px-4">Kategori Status</th>
                  <th className="py-3 px-4">Alamat / Instansi</th>
                  <th className="py-3 px-4">Undangan Dari</th>
                  <th className="py-3 px-4">Kehadiran</th>
                  <th className="py-3 px-4">Catatan / Posisi Duduk</th>
                  <th className="py-3 px-4 text-right no-print">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tamuList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      Belum ada tamu undangan yang sesuai kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  tamuList.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {t.nama}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(t.status)}</td>
                      <td className="py-3 px-4 text-slate-600 text-xs">
                        {t.alamat ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            {t.alamat}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700 text-xs font-medium">
                        {t.pengundang || "-"}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <select
                          value={t.kehadiran}
                          onChange={(e) => handleQuickKehadiran(t.id, e.target.value)}
                          className={`px-2 py-1 rounded-md text-xs font-semibold border focus:outline-none ${
                            t.kehadiran === "Hadir"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : t.kehadiran === "Tidak Hadir"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          <option value="Belum Konfirmasi">Belum Konfirmasi</option>
                          <option value="Hadir">Hadir</option>
                          <option value="Tidak Hadir">Tidak Hadir</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs max-w-xs truncate">
                        {t.catatan || "-"}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1 no-print">
                        <button
                          onClick={() => openEdit(t)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id, t.nama)}
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

        {/* MODAL TAMBAH / EDIT TAMU */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 no-print">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4">
                {editingTamu ? "Edit Data Tamu Undangan" : "Tambah Tamu Undangan"}
              </h3>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nama Lengkap Tamu / Instansi *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.nama}
                    onChange={(e) => setForm({ ...form, nama: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Contoh: Habib Jindan bin Novel / Camat Caringin"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Status / Kategori *
                    </label>
                    <select
                      required
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="VIP">VIP (Default)</option>
                      <option value="VVIP">VVIP</option>
                      <option value="Reguler">Reguler</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Undangan Dari Siapa
                    </label>
                    <input
                      type="text"
                      value={form.pengundang}
                      onChange={(e) => setForm({ ...form, pengundang: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      placeholder="Contoh: Ketua Panitia / Humas"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Alamat / Domisili / Lembaga
                  </label>
                  <input
                    type="text"
                    value={form.alamat}
                    onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Contoh: RT 03 / Ponpes Darul Ulum"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Konfirmasi Kehadiran
                  </label>
                  <select
                    value={form.kehadiran}
                    onChange={(e) => setForm({ ...form, kehadiran: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Hadir">Hadir (Default)</option>
                    <option value="Belum Konfirmasi">Belum Konfirmasi</option>
                    <option value="Tidak Hadir">Tidak Hadir</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Catatan Khusus (Kursi Depan, Sambutan, dll)
                  </label>
                  <textarea
                    rows={2}
                    value={form.catatan}
                    onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Contoh: Disediakan karpet VVIP baris depan"
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
                    Simpan Tamu
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
