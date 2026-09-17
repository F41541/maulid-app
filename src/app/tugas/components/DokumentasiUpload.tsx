"use client";

import React from "react";
import { X } from "lucide-react";

interface DokumentasiUploadProps {
  fotoDokumentasi: string;
  onRemoveFoto: () => void;
  onFileSelect: (file: File) => void;
  uploading: boolean;
}

export function DokumentasiUpload({
  fotoDokumentasi,
  onRemoveFoto,
  onFileSelect,
  uploading,
}: DokumentasiUploadProps) {
  return (
    <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
        Foto Bukti / Dokumentasi Progres
      </span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
        }}
        className="text-xs text-slate-600 dark:text-slate-400 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 dark:file:bg-emerald-950/60 file:text-emerald-700 dark:file:text-emerald-300 hover:file:bg-emerald-100 cursor-pointer"
        disabled={uploading}
      />
      {uploading && (
        <p className="text-xs text-slate-400 animate-pulse">
          Mengunggah foto dokumentasi...
        </p>
      )}
      {fotoDokumentasi && (
        <div className="relative inline-block mt-2">
          <img
            src={fotoDokumentasi}
            alt="Dokumentasi Tugas"
            className="w-24 h-24 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs"
          />
          <button
            type="button"
            onClick={onRemoveFoto}
            className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-1 shadow-sm hover:bg-rose-700 transition"
            title="Hapus Foto"
            aria-label="Hapus Foto Dokumentasi"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
