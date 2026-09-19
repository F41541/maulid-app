"use client";

import React from "react";
import { RabSeksiGroup, RabItem } from "@/types";
import { formatRupiah } from "@/lib/format";

interface RabPrintViewProps {
  groups: RabSeksiGroup[];
  items: RabItem[];
  totalAnggaran: number;
}

export function RabPrintView({ groups, items, totalAnggaran }: RabPrintViewProps) {
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
          RENCANA ANGGARAN BIAYA (RAB) KEPANITIAAN
        </p>
      </div>

      {/* Ringkasan Header Cetak */}
      <div className="mb-4 flex justify-between items-center text-xs">
        <div>
          <span className="font-semibold">Total Item Kebutuhan: </span>
          <span>{items.length} item</span>
        </div>
        <div className="text-right">
          <span className="font-semibold">Total Rencana Anggaran: </span>
          <span className="font-black text-sm">{formatRupiah(totalAnggaran)}</span>
        </div>
      </div>

      {/* Rincian Tabel per Seksi */}
      <div className="space-y-4">
        {groups
          .filter((group) => group.items.length > 0)
          .map((group, gIdx) => {
            return (
              <div key={group.seksi_id || `umum-${gIdx}`} className="break-inside-avoid">
                <div className="bg-slate-100 border border-slate-400 px-3 py-1.5 font-bold text-xs uppercase flex justify-between">
                  <span>{gIdx + 1}. {group.nama_seksi}</span>
                  <span>Subtotal: {formatRupiah(group.subtotal)}</span>
                </div>
              <table className="w-full border-collapse text-xs border border-slate-400">
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
                  {group.items.map((item, idx) => (
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
            </div>
          );
        })}
      </div>

      {/* Baris Total Keseluruhan */}
      <div className="mt-4 border-2 border-slate-900 bg-slate-100 p-3 flex justify-between items-center break-inside-avoid">
        <span className="font-extrabold text-sm uppercase">TOTAL KESELURUHAN RENCANA ANGGARAN</span>
        <span className="font-black text-base text-slate-950">{formatRupiah(totalAnggaran)}</span>
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
