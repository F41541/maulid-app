"use client";

import React, { useState } from "react";
import { Clock, User, FileText, CheckCircle, Filter } from "lucide-react";

export interface RundownItem {
  id: string;
  hari: string;
  waktu: string;
  nama_kegiatan: string;
  nama_pengisi: string | null;
  catatan: string | null;
}

interface RundownSectionProps {
  rundownList: RundownItem[];
}

export function RundownSection({ rundownList }: RundownSectionProps) {
  const [filter, setFilter] = useState<string>("all");

  const filteredItems = rundownList.filter((item) => {
    if (filter === "all") return true;
    if (filter === "inti") {
      const name = item.nama_kegiatan.toLowerCase();
      return name.includes("tausiyah") || name.includes("mau'idhoh") || name.includes("sholawat") || name.includes("rawi");
    }
    if (filter === "pembuka") {
      const name = item.nama_kegiatan.toLowerCase();
      return name.includes("pembukaan") || name.includes("qur'an") || name.includes("sambutan") || name.includes("tawasul");
    }
    if (filter === "penutup") {
      const name = item.nama_kegiatan.toLowerCase();
      return name.includes("doa") || name.includes("ramah") || name.includes("penutup") || name.includes("konsumsi");
    }
    return true;
  });

  return (
    <section id="rundown" className="w-full py-16 sm:py-24 bg-slate-100/80 dark:bg-slate-950 border-y border-slate-200/70 dark:border-slate-800/80 transition-colors scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-10">
        <h2 className="text-3xl sm:text-4xl font-serif text-brand-dark dark:text-white">
          Rundown &amp; Agenda Acara
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
          Rangkaian mata acara Peringatan Maulid Nabi Muhammad SAW 1448 H disusun secara tertib untuk kenyamanan jamaah.
        </p>

        {/* Filter Buttons */}
        <div className="flex flex-wrap justify-center items-center gap-2 mt-6">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
              filter === "all"
                ? "bg-brand-forest text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Semua Rangkaian ({rundownList.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("pembuka")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
              filter === "pembuka"
                ? "bg-brand-forest text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Pembukaan &amp; Sambutan
          </button>
          <button
            type="button"
            onClick={() => setFilter("inti")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
              filter === "inti"
                ? "bg-brand-forest text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Sholawat &amp; Tausiyah Inti
          </button>
          <button
            type="button"
            onClick={() => setFilter("penutup")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
              filter === "penutup"
                ? "bg-brand-forest text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Doa &amp; Ramah Tamah
          </button>
        </div>
      </div>

      {/* Timeline List */}
      <div className="max-w-4xl mx-auto space-y-4">
        {filteredItems.length === 0 ? (
          <div className="bg-brand-cardBg dark:bg-slate-900 border border-brand-borderLight dark:border-slate-800 rounded-2xl p-8 text-center">
            <Clock className="w-10 h-10 text-slate-400 mx-auto mb-3 opacity-60" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Belum ada susunan acara untuk kategori ini.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Data mata acara akan diperbarui secara langsung oleh Panitia Seksi Acara.
            </p>
          </div>
        ) : (
          filteredItems.map((item, index) => {
            const isHighlight =
              item.nama_kegiatan.toLowerCase().includes("tausiyah") ||
              item.nama_kegiatan.toLowerCase().includes("simthudduror") ||
              item.nama_kegiatan.toLowerCase().includes("diba");

            return (
              <div
                key={item.id}
                className={`rounded-2xl p-5 sm:p-6 transition-all duration-200 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isHighlight
                    ? "bg-[#f8fbe9] dark:bg-emerald-950/40 border-brand-accent shadow-xs"
                    : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-brand-emerald/40 shadow-xs"
                }`}
              >
                {/* Time & Activity */}
                <div className="flex items-start sm:items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-bold text-sm ${
                      isHighlight
                        ? "bg-brand-forest text-brand-accent shadow-xs"
                        : "bg-brand-accentLight dark:bg-slate-800 text-brand-forest dark:text-brand-accent"
                    }`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-forest/10 dark:bg-brand-forest/30 text-brand-forest dark:text-brand-accent">
                        <Clock className="w-3 h-3" />
                        {item.waktu} WIB
                      </span>
                      {isHighlight && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-accent text-brand-dark uppercase tracking-wider">
                          Mata Acara Utama
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-serif font-bold text-brand-dark dark:text-white">
                      {item.nama_kegiatan}
                    </h3>
                    {item.catatan && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.catatan}
                      </p>
                    )}
                  </div>
                </div>

                {/* Speaker / Pengisi */}
                {item.nama_pengisi && (
                  <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800 shrink-0">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                      Pengisi Acara / Penceramah
                    </span>
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-forest dark:text-brand-accent mt-0.5">
                      <User className="w-3.5 h-3.5" />
                      <span>{item.nama_pengisi}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        </div>
      </div>
    </section>
  );
}
