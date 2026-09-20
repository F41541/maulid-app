"use client";

import React from "react";
import { Modal, ModalFooter, ModalSection } from "@/components/ui/Modal";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

interface TransaksiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  rabList?: Array<{ id: string; nama_anggaran: string }>;
  form: {
    tipe: "masuk" | "keluar";
    tanggal: string;
    keterangan: string;
    nominal: string;
    metode: "cash" | "transfer";
    rab_id: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      tipe: "masuk" | "keluar";
      tanggal: string;
      keterangan: string;
      nominal: string;
      metode: "cash" | "transfer";
      rab_id: string;
    }>
  >;
}

export function TransaksiModal({
  isOpen,
  onClose,
  onSubmit,
  rabList = [],
  form,
  setForm,
}: TransaksiModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        form.tipe === "masuk"
          ? "Catat Kas Masuk (Pemasukan)"
          : "Catat Kas Keluar (Pengeluaran)"
      }
      description="Lengkapi detail transaksi untuk pelaporan saldo kepanitiaan yang transparan."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Section 1: Kategori & Kanal */}
        <ModalSection title="Kategori & Kanal Kas" bordered={false}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Kanal Saldo" required>
              <Select
                value={form.metode}
                onChange={(e) =>
                  setForm({ ...form, metode: e.target.value as "cash" | "transfer" })
                }
              >
                <option value="cash">Dompet (Tunai / Cash)</option>
                <option value="transfer">Rekening (Bank Transfer)</option>
              </Select>
            </FormField>

            <FormField label="Tanggal Transaksi" required>
              <DateInput
                required
                value={form.tanggal}
                onChange={(val) => setForm({ ...form, tanggal: val })}
              />
            </FormField>
          </div>

          {form.tipe === "keluar" && (
            <div className="mt-3">
              <FormField label="Wadah Anggaran (RAB)" required>
                <Select
                  value={form.rab_id || ""}
                  onChange={(e) => setForm({ ...form, rab_id: e.target.value })}
                >
                  <option value="">-- Pilih Judul Anggaran (RAB) --</option>
                  {rabList.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nama_anggaran}
                    </option>
                  ))}
                </Select>
              </FormField>
              {rabList.length === 0 && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 italic">
                  Belum ada Wadah RAB. Anda dapat membuat Judul Wadah terlebih dahulu di menu RAB.
                </p>
              )}
            </div>
          )}
        </ModalSection>

        {/* Section 2: Informasi Keuangan */}
        <ModalSection title="Detail Transaksi & Jumlah">
          <FormField label="Keterangan Transaksi" required>
            <Input
              type="text"
              required
              value={form.keterangan}
              onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
              placeholder={
                form.tipe === "masuk"
                  ? "Contoh: Infaq Hamba Allah via Kasir / Sumbangan Warga RT 02"
                  : "Contoh: Pembelian konsumsi rapat panitia / Sewa tenda panggung"
              }
            />
          </FormField>

          <FormField label="Nominal Transaksi (Rp)" required>
            <Input
              type="number"
              required
              min={0}
              value={form.nominal}
              onChange={(e) => setForm({ ...form, nominal: e.target.value })}
              placeholder="Contoh: 1500000"
            />
          </FormField>
        </ModalSection>

        <ModalFooter>
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" size="sm" type="submit">
            Simpan Transaksi
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
