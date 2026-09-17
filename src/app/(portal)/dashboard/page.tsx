"use client";

import { useState, useEffect, useCallback } from "react";
import { formatRupiah } from "@/lib/format";
import { SkeletonStatCard } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { CountdownAcaraCard } from "./components/CountdownAcaraCard";
import { TugasSelanjutnyaCard, UrgentTaskItem } from "./components/TugasSelanjutnyaCard";
import {
  Users,
  Wallet,
  CheckSquare,
  UserCheck,
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
  urgentTasks: UrgentTaskItem[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) {
        throw new Error("Gagal mengambil ringkasan data dashboard.");
      }
      const d = await res.json();
      setData(d);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kendala saat memuat data.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-8 transition-colors w-full min-w-0">
        {/* Hitung Mundur Acara Berikutnya & Timeline TV Guide */}
        <CountdownAcaraCard rundown={data?.rundownPreview || []} />

        {/* Tugas Selanjutnya */}
        {data && (
          <TugasSelanjutnyaCard
            tasks={data.urgentTasks || []}
            onTaskUpdated={fetchDashboardData}
          />
        )}

        {/* 5-State Resilience Handling */}
        {loading ? (
          <div className="space-y-8" aria-busy="true" aria-label="Memuat data dashboard">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonStatCard key={i} />
              ))}
            </div>
          </div>
        ) : error ? (
          <ErrorState
            title="Gagal Memuat Ringkasan Dashboard"
            message={error}
            onRetry={fetchDashboardData}
            className="my-8"
          />
        ) : !data ? (
          <EmptyState
            title="Belum Ada Data Dashboard"
            description="Data panitia dan kegiatan belum tersedia di sistem."
            actionLabel="Muat Ulang"
            onAction={fetchDashboardData}
          />
        ) : (
          /* 4 Summary Stat Cards reordered: Anggota, Total Saldo, Kesiapan Tugas, Tamu Undangan */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <StatCard
              title="Anggota Panitia"
              value={
                <>
                  {data.totalPanitia}{" "}
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">orang</span>
                </>
              }
              subtitle={<span className="text-emerald-600 dark:text-emerald-400 font-medium">{data.totalSeksi} Seksi Pelaksana</span>}
              icon={Users}
              iconColor="emerald"
              animationDelayMs={35}
            />

            <StatCard
              title="Total Saldo Kas"
              value={<span className="text-xl sm:text-2xl">{formatRupiah(data.keuangan.saldoKas)}</span>}
              subtitle={`Dompet: ${formatRupiah(data.keuangan.saldoCash)}`}
              icon={Wallet}
              iconColor="teal"
              animationDelayMs={70}
            />

            <StatCard
              title="Kesiapan Tugas Seksi"
              value={`${data.persentaseTugas}%`}
              subtitle={`${data.tugasSelesai} dari ${data.totalTugas} tugas selesai`}
              icon={CheckSquare}
              iconColor="blue"
              animationDelayMs={105}
            />

            <StatCard
              title="Tamu Undangan"
              value={
                <>
                  {data.totalTamu}{" "}
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">tamu</span>
                </>
              }
              subtitle={<span className="text-emerald-600 dark:text-emerald-400 font-medium">{data.tamuHadir} terkonfirmasi hadir</span>}
              icon={UserCheck}
              iconColor="purple"
              animationDelayMs={140}
            />
          </div>
        )}
      </main>
  );
}
