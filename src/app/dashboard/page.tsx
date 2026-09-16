"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  Users,
  CheckSquare,
  Wallet,
  CalendarCheck,
  ArrowRight,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  UserCheck,
  Banknote,
  CreditCard,
  Hourglass,
} from "lucide-react";

interface DashboardData {
  totalPanitia: number;
  totalSeksi: number;
  totalTamu: number;
  tamuHadir: number;
  persentaseTugas: number;
  totalTugas: number;
  tugasSelesai: number;
  keuangan: {
    totalMasuk: number;
    totalKeluar: number;
    saldoKas: number;
    saldoCash: number;
    saldoRekening: number;
  };
  rundownPreview: Array<{
    id: string;
    hari?: string;
    waktu: string;
    nama_kegiatan: string;
    nama_pengisi: string | null;
  }>;
  urgentTasks: Array<{
    id: string;
    nama_tugas: string;
    nama_seksi: string;
    pj_nama: string | null;
    status: string;
    deadline: string | null;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar userName="Admin Panitia" />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400">
          Memuat ringkasan dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar userName="Admin Panitia" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome banner */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-md mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider bg-emerald-700/80 px-3 py-1 rounded-full text-emerald-100">
                Peringatan Maulid Nabi Muhammad SAW 1448 H
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold mt-2">
                Pusat Koordinasi &amp; Manajemen Panitia
              </h1>
              <p className="text-sm text-emerald-100 mt-1 max-w-xl">
                Pantau kepanitiaan, tamu undangan VVIP/VIP, progres seksi, jadwal rundown, serta saldo kas dompet &amp; rekening.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/tamu"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition shadow-xs flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Data Tamu Undangan
              </Link>
              <Link
                href="/struktur"
                className="px-4 py-2 bg-white text-emerald-800 font-semibold rounded-xl text-xs hover:bg-emerald-50 transition shadow-sm"
              >
                Bagan Struktur
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {/* Card 1: Panitia */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Anggota Panitia
              </span>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">
                {data.totalPanitia}{" "}
                <span className="text-xs font-normal text-slate-500">orang</span>
              </h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                {data.totalSeksi} Seksi Pelaksana
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Tamu Undangan */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Tamu Undangan
              </span>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">
                {data.totalTamu}{" "}
                <span className="text-xs font-normal text-slate-500">tamu</span>
              </h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                {data.tamuHadir} terkonfirmasi hadir
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Progress Tugas */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Kesiapan Tugas Seksi
              </span>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">
                {data.persentaseTugas}%
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {data.tugasSelesai} dari {data.totalTugas} tugas selesai
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckSquare className="w-6 h-6" />
            </div>
          </div>

          {/* Card 4: Total Semua Saldo */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Total Saldo Kas
              </span>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {formatRupiah(data.keuangan.saldoKas)}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Dompet: {formatRupiah(data.keuangan.saldoCash)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* 2 Column Main Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Rundown Preview */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-emerald-600" />
                  Pratinjau Susunan Acara
                </h2>
                <Link
                  href="/rundown"
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-3">
                {data.rundownPreview.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Belum ada susunan acara.</p>
                ) : (
                  data.rundownPreview.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3"
                    >
                      <div className="flex flex-col gap-1 shrink-0">
                        {item.hari && (
                          <span className="text-[10px] font-semibold text-purple-800 bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded text-center">
                            {item.hari}
                          </span>
                        )}
                        <span className="text-xs font-bold text-emerald-700 bg-white border border-slate-200 px-2 py-1 rounded-md text-center font-mono">
                          {item.waktu}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 text-sm">{item.nama_kegiatan}</h4>
                        {item.nama_pengisi && (
                          <p className="text-xs text-slate-500 mt-0.5">Oleh: {item.nama_pengisi}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <Link
                href="/rundown"
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl flex items-center justify-center gap-1 transition"
              >
                Kelola &amp; Urutkan Susunan Acara
              </Link>
            </div>
          </div>

          {/* Right: Tugas Belum Selesai / Deadline */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-emerald-600" />
                  Tugas Mendesak &amp; Berjalan
                </h2>
                <Link
                  href="/tugas"
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-3">
                {data.urgentTasks.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Semua tugas telah selesai!</p>
                ) : (
                  data.urgentTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-3"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded uppercase">
                          {t.nama_seksi}
                        </span>
                        <h4 className="font-semibold text-slate-800 text-sm mt-1">{t.nama_tugas}</h4>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          {t.pj_nama && <span>PJ: {t.pj_nama}</span>}
                          {t.deadline && <span>Deadline: {t.deadline}</span>}
                        </div>
                      </div>

                      <div>
                        {t.status === "Proses" ? (
                          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md flex items-center gap-1">
                            <Hourglass className="w-3 h-3" />
                            Proses
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-600 bg-slate-200/70 px-2 py-1 rounded-md flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Belum
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <Link
                href="/tugas"
                className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium rounded-xl flex items-center justify-center gap-1 transition"
              >
                Buka Checklist Tugas Seksi
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
