"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Calendar, Clock, Radio, ArrowRight, Tv } from "lucide-react";

export interface RundownItem {
  id: string;
  hari?: string;
  waktu: string;
  nama_kegiatan: string;
  nama_pengisi: string | null;
  catatan?: string | null;
  urutan?: number;
}

interface CountdownAcaraCardProps {
  rundown: RundownItem[];
}

export function CountdownAcaraCard({ rundown }: CountdownAcaraCardProps) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Parse rundown items with estimated timestamps
  const parsedItems = useMemo(() => {
    if (!rundown || rundown.length === 0) return [];
    const currentDate = now || new Date();

    return rundown.map((item, index) => {
      // Extract time e.g. "19:30 - 20:15" or "19:30"
      const timeMatch = item.waktu.match(/(\d{1,2})[:.](\d{2})/);
      let hours = 19;
      let minutes = 0;
      if (timeMatch) {
        hours = parseInt(timeMatch[1], 10);
        minutes = parseInt(timeMatch[2], 10);
      }

      // Check if item.hari is a date string YYYY-MM-DD
      let itemDate: Date;
      if (item.hari && /^\d{4}-\d{2}-\d{2}$/.test(item.hari)) {
        const [y, m, d] = item.hari.split("-").map(Number);
        itemDate = new Date(y, m - 1, d);
      } else {
        // Tangani nilai default 'Hari H' dengan tanggal pasti acara: Minggu, 11 Oktober 2026
        itemDate = new Date(2026, 9, 11);
      }
      itemDate.setHours(hours, minutes, 0, 0);

      return {
        ...item,
        timestamp: itemDate.getTime(),
        parsedDate: itemDate,
        index,
      };
    });
  }, [rundown, now]);

  // Find the next upcoming event
  const { nextEvent, upcomingList } = useMemo(() => {
    if (parsedItems.length === 0) {
      return { nextEvent: null, upcomingList: [] };
    }

    const currentTs = now ? now.getTime() : Date.now();
    // Items with timestamp in the future
    const upcoming = parsedItems.filter((it) => it.timestamp > currentTs);

    if (upcoming.length > 0) {
      return {
        nextEvent: upcoming[0],
        upcomingList: upcoming,
      };
    }

    // Fallback: If all items are earlier or past, show the first item as upcoming target
    return {
      nextEvent: parsedItems[0],
      upcomingList: parsedItems,
    };
  }, [parsedItems, now]);

  // Calculate countdown time diff
  const timeRemaining = useMemo(() => {
    if (!nextEvent || !now) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false };
    }

    const diff = nextEvent.timestamp - now.getTime();
    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    return { days, hours, minutes, seconds, isPast: false };
  }, [nextEvent, now]);

  // Formatted date and time strings
  const liveDateString = useMemo(() => {
    if (!now) return "Memuat tanggal...";
    return now.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [now]);

  const liveTimeString = useMemo(() => {
    if (!now) return "--:--:--";
    return now.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }, [now]);

  if (!mounted) {
    return (
      <div className="rounded-3xl p-6 sm:p-8 bg-slate-900 border border-slate-800 text-white animate-pulse min-h-[280px] mb-8" />
    );
  }

  return (
    <section
      aria-label="Hitung Mundur dan Jadwal Acara Berikutnya"
      className="relative overflow-hidden bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-7 text-slate-900 dark:text-white shadow-xs mb-8 border border-slate-200/80 dark:border-slate-800 transition-colors w-full min-w-0"
    >
      {/* 1. Atas: Tanggal dan Jam Kecil di Dalam Card */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
          <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{liveDateString}</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full text-slate-700 dark:text-slate-200 font-mono font-bold shadow-2xs">
          <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{liveTimeString} WIB</span>
        </div>
      </div>

      {/* 2. Tengah: Hitung Mundur Acara Berikutnya */}
      <div className="relative z-10 py-5 sm:py-7 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider mb-2.5">
            <Radio className="w-3 h-3 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            <span>Hitung Mundur Acara Berikutnya</span>
          </div>

          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
            {nextEvent ? nextEvent.nama_kegiatan : "Belum Ada Acara Terjadwal"}
          </h2>

          {nextEvent && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2">
              <span className="font-mono font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                {nextEvent.waktu} WIB
              </span>
              {nextEvent.nama_pengisi && (
                <>
                  <span className="text-slate-400">•</span>
                  <span>Oleh: <strong className="text-slate-900 dark:text-white font-semibold">{nextEvent.nama_pengisi}</strong></span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Digital Countdown Timer Blocks */}
        <div className="flex items-center justify-center gap-1 sm:gap-2.5 shrink-0 self-center lg:self-auto w-full sm:w-auto">
          {/* Hari */}
          <div className="flex flex-col items-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-2 sm:px-4 py-1.5 sm:py-2 min-w-[48px] sm:min-w-[68px] shadow-2xs">
            <span className="text-lg sm:text-3xl font-black font-mono text-slate-900 dark:text-white leading-none">
              {String(timeRemaining.days).padStart(2, "0")}
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mt-1">
              Hari
            </span>
          </div>
          <span className="text-sm sm:text-xl font-bold text-slate-300 dark:text-slate-600 mb-2 sm:mb-4">:</span>

          {/* Jam */}
          <div className="flex flex-col items-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-2 sm:px-4 py-1.5 sm:py-2 min-w-[48px] sm:min-w-[68px] shadow-2xs">
            <span className="text-lg sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 leading-none">
              {String(timeRemaining.hours).padStart(2, "0")}
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mt-1">
              Jam
            </span>
          </div>
          <span className="text-sm sm:text-xl font-bold text-slate-300 dark:text-slate-600 mb-2 sm:mb-4">:</span>

          {/* Menit */}
          <div className="flex flex-col items-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-2 sm:px-4 py-1.5 sm:py-2 min-w-[48px] sm:min-w-[68px] shadow-2xs">
            <span className="text-lg sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 leading-none">
              {String(timeRemaining.minutes).padStart(2, "0")}
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mt-1">
              Menit
            </span>
          </div>
          <span className="text-sm sm:text-xl font-bold text-slate-300 dark:text-slate-600 mb-2 sm:mb-4">:</span>

          {/* Detik */}
          <div className="flex flex-col items-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-2 sm:px-4 py-1.5 sm:py-2 min-w-[48px] sm:min-w-[68px] shadow-2xs">
            <span className="text-lg sm:text-3xl font-black font-mono text-amber-600 dark:text-amber-400 leading-none">
              {String(timeRemaining.seconds).padStart(2, "0")}
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mt-1">
              Detik
            </span>
          </div>
        </div>
      </div>

      {/* 3. Bawah: Acara Selanjutnya Desain Seperti Acara Televisi (Garis Ke Bawah Titik Acara Selanjutnya) */}
      <div className="relative z-10 pt-5 sm:pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Tv className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Jadwal Acara Selanjutnya
            </h3>
          </div>
          <Link
            href="/rundown"
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 transition"
          >
            Lihat Lengkap <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {upcomingList.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 italic">
            Belum ada jadwal acara berikutnya yang diatur.
          </p>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-3">
            {/* Garis Vertikal Acara Televisi */}
            <div
              className="absolute left-[11px] sm:left-[13px] top-2 bottom-4 w-0.5 bg-gradient-to-b from-emerald-500 via-slate-300 to-transparent dark:from-emerald-500 dark:via-slate-700 dark:to-transparent"
              aria-hidden="true"
            />

            {upcomingList.slice(0, 3).map((item, idx) => {
              const isFirst = idx === 0;
              const isThird = idx === 2;
              return (
                <div
                  key={item.id}
                  className={`relative group transition-opacity duration-200 ${
                    isThird ? "opacity-35 hover:opacity-75" : "opacity-100"
                  }`}
                >
                  {/* Titik Acara pada Garis Vertikal */}
                  <div
                    className={`absolute -left-[19px] sm:-left-[25px] top-2.5 flex items-center justify-center rounded-full transition-all duration-200 ${
                      isFirst
                        ? "w-4 h-4 bg-emerald-500 ring-4 ring-emerald-500/20"
                        : "w-3 h-3 bg-slate-300 dark:bg-slate-700 border-2 border-slate-400 dark:border-slate-500 group-hover:border-emerald-500"
                    }`}
                    aria-hidden="true"
                  >
                    {isFirst && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    )}
                  </div>

                  {/* Isi Acara Gaya Siaran Televisi */}
                  <div
                    className={`p-3 rounded-2xl transition-all border ${
                      isFirst
                        ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 shadow-2xs"
                        : "bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100/70 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                            isFirst
                              ? "bg-emerald-600 text-white"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {item.waktu}
                        </span>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                          {item.nama_kegiatan}
                        </h4>
                      </div>
                      {isFirst && (
                        <span className="self-start sm:self-auto px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Segera Tayang
                        </span>
                      )}
                    </div>
                    {item.nama_pengisi && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 pl-1">
                        Pengisi Acara: <span className="text-slate-800 dark:text-slate-200 font-medium">{item.nama_pengisi}</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
