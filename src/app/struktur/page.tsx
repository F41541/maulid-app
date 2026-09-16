"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import {
  Users,
  Plus,
  Network,
  Table as TableIcon,
  Printer,
  Edit2,
  Trash2,
  Shield,
  UserCheck,
  FolderTree,
  Phone,
  FileText,
} from "lucide-react";

interface Panitia {
  id: string;
  nama: string;
  jabatan: string;
  seksi_id: string | null;
  nama_seksi?: string;
  no_hp: string | null;
  catatan: string | null;
}

interface Seksi {
  id: string;
  nama_seksi: string;
  koordinator_id: string;
  koordinator_nama: string;
  koordinator_hp: string | null;
  total_anggota: number;
  total_tugas: number;
  tugas_selesai: number;
}

export default function StrukturPage() {
  const [panitiaList, setPanitiaList] = useState<Panitia[]>([]);
  const [seksiList, setSeksiList] = useState<Seksi[]>([]);
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const [loading, setLoading] = useState(true);

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

  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/struktur");
      const data = await res.json();
      setPanitiaList(data.panitia || []);
      setSeksiList(data.seksi || []);
    } catch {
      setMessage({ text: "Gagal memuat data struktur", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
        alert(data.error || "Gagal menyimpan panitia");
      } else {
        setModalPanitiaOpen(false);
        fetchData();
      }
    } catch {
      alert("Terjadi kesalahan sistem");
    }
  };

  const handleDeletePanitia = async (id: string, nama: string) => {
    if (!confirm(`Yakin hapus panitia "${nama}"?`)) return;
    try {
      const res = await fetch("/api/struktur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_panitia", id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal menghapus panitia");
      } else {
        fetchData();
      }
    } catch {
      alert("Terjadi kesalahan sistem");
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
      koordinator_id: s.koordinator_id,
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
        alert(data.error || "Gagal menyimpan seksi");
      } else {
        setModalSeksiOpen(false);
        fetchData();
      }
    } catch {
      alert("Terjadi kesalahan sistem");
    }
  };

  const handleDeleteSeksi = async (id: string, nama: string) => {
    if (!confirm(`Yakin hapus seksi "${nama}"? Anggota akan dilepas dari seksi ini.`)) return;
    try {
      const res = await fetch("/api/struktur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_seksi", id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal menghapus seksi");
      } else {
        fetchData();
      }
    } catch {
      alert("Terjadi kesalahan sistem");
    }
  };

  // Groupings for Org Chart
  const pelindung = panitiaList.filter((p) => p.jabatan === "Pelindung");
  const penasihat = panitiaList.filter((p) => p.jabatan === "Penasihat");
  const ketua = panitiaList.filter((p) => p.jabatan === "Ketua Panitia");
  const wakil = panitiaList.filter((p) => p.jabatan === "Wakil Ketua");
  const sekretaris = panitiaList.filter((p) => p.jabatan === "Sekretaris");
  const bendahara = panitiaList.filter((p) => p.jabatan === "Bendahara");

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar userName="Admin Panitia" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-7 h-7 text-emerald-600" />
              Struktur Organisasi Panitia
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Kelola jabatan, pembagian seksi, dan penunjukan koordinator kepanitiaan.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 no-print">
            <div className="bg-white border border-slate-200 p-1 rounded-xl flex items-center shadow-xs">
              <button
                onClick={() => setViewMode("chart")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  viewMode === "chart"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                Bagan Visual
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  viewMode === "table"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                Tabel / Daftar
              </button>
            </div>

            <button
              onClick={() => window.print()}
              className="px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-xs transition"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak / PDF
            </button>

            <button
              onClick={openAddSeksi}
              className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
            >
              <FolderTree className="w-3.5 h-3.5" />
              + Seksi Baru
            </button>

            <button
              onClick={openAddPanitia}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              + Tambah Anggota
            </button>
          </div>
        </div>

        {/* View Mode: Org Chart */}
        {viewMode === "chart" && (
          <div className="space-y-8 bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-xs">
            {/* Title for print */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wide">
                Bagan Struktur Panitia Maulid Nabi Muhammad SAW
              </h2>
              <p className="text-xs text-slate-500 mt-1">Peringatan Hari Besar Islam (PHBI)</p>
            </div>

            {/* Level 1: Pelindung & Penasihat */}
            <div className="flex flex-wrap justify-center gap-6">
              {pelindung.map((p) => (
                <div
                  key={p.id}
                  className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 w-64 text-center shadow-xs relative group"
                >
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition no-print">
                    <button
                      onClick={() => openEditPanitia(p)}
                      className="p-1 hover:bg-amber-200 rounded text-amber-800"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full">
                    Pelindung
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm mt-2">{p.nama}</h3>
                  {p.catatan && <p className="text-xs text-slate-500 mt-0.5">{p.catatan}</p>}
                </div>
              ))}

              {penasihat.map((p) => (
                <div
                  key={p.id}
                  className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 w-64 text-center shadow-xs relative group"
                >
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition no-print">
                    <button
                      onClick={() => openEditPanitia(p)}
                      className="p-1 hover:bg-amber-200 rounded text-amber-800"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full">
                    Penasihat
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm mt-2">{p.nama}</h3>
                  {p.catatan && <p className="text-xs text-slate-500 mt-0.5">{p.catatan}</p>}
                </div>
              ))}
            </div>

            <div className="w-1 h-6 bg-slate-300 mx-auto"></div>

            {/* Level 2: Ketua & Wakil */}
            <div className="flex flex-wrap justify-center gap-6">
              {ketua.map((p) => (
                <div
                  key={p.id}
                  className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-4 w-64 text-center shadow-sm relative group"
                >
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition no-print">
                    <button
                      onClick={() => openEditPanitia(p)}
                      className="p-1 hover:bg-emerald-200 rounded text-emerald-800"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-200/70 px-2 py-0.5 rounded-full">
                    Ketua Panitia
                  </span>
                  <h3 className="font-bold text-slate-900 text-base mt-2">{p.nama}</h3>
                  {p.no_hp && <p className="text-xs text-slate-500 mt-0.5">{p.no_hp}</p>}
                </div>
              ))}

              {wakil.map((p) => (
                <div
                  key={p.id}
                  className="bg-emerald-50 border-2 border-emerald-400 rounded-xl p-4 w-64 text-center shadow-sm relative group"
                >
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition no-print">
                    <button
                      onClick={() => openEditPanitia(p)}
                      className="p-1 hover:bg-emerald-200 rounded text-emerald-800"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-200/70 px-2 py-0.5 rounded-full">
                    Wakil Ketua
                  </span>
                  <h3 className="font-bold text-slate-900 text-base mt-2">{p.nama}</h3>
                  {p.no_hp && <p className="text-xs text-slate-500 mt-0.5">{p.no_hp}</p>}
                </div>
              ))}
            </div>

            <div className="w-1 h-6 bg-slate-300 mx-auto"></div>

            {/* Level 3: Sekretaris & Bendahara */}
            <div className="flex flex-wrap justify-center gap-6">
              {sekretaris.map((p) => (
                <div
                  key={p.id}
                  className="bg-blue-50 border border-blue-300 rounded-xl p-4 w-56 text-center shadow-xs relative group"
                >
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition no-print">
                    <button
                      onClick={() => openEditPanitia(p)}
                      className="p-1 hover:bg-blue-200 rounded text-blue-800"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 bg-blue-200/60 px-2 py-0.5 rounded-full">
                    Sekretaris
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm mt-2">{p.nama}</h3>
                  {p.no_hp && <p className="text-xs text-slate-500 mt-0.5">{p.no_hp}</p>}
                </div>
              ))}

              {bendahara.map((p) => (
                <div
                  key={p.id}
                  className="bg-teal-50 border border-teal-300 rounded-xl p-4 w-56 text-center shadow-xs relative group"
                >
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition no-print">
                    <button
                      onClick={() => openEditPanitia(p)}
                      className="p-1 hover:bg-teal-200 rounded text-teal-800"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-200/60 px-2 py-0.5 rounded-full">
                    Bendahara
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm mt-2">{p.nama}</h3>
                  {p.no_hp && <p className="text-xs text-slate-500 mt-0.5">{p.no_hp}</p>}
                </div>
              ))}
            </div>

            <div className="w-full max-w-4xl h-0.5 bg-slate-300 mx-auto my-4"></div>

            {/* Level 4: Koordinator Seksi & Anggota */}
            <div>
              <div className="text-center mb-6">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  Koordinator Seksi & Pembagian Tugas
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {seksiList.map((s) => {
                  const members = panitiaList.filter(
                    (p) => p.seksi_id === s.id && p.id !== s.koordinator_id
                  );
                  return (
                    <div
                      key={s.id}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                            <FolderTree className="w-4 h-4 text-emerald-600" />
                            {s.nama_seksi}
                          </h4>
                          <div className="flex items-center gap-1 no-print">
                            <button
                              onClick={() => openEditSeksi(s)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSeksi(s.id, s.nama_seksi)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Koordinator Card */}
                        <div className="mt-3 bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-xs">
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">
                            Koordinator / PJ
                          </span>
                          <p className="font-semibold text-slate-900 text-xs mt-1">{s.koordinator_nama}</p>
                          {s.koordinator_hp && (
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {s.koordinator_hp}
                            </p>
                          )}
                        </div>

                        {/* Anggota List */}
                        <div className="mt-3">
                          <span className="text-[11px] font-medium text-slate-500 block mb-1">
                            Anggota ({members.length}):
                          </span>
                          {members.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">Belum ada anggota</p>
                          ) : (
                            <ul className="space-y-1">
                              {members.map((m) => (
                                <li
                                  key={m.id}
                                  className="text-xs text-slate-700 flex items-center justify-between bg-white px-2 py-1 rounded border border-slate-100"
                                >
                                  <span>{m.nama}</span>
                                  {m.no_hp && <span className="text-[10px] text-slate-400">{m.no_hp}</span>}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>

                      {/* Seksi Progress */}
                      <div className="mt-4 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 flex justify-between">
                        <span>Tugas: {s.tugas_selesai}/{s.total_tugas} Selesai</span>
                        <span>{s.total_tugas > 0 ? Math.round((s.tugas_selesai / s.total_tugas) * 100) : 0}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* View Mode: Table */}
        {viewMode === "table" && (
          <div className="space-y-6">
            {/* Tabel Panitia */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Daftar Seluruh Anggota Panitia</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Total: {panitiaList.length} orang</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Nama Lengkap</th>
                      <th className="py-3 px-4">Jabatan</th>
                      <th className="py-3 px-4">Seksi</th>
                      <th className="py-3 px-4">Kontak / No HP</th>
                      <th className="py-3 px-4">Catatan</th>
                      <th className="py-3 px-4 text-right no-print">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {panitiaList.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-4 font-medium text-slate-800">{p.nama}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                            {p.jabatan}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {p.nama_seksi ? (
                            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                              {p.nama_seksi}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-xs font-mono">
                          {p.no_hp || "-"}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-xs max-w-xs truncate">
                          {p.catatan || "-"}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1 no-print">
                          <button
                            onClick={() => openEditPanitia(p)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePanitia(p.id, p.nama)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabel Seksi */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Daftar Seksi & Penanggung Jawab</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Satu seksi wajib memiliki 1 koordinator dari panitia</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Nama Seksi</th>
                      <th className="py-3 px-4">Koordinator (Captain)</th>
                      <th className="py-3 px-4">Kontak Koordinator</th>
                      <th className="py-3 px-4">Jumlah Anggota</th>
                      <th className="py-3 px-4">Progress Tugas</th>
                      <th className="py-3 px-4 text-right no-print">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {seksiList.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-4 font-semibold text-slate-800 flex items-center gap-2">
                          <FolderTree className="w-4 h-4 text-emerald-600" />
                          {s.nama_seksi}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {s.koordinator_nama}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-xs font-mono">
                          {s.koordinator_hp || "-"}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-xs">
                          {s.total_anggota} orang
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-xs">
                          <span className="font-semibold text-emerald-700">
                            {s.tugas_selesai}/{s.total_tugas}
                          </span>{" "}
                          ({s.total_tugas > 0 ? Math.round((s.tugas_selesai / s.total_tugas) * 100) : 0}%)
                        </td>
                        <td className="py-3 px-4 text-right space-x-1 no-print">
                          <button
                            onClick={() => openEditSeksi(s)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSeksi(s.id, s.nama_seksi)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODAL TAMBAH / EDIT PANITIA */}
        {modalPanitiaOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 no-print">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4">
                {editingPanitia ? "Edit Data Panitia" : "Tambah Anggota Panitia"}
              </h3>

              <form onSubmit={handleSavePanitia} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={panitiaForm.nama}
                    onChange={(e) => setPanitiaForm({ ...panitiaForm, nama: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Contoh: Muhammad Rizky"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Jabatan *</label>
                  <select
                    required
                    value={panitiaForm.jabatan}
                    onChange={(e) => setPanitiaForm({ ...panitiaForm, jabatan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Anggota Seksi">Anggota Seksi (Default)</option>
                    <option value="Koordinator Seksi">Koordinator Seksi</option>
                    <option value="Bendahara">Bendahara</option>
                    <option value="Sekretaris">Sekretaris</option>
                    <option value="Wakil Ketua">Wakil Ketua</option>
                    <option value="Ketua Panitia">Ketua Panitia</option>
                    <option value="Penasihat">Penasihat</option>
                    <option value="Pelindung">Pelindung</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Seksi (Opsional)</label>
                  <select
                    value={panitiaForm.seksi_id}
                    onChange={(e) => setPanitiaForm({ ...panitiaForm, seksi_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">-- Tanpa Seksi (Struktural Utama) --</option>
                    {seksiList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama_seksi}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">No. HP / WhatsApp</label>
                  <input
                    type="text"
                    value={panitiaForm.no_hp}
                    onChange={(e) => setPanitiaForm({ ...panitiaForm, no_hp: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="081234567890"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Catatan</label>
                  <textarea
                    rows={2}
                    value={panitiaForm.catatan}
                    onChange={(e) => setPanitiaForm({ ...panitiaForm, catatan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Contoh: Penanggung jawab sound system masjid"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalPanitiaOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL TAMBAH / EDIT SEKSI */}
        {modalSeksiOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 no-print">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4">
                {editingSeksi ? "Edit Seksi" : "Tambah Seksi Baru"}
              </h3>

              <form onSubmit={handleSaveSeksi} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Seksi *</label>
                  <input
                    type="text"
                    required
                    value={seksiForm.nama_seksi}
                    onChange={(e) => setSeksiForm({ ...seksiForm, nama_seksi: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Contoh: Seksi Ubudiyah / Seksi Dekorasi"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Koordinator / Captain (Wajib dipilih dari panitia) *
                  </label>
                  <select
                    required
                    value={seksiForm.koordinator_id}
                    onChange={(e) => setSeksiForm({ ...seksiForm, koordinator_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="" disabled>
                      -- Pilih Koordinator --
                    </option>
                    {panitiaList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama} ({p.jabatan})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Satu seksi harus memiliki 1 penanggung jawab utama.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalSeksiOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                  >
                    Simpan Seksi
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
