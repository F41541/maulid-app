"use client";

import React from "react";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { DokumentasiUpload } from "./DokumentasiUpload";

interface SeksiOption {
  id: string;
  nama_seksi: string;
}

interface PanitiaOption {
  id: string;
  nama: string;
  jabatan: string;
}

export interface TugasFormData {
  seksi_id: string;
  nama_tugas: string;
  deskripsi: string;
  status: "Belum Mulai" | "Proses" | "Selesai";
  deadline: string;
  pj_id: string;
  foto_dokumentasi: string;
  is_umum: number;
}

interface TugasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isEdit: boolean;
  isKetua?: boolean;
  canCreateUmum?: boolean;
  userJabatanName?: string;
  userPanitiaName?: string;
  form: TugasFormData;
  setForm: React.Dispatch<React.SetStateAction<TugasFormData>>;
  seksiList: SeksiOption[];
  panitiaList: PanitiaOption[];
  uploading: boolean;
  handleFileUpload: (file: File) => void;
}

export function TugasModal({
  isOpen,
  onClose,
  onSubmit,
  isEdit,
  isKetua = false,
  canCreateUmum = false,
  userJabatanName,
  form,
  setForm,
  seksiList,
  panitiaList,
  uploading,
  handleFileUpload,
}: TugasModalProps) {
  const isTugasUmum = form.is_umum === 1;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Tugas" : "Tambah Tugas Baru"}
      description="Rincian checklist tugas operasional dan progres kepanitiaan."
      maxWidth="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Section 1: Informasi Tugas */}
        <div className="space-y-3.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            Informasi Tugas
          </span>

          {/* Seksi Pelaksana Dropdown (termasuk opsi Seluruh Divisi) */}
          {isKetua || isEdit || canCreateUmum ? (
            <FormField label="Seksi Pelaksana" required>
              <Select
                required
                value={isTugasUmum ? "ALL" : form.seksi_id}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "ALL") {
                    setForm((prev) => ({
                      ...prev,
                      is_umum: 1,
                      seksi_id: "",
                    }));
                  } else {
                    setForm((prev) => ({
                      ...prev,
                      is_umum: 0,
                      seksi_id: val,
                      pj_id: "",
                    }));
                  }
                }}
              >
                <option value="">-- Pilih Seksi Pelaksana --</option>
                {(canCreateUmum || isKetua || isTugasUmum) && (
                  <option value="ALL">🌐 Seluruh Divisi (Tugas untuk Semua)</option>
                )}
                {seksiList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nama_seksi}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-xs flex items-center justify-between">
              <span className="text-emerald-800 dark:text-emerald-300 font-medium">Seksi Pelaksana:</span>
              <span className="font-bold text-emerald-900 dark:text-emerald-200 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-700 shadow-2xs">
                {userJabatanName || seksiList.find((s) => s.id === form.seksi_id)?.nama_seksi || "Sesuai Jabatan"}
              </span>
            </div>
          )}

          {/* Penanggung Jawab: Hanya muncul ketika memilih Seluruh Divisi, tepat di bawah Seksi Pelaksana */}
          {isTugasUmum && (
            <div className="animate-in fade-in duration-200">
              <FormField
                label="Penanggung Jawab (PJ Tugas Seluruh Divisi)"
                hint="Pilih koordinator atau panitia penanggung jawab untuk tugas bersama ini."
              >
                <Select
                  value={form.pj_id}
                  onChange={(e) => setForm({ ...form, pj_id: e.target.value })}
                >
                  <option value="">-- Pilih Penanggung Jawab (Opsional) --</option>
                  {panitiaList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} ({p.jabatan})
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
          )}

          <FormField label="Nama Tugas / Checklist" required>
            <Input
              type="text"
              required
              value={form.nama_tugas}
              onChange={(e) => setForm({ ...form, nama_tugas: e.target.value })}
              placeholder="Contoh: Sewa tenda panggung utama"
            />
          </FormField>

          <FormField label="Deskripsi / Catatan Tambahan">
            <Textarea
              rows={2}
              value={form.deskripsi}
              onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
              placeholder="Rincian teknis, spesifikasi, atau catatan penting..."
            />
          </FormField>
        </div>

        {/* Section 2: Batas Waktu & Pelaksanaan */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-3.5 space-y-3.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            Batas Waktu &amp; Status
          </span>

          {/* Batas Waktu 1 Baris Penuh */}
          <FormField label="Batas Waktu (Deadline)">
            <DateInput
              value={form.deadline}
              onChange={(val) => setForm({ ...form, deadline: val })}
            />
          </FormField>

          {/* Status Kesiapan */}
          <FormField label="Status Kesiapan" required>
            <Select
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value as "Belum Mulai" | "Proses" | "Selesai",
                })
              }
            >
              <option value="Belum Mulai">Belum Mulai</option>
              <option value="Proses">Sedang Proses</option>
              <option value="Selesai">Selesai</option>
            </Select>
          </FormField>
        </div>

        {/* Section 3: Dokumentasi */}
        <DokumentasiUpload
          fotoDokumentasi={form.foto_dokumentasi}
          onRemoveFoto={() => setForm({ ...form, foto_dokumentasi: "" })}
          onFileSelect={handleFileUpload}
          uploading={uploading}
        />

        <ModalFooter>
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={uploading}>
            Simpan Tugas
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
