"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import {
  CalendarCheck,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Printer,
  Clock,
  Mic,
  FileText,
} from "lucide-react";

interface RundownItem {
  id: string;
  hari: string;
  waktu: string;
  nama_kegiatan: string;
  nama_pengisi: string | null;
  catatan: string | null;
  urutan: number;
}

export default function RundownPage() {
  const [items, setItems] = useState<RundownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RundownItem | null>(null);

  const [form, setForm] = useState({
    hari: "Hari H",
    waktu: "",
    nama_kegiatan: "",
    nama_pengisi: "",
    catatan: "",
  });

  const fetchData = async () => {
    try {
      const res = await fetch("/api/rundown");
      const data = await res.json();
      setItems(data.rundown || []);
    } catch {
      alert("Gagal memuat susunan acara");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAdd = () => {
    setEditingItem(null);
    setForm({
      hari: "Hari H",
      waktu: "",
      nama_kegiatan: "",
      nama_pengisi: "",
      catatan: "",
    });
    setModalOpen(true);
  };

  const openEdit = (item: RundownItem) => {
    setEditingItem(item);
    setForm({
      hari: item.hari || "Hari H",
      waktu: item.waktu,
      nama_kegiatan: item.nama_kegiatan,
      nama_pengisi: item.nama_pengisi || "",
      catatan: item.catatan || "",
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const action = editingItem ? "update" : "create";
    try {
      const res = await fetch("/api/rundown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id: editingItem?.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal menyimpan kegiatan");
      } else {
        setModalOpen(false);
        fetchData();
      }
    } catch {
      alert("Terjadi kesalahan sistem");
    }
  };

  const handleDelete = async (id: string, nama: string) => {
    if (!confirm(`Hapus kegiatan "${nama}"?`)) return;
    try {
      const res = await fetch("/api/rundown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal menghapus kegiatan");
      } else {
        fetchData();
      }
    } catch {
      alert("Terjadi kesalahan sistem");
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === items.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    const payload = newItems.map((item, idx) => ({
      id: item.id,
      urutan: idx + 1,
    }));

    setItems(newItems);

    try {
      await fetch("/api/rundown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reorder", items: payload }),
      });
    } catch {
      fetchData();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar userName="Admin Panitia" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <CalendarCheck className="w-7 h-7 text-emerald-600" />
              Susunan Acara (Rundown)
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Jadwal pelaksanaan Maulid Nabi Muhammad SAW dengan fleksibilitas input dan pengurutan.
            </p>
          </div>

          <div className="flex items-center gap-2 no-print">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-xs transition"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak / Ekspor PDF
            </button>
            <button
              onClick={openAdd}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              + Tambah Rangkaian Acara
            </button>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print-only mb-6 text-center">
          <h2 className="text-xl font-bold text-slate-900">
            SUSUNAN ACARA MAULID NABI MUHAMMAD SAW
          </h2>
          <p className="text-xs text-slate-600">Panduan Tertib Pelaksanaan Acara</p>
        </div>

        {/* Rundown List Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Belum ada susunan acara yang dicatat. Klik tombol Tambah di atas.
              </div>
            ) : (
              items.map((item, index) => (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition group"
                >
                  <div className="flex items-start gap-4">
                    {/* Urutan badge & Move buttons */}
                    <div className="flex flex-col items-center justify-center">
                      <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center shadow-xs">
                        {index + 1}
                      </span>
                      <div className="flex flex-col gap-0.5 mt-1 no-print">
                        <button
                          disabled={index === 0}
                          onClick={() => handleMove(index, "up")}
                          className="p-0.5 text-slate-400 hover:text-emerald-600 disabled:opacity-20"
                          title="Naikkan Urutan"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          disabled={index === items.length - 1}
                          onClick={() => handleMove(index, "down")}
                          className="p-0.5 text-slate-400 hover:text-emerald-600 disabled:opacity-20"
                          title="Turunkan Urutan"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Main content */}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {item.hari && (
                          <span className="text-xs font-semibold text-purple-800 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-md">
                            {item.hari}
                          </span>
                        )}
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {item.waktu}
                        </span>
                        <h3 className="font-bold text-slate-800 text-base">{item.nama_kegiatan}</h3>
                      </div>

                      {item.nama_pengisi && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-700">
                          <Mic className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="font-medium text-slate-600">Pengisi / Petugas:</span>
                          <span className="font-semibold text-slate-900">{item.nama_pengisi}</span>
                        </div>
                      )}

                      {item.catatan && (
                        <p className="mt-1 text-xs text-slate-500 flex items-start gap-1">
                          <span className="text-slate-400">Catatan:</span> {item.catatan}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 self-end sm:self-center no-print">
                    <button
                      onClick={() => openEdit(item)}
                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.nama_kegiatan)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal Rundown */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 no-print">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4">
                {editingItem ? "Edit Rangkaian Acara" : "Tambah Acara Baru"}
              </h3>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Hari / Tanggal Acara *
                    </label>
                    <input
                      type="text"
                      required
                      list="hari-acara-options"
                      value={form.hari}
                      onChange={(e) => setForm({ ...form, hari: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      placeholder="Contoh: Hari H / H-1 / Sabtu"
                    />
                    <datalist id="hari-acara-options">
                      <option value="Hari H" />
                      <option value="H-1 (Persiapan)" />
                      <option value="H-2" />
                      <option value="Hari H (Pagi)" />
                      <option value="Hari H (Malam)" />
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Waktu / Jam Pelaksanaan *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.waktu}
                      onChange={(e) => setForm({ ...form, waktu: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      placeholder="Contoh: 19:30 - 20:00 WIB"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nama Kegiatan / Agenda *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.nama_kegiatan}
                    onChange={(e) => setForm({ ...form, nama_kegiatan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Contoh: Pembacaan Tausiyah & Hikmah Maulid"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nama Pengisi Acara (Penceramah / Qori / Hadroh dll)
                  </label>
                  <input
                    type="text"
                    value={form.nama_pengisi}
                    onChange={(e) => setForm({ ...form, nama_pengisi: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Contoh: Habib Umar bin Yahya"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Catatan</label>
                  <textarea
                    rows={2}
                    value={form.catatan}
                    onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Contoh: Siapkan air minum dan mik wireless di podium"
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
                    Simpan Kegiatan
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
