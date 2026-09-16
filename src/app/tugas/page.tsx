"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import {
  CheckSquare,
  Plus,
  Filter,
  Clock,
  User,
  FolderTree,
  AlertCircle,
  CheckCircle2,
  Hourglass,
  Edit2,
  Trash2,
} from "lucide-react";

interface TugasItem {
  id: string;
  seksi_id: string;
  nama_seksi: string;
  nama_tugas: string;
  deskripsi: string | null;
  status: "Belum Mulai" | "Proses" | "Selesai";
  deadline: string | null;
  pj_id: string | null;
  pj_nama: string | null;
  pj_hp: string | null;
}

interface SeksiOption {
  id: string;
  nama_seksi: string;
}

interface PanitiaOption {
  id: string;
  nama: string;
  jabatan: string;
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
  const [tugasList, setTugasList] = useState<TugasItem[]>([]);
  const [seksiList, setSeksiList] = useState<SeksiOption[]>([]);
  const [panitiaList, setPanitiaList] = useState<PanitiaOption[]>([]);
  const [progressStats, setProgressStats] = useState<ProgressStat[]>([]);

  const [filterSeksi, setFilterSeksi] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTugas, setEditingTugas] = useState<TugasItem | null>(null);

  const [form, setForm] = useState({
    seksi_id: "",
    nama_tugas: "",
    deskripsi: "",
    status: "Belum Mulai" as "Belum Mulai" | "Proses" | "Selesai",
    deadline: "",
    pj_id: "",
  });

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (filterSeksi) params.append("seksi_id", filterSeksi);
      if (filterStatus) params.append("status", filterStatus);

      const res = await fetch(`/api/tugas?${params.toString()}`);
      const data = await res.json();
      setTugasList(data.tugas || []);
      setSeksiList(data.seksi || []);
      setPanitiaList(data.panitia || []);
      setProgressStats(data.progressStats || []);
    } catch {
      alert("Gagal memuat tugas");
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterSeksi, filterStatus]);

  const openAdd = () => {
    setEditingTugas(null);
    setForm({
      seksi_id: seksiList[0]?.id || "",
      nama_tugas: "",
      deskripsi: "",
      status: "Belum Mulai",
      deadline: "",
      pj_id: "",
    });
    setModalOpen(true);
  };

  const openEdit = (tugas: TugasItem) => {
    setEditingTugas(tugas);
    setForm({
      seksi_id: tugas.seksi_id,
      nama_tugas: tugas.nama_tugas,
      deskripsi: tugas.deskripsi || "",
      status: tugas.status,
      deadline: tugas.deadline || "",
      pj_id: tugas.pj_id || "",
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
        alert(data.error || "Gagal menyimpan tugas");
      } else {
        setModalOpen(false);
        fetchData();
      }
    } catch {
      alert("Terjadi kesalahan sistem");
    }
  };

  const handleQuickStatusChange = async (id: string, newStatus: string) => {
    try {
      await fetch("/api/tugas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_status", id, status: newStatus }),
      });
      fetchData();
    } catch {
      alert("Gagal memperbarui status");
    }
  };

  const handleDelete = async (id: string, nama: string) => {
    if (!confirm(`Hapus tugas "${nama}"?`)) return;
    try {
      const res = await fetch("/api/tugas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      fetchData();
    } catch {
      alert("Terjadi kesalahan");
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
              <CheckSquare className="w-7 h-7 text-emerald-600" />
              Manajemen Tugas per Seksi
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Pantau checklist persiapan, penanggung jawab tugas, dan deadline tiap seksi.
            </p>
          </div>

          <button
            onClick={openAdd}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            + Tambah Tugas
          </button>
        </div>

        {/* Progress Cards per Seksi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {progressStats.map((stat) => {
            const pct = stat.total > 0 ? Math.round((stat.selesai / stat.total) * 100) : 0;
            return (
              <div
                key={stat.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-800 text-sm truncate">{stat.nama_seksi}</h3>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    {pct}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 mb-3 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{stat.selesai} Selesai</span>
                  <span>{stat.proses} Proses</span>
                  <span>{stat.belum_mulai} Belum</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filter Controls */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Filter className="w-4 h-4 text-slate-400" />
            Filter Data:
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Seksi:</label>
            <select
              value={filterSeksi}
              onChange={(e) => setFilterSeksi(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">Semua Seksi</option>
              {seksiList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama_seksi}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">Semua Status</option>
              <option value="Belum Mulai">Belum Mulai</option>
              <option value="Proses">Proses</option>
              <option value="Selesai">Selesai</option>
            </select>
          </div>

          {(filterSeksi || filterStatus) && (
            <button
              onClick={() => {
                setFilterSeksi("");
                setFilterStatus("");
              }}
              className="text-xs text-rose-600 hover:underline ml-auto"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Task List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="divide-y divide-slate-100">
            {tugasList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Tidak ada tugas yang sesuai filter.
              </div>
            ) : (
              tugasList.map((tugas) => (
                <div
                  key={tugas.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <FolderTree className="w-3 h-3" />
                        {tugas.nama_seksi}
                      </span>

                      {/* Status Badges */}
                      {tugas.status === "Selesai" && (
                        <span className="text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Selesai
                        </span>
                      )}
                      {tugas.status === "Proses" && (
                        <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Hourglass className="w-3 h-3" />
                          Proses
                        </span>
                      )}
                      {tugas.status === "Belum Mulai" && (
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Belum Mulai
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      {tugas.nama_tugas}
                    </h3>

                    {tugas.deskripsi && (
                      <p className="text-xs text-slate-500 max-w-2xl">{tugas.deskripsi}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                      {tugas.pj_nama && (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          PJ: <strong className="text-slate-800">{tugas.pj_nama}</strong>
                        </span>
                      )}
                      {tugas.deadline && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Deadline: <strong className="text-slate-800">{tugas.deadline}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions & quick status change */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <select
                      value={tugas.status}
                      onChange={(e) => handleQuickStatusChange(tugas.id, e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-slate-700"
                    >
                      <option value="Belum Mulai">Belum Mulai</option>
                      <option value="Proses">Proses</option>
                      <option value="Selesai">Selesai</option>
                    </select>

                    <button
                      onClick={() => openEdit(tugas)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(tugas.id, tugas.nama_tugas)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal Tugas */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4">
                {editingTugas ? "Edit Tugas Seksi" : "Tambah Tugas Baru"}
              </h3>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Seksi Terkait *
                  </label>
                  <select
                    required
                    value={form.seksi_id}
                    onChange={(e) => setForm({ ...form, seksi_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {seksiList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama_seksi}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nama Tugas / Checklist *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.nama_tugas}
                    onChange={(e) => setForm({ ...form, nama_tugas: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Contoh: Pesan Sound System & Mic Wireless"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Deskripsi Tugas
                  </label>
                  <textarea
                    rows={2}
                    value={form.deskripsi}
                    onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Contoh: Pastikan ada 4 mic aktif dan 2 stand mic"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          status: e.target.value as "Belum Mulai" | "Proses" | "Selesai",
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="Belum Mulai">Belum Mulai</option>
                      <option value="Proses">Proses</option>
                      <option value="Selesai">Selesai</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Target Deadline
                    </label>
                    <input
                      type="date"
                      value={form.deadline}
                      onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Penanggung Jawab (PJ Anggota)
                  </label>
                  <select
                    value={form.pj_id}
                    onChange={(e) => setForm({ ...form, pj_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">-- Pilih Anggota Panitia (Opsional) --</option>
                    {panitiaList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama} ({p.jabatan})
                      </option>
                    ))}
                  </select>
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
                    Simpan Tugas
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
