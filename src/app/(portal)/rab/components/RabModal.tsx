"use client";

import React, { useMemo } from "react";
import { Modal, ModalFooter, ModalSection } from "@/components/ui/Modal";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { formatRupiah } from "@/lib/format";

// -------------------------------------------------------------
// 1. Modal Wadah Anggaran (Master)
// -------------------------------------------------------------
export interface RabWadahFormData {
  id?: string;
  nama_anggaran: string;
  catatan: string;
}

interface RabWadahModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  form: RabWadahFormData;
  setForm: React.Dispatch<React.SetStateAction<RabWadahFormData>>;
  isEditing: boolean;
  submitting: boolean;
}

export function RabWadahModal({
  isOpen,
  onClose,
  onSubmit,
  form,
  setForm,
  isEditing,
  submitting,
}: RabWadahModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Wadah Anggaran" : "Buat Wadah Anggaran Baru"}
      description="Wadah anggaran berfungsi sebagai pos/judul utama untuk mengelompokkan rincian kebutuhan biaya acara."
      maxWidth="md"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <ModalSection title="Informasi Wadah Anggaran" bordered={false}>
          <div className="space-y-3">
            <FormField label="Judul / Nama Wadah Anggaran" required>
              <Input
                type="text"
                required
                value={form.nama_anggaran}
                onChange={(e) =>
                  setForm({ ...form, nama_anggaran: e.target.value })
                }
                placeholder="Contoh: Anggaran Konsumsi Jamaah / Anggaran Tenda & Panggung"
              />
            </FormField>

            <FormField label="Keterangan / Ruang Lingkup (Opsional)">
              <Textarea
                rows={2}
                value={form.catatan}
                onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                placeholder="Deskripsi singkat mengenai peruntukan pos anggaran ini..."
              />
            </FormField>
          </div>
        </ModalSection>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting
              ? "Menyimpan..."
              : isEditing
              ? "Simpan Perubahan"
              : "Buat Wadah"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

// -------------------------------------------------------------
// 2. Modal Detail Item Kebutuhan (Detail)
// -------------------------------------------------------------
export interface RabItemFormData {
  id?: string;
  rab_id: string;
  nama_item: string;
  volume: string;
  satuan: string;
  harga_satuan: string;
  catatan: string;
}

interface RabItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  wadahName: string;
  form: RabItemFormData;
  setForm: React.Dispatch<React.SetStateAction<RabItemFormData>>;
  isEditing: boolean;
  submitting: boolean;
}

const COMMON_UNITS = [
  "porsi",
  "kotak",
  "set",
  "unit",
  "paket",
  "orang",
  "hari",
  "rim",
  "pcs",
];

export function RabItemModal({
  isOpen,
  onClose,
  onSubmit,
  wadahName,
  form,
  setForm,
  isEditing,
  submitting,
}: RabItemModalProps) {
  const calculatedTotal = useMemo(() => {
    const vol = parseFloat(form.volume);
    const harga = parseInt(form.harga_satuan, 10);
    if (isNaN(vol) || isNaN(harga) || vol <= 0 || harga <= 0) return 0;
    return Math.round(vol * harga);
  }, [form.volume, form.harga_satuan]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEditing
          ? "Edit Rincian Kebutuhan"
          : "Tambah Kebutuhan ke Wadah"
      }
      description={`Pos Anggaran: "${wadahName}". Lengkapi rincian kuantitas dan harga satuan.`}
      maxWidth="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Nama Kebutuhan */}
        <ModalSection title="Uraian Kebutuhan" bordered={false}>
          <FormField label="Nama Kebutuhan / Belanja" required>
            <Input
              type="text"
              required
              value={form.nama_item}
              onChange={(e) => setForm({ ...form, nama_item: e.target.value })}
              placeholder="Contoh: Sewa Tenda 8x12m / Konsumsi Snack Kotak Jamaah"
            />
          </FormField>
        </ModalSection>

        {/* Volume, Satuan & Harga */}
        <ModalSection title="Kuantitas & Estimasi Harga">
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Volume / Kuantitas" required>
                <Input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={form.volume}
                  onChange={(e) => setForm({ ...form, volume: e.target.value })}
                  placeholder="Contoh: 500"
                />
              </FormField>

              <div>
                <FormField label="Satuan Kuantitas" required>
                  <Input
                    type="text"
                    required
                    value={form.satuan}
                    onChange={(e) => setForm({ ...form, satuan: e.target.value })}
                    placeholder="Contoh: porsi, kotak, set, unit"
                  />
                </FormField>
                {/* Quick Unit Chips */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {COMMON_UNITS.map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => setForm({ ...form, satuan: unit })}
                      className={`text-[10px] px-2 py-0.5 rounded-md transition-colors ${
                        form.satuan === unit
                          ? "bg-emerald-600 text-white font-medium"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                      }`}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <FormField label="Estimasi Harga Satuan (Rp)" required>
                <Input
                  type="number"
                  min="0"
                  required
                  value={form.harga_satuan}
                  onChange={(e) =>
                    setForm({ ...form, harga_satuan: e.target.value })
                  }
                  placeholder="Contoh: 25000"
                />
              </FormField>
              {form.harga_satuan && !isNaN(parseInt(form.harga_satuan, 10)) && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Format:{" "}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatRupiah(form.harga_satuan)}
                  </span>
                </p>
              )}
            </div>

            {/* Live Total Estimasi Display */}
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium block">
                  Total Estimasi Biaya:
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                  {form.volume || 0} {form.satuan || "item"} ×{" "}
                  {formatRupiah(form.harga_satuan || 0)}
                </span>
              </div>
              <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">
                {formatRupiah(calculatedTotal)}
              </span>
            </div>
          </div>
        </ModalSection>

        {/* Catatan / Spesifikasi */}
        <ModalSection title="Catatan & Spesifikasi">
          <FormField label="Catatan Tambahan (Opsional)">
            <Textarea
              rows={2}
              value={form.catatan}
              onChange={(e) => setForm({ ...form, catatan: e.target.value })}
              placeholder="Spesifikasi teknis, kontak vendor, rincian kelengkapan, dll."
            />
          </FormField>
        </ModalSection>

        {/* Footer */}
        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting
              ? "Menyimpan..."
              : isEditing
              ? "Simpan Perubahan"
              : "Tambah Kebutuhan"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
