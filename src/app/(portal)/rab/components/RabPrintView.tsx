"use client";

import React from "react";
import { RabWadah, RabRingkasanGlobal } from "@/types";
import { formatRupiah } from "@/lib/format";

interface RabPrintViewProps {
  wadah: RabWadah[];
  ringkasan: RabRingkasanGlobal;
}

export function RabPrintView({ wadah, ringkasan }: RabPrintViewProps) {
  return (
    <div className="hidden print:block text-slate-900 bg-white p-4 font-sans text-xs">
      {/* Kop Surat Panitia */}
      <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
        <h1 className="text-base font-bold uppercase tracking-wider text-slate-900">
          PANITIA PERINGATAN MAULID NABI MUHAMMAD SAW
        </h1>
        <h2 className="text-sm font-semibold text-slate-800">
          TAHUN 1448 H / 2026 M
        </h2>
        <p className="text-[11px] text-slate-600 mt-0.5">
          RENCANA ANGGARAN BIAYA (RAB) & REALISASI KAS
        </p>
      </div>

      {/* Ringkasan Header Cetak */}
      <div className="mb-4 grid grid-cols-4 gap-2 border border-slate-300 p-2 text-center text-xs bg-slate-50">
        <div>
          <span className="text-[10px] text-slate-500 block">Total Wadah Pos:</span>
          <span className="font-bold">{ringkasan.totalWadah} Pos</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 block">Total Rencana Anggaran:</span>
          <span className="font-bold text-emerald-800">{formatRupiah(ringkasan.totalRencana)}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 block">Realisasi Kas Keluar:</span>
          <span className="font-bold text-blue-800">{formatRupiah(ringkasan.totalRealisasi)}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 block">Sisa Anggaran:</span>
          <span className="font-bold text-slate-900">{formatRupiah(ringkasan.sisaAnggaran)}</span>
        </div>
      </div>

      {/* Rincian per Wadah Anggaran */}
      <div className="space-y-4">
        {wadah.map((w, wIdx) => {
          const items = w.items || [];
          return (
            <div key={w.id} className="break-inside-avoid">
              <div className="bg-slate-100 border border-slate-400 px-3 py-1.5 font-bold text-xs uppercase flex justify-between items-center">
                <span>
                  {wIdx + 1}. {w.nama_anggaran}
                </span>
                <span className="text-[11px] font-semibold text-slate-700">
                  Rencana: {formatRupiah(w.total_rencana)} | Kas Keluar: {formatRupiah(w.total_realisasi)} | Sisa: {formatRupiah(w.sisa_anggaran)} ({w.persentase_realisasi}%)
                </span>
              </div>
              {items.length === 0 ? (
                <div className="border border-t-0 border-slate-300 p-2 text-center text-[11px] text-slate-400 italic">
                  Belum ada rincian item kebutuhan pada pos ini.
                </div>
              ) : (
                <table className="w-full border-collapse text-xs border border-slate-400 border-t-0">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-400">
                      <th className="w-8 text-center py-1.5 px-2 border-r border-slate-400 font-semibold">No</th>
                      <th className="text-left py-1.5 px-3 border-r border-slate-400 font-semibold">Uraian Kebutuhan</th>
                      <th className="w-16 text-center py-1.5 px-2 border-r border-slate-400 font-semibold">Vol</th>
                      <th className="w-16 text-center py-1.5 px-2 border-r border-slate-400 font-semibold">Satuan</th>
                      <th className="w-28 text-right py-1.5 px-2 border-r border-slate-400 font-semibold">Harga Satuan</th>
                      <th className="w-32 text-right py-1.5 px-3 border-r border-slate-400 font-semibold">Total Biaya</th>
                      <th className="text-left py-1.5 px-2 font-semibold">Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item.id} className="border-b border-slate-300">
                        <td className="text-center py-1.5 px-2 border-r border-slate-300 align-top">{idx + 1}</td>
                        <td className="py-1.5 px-3 border-r border-slate-300 font-medium align-top">{item.nama_item}</td>
                        <td className="text-center py-1.5 px-2 border-r border-slate-300 align-top">{item.volume}</td>
                        <td className="text-center py-1.5 px-2 border-r border-slate-300 align-top">{item.satuan}</td>
                        <td className="text-right py-1.5 px-2 border-r border-slate-300 align-top">{formatRupiah(item.harga_satuan)}</td>
                        <td className="text-right py-1.5 px-3 border-r border-slate-300 font-semibold align-top">{formatRupiah(item.total_estimasi)}</td>
                        <td className="py-1.5 px-2 text-[11px] text-slate-600 align-top">{item.catatan || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>

      {/* Baris Total Keseluruhan */}
      <div className="mt-4 border-2 border-slate-900 bg-slate-100 p-3 flex justify-between items-center break-inside-avoid">
        <span className="font-extrabold text-sm uppercase">TOTAL KESELURUHAN RENCANA ANGGARAN</span>
        <div className="text-right">
          <span className="font-black text-base text-slate-950 block">{formatRupiah(ringkasan.totalRencana)}</span>
          <span className="text-[11px] text-slate-600 block">
            Realisasi Kas: {formatRupiah(ringkasan.totalRealisasi)} | Sisa: {formatRupiah(ringkasan.sisaAnggaran)}
          </span>
        </div>
      </div>

      {/* Lembar Tanda Tangan */}
      <div className="mt-8 pt-4 flex justify-between text-xs break-inside-avoid">
        <div className="text-center w-56">
          <p className="font-medium">Mengetahui,</p>
          <p className="font-bold">Ketua Panitia</p>
          <div className="h-20" />
          <p className="font-bold underline">( ............................................ )</p>
        </div>
        <div className="text-center w-56">
          <p className="font-medium">Dibuat oleh,</p>
          <p className="font-bold">Bendahara Panitia</p>
          <div className="h-20" />
          <p className="font-bold underline">( ............................................ )</p>
        </div>
      </div>

      {/* Footer Cetak */}
      <div className="mt-8 pt-2 border-t border-slate-300 flex justify-between items-center text-[10px] text-slate-500">
        <span>Dicetak dari Aplikasi Maulid App</span>
        <span>
          Tanggal Cetak:{" "}
          {new Date().toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>
    </div>
  );
}
