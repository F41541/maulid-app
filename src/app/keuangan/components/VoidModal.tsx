"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { FormField } from "@/components/ui/FormField";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { formatRupiah } from "@/lib/format";

interface Transaksi {
  id: string;
  tipe: "masuk" | "keluar";
  tanggal: string;
  keterangan: string;
  nominal: number;
  metode: "cash" | "transfer";
  kategori?: string | null;
  status?: string | null;
  void_reason?: string | null;
}

interface VoidModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  voidTarget: Transaksi | null;
  voidReason: string;
  setVoidReason: (reason: string) => void;
}

export function VoidModal({
  isOpen,
  onClose,
  onSubmit,
  voidTarget,
  voidReason,
  setVoidReason,
}: VoidModalProps) {
  if (!voidTarget) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Void / Batalkan Catatan Transaksi"
      description="Integritas pembukuan dijamin dengan membuat transaksi pembalik otomatis (audit trail)."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
          <p className="font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            Konfirmasi Pembatalan Transaksi
          </p>
          <p className="leading-relaxed">
            Data tidak dihapus permanen. Transaksi ditandai sebagai <strong>VOID</strong> dan sistem membuat entri pembalik secara otomatis.
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Keterangan:</span>
            <span className="font-medium text-slate-800 dark:text-slate-100">{voidTarget.keterangan}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Nominal:</span>
            <span className="font-bold text-slate-900 dark:text-white">{formatRupiah(voidTarget.nominal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Kanal / Metode:</span>
            <span className="capitalize text-slate-700 dark:text-slate-200">{voidTarget.metode}</span>
          </div>
          {voidTarget.kategori === "mutasi_internal" && (
            <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium pt-1.5 border-t border-slate-200 dark:border-slate-700">
              * Transaksi ini adalah mutasi internal. Pembatalan akan mem-void kedua sisi mutasi secara berpasangan.
            </p>
          )}
        </div>

        <FormField label="Alasan Pembatalan (Wajib diisi)" required>
          <Textarea
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            placeholder="Contoh: Salah input nominal / Nota dibatalkan / Transaksi ganda"
            rows={3}
            required
          />
        </FormField>

        <ModalFooter>
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Batal
          </Button>
          <Button variant="danger" size="sm" type="submit">
            Proses Void &amp; Reversal
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
