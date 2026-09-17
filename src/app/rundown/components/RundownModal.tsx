"use client";

import React from "react";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { TimeColonInput } from "@/components/ui/TimeColonInput";

interface RundownModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isEdit: boolean;
  form: {
    hari: string;
    waktu: string;
    nama_kegiatan: string;
    nama_pengisi: string;
    catatan: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      hari: string;
      waktu: string;
      nama_kegiatan: string;
      nama_pengisi: string;
      catatan: string;
    }>
  >;
}

export function RundownModal({
  isOpen,
  onClose,
  onSubmit,
  isEdit,
  form,
  setForm,
}: RundownModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Kegiatan Rundown" : "Tambah Kegiatan Rundown"}
      description="Susun jadwal dan penanggung jawab mata acara Maulid Nabi."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Jadwal Pelaksanaan: Tanggal & Waktu */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-4">
          <FormField label="Tanggal Acara" required>
            <DateInput
              required
              value={form.hari}
              onChange={(val) => setForm({ ...form, hari: val })}
            />
          </FormField>

          <FormField label="Waktu Pelaksanaan (Mulai s/d Selesai)" required>
            <TimeColonInput
              value={form.waktu}
              onChange={(val) => setForm({ ...form, waktu: val })}
              required
            />
          </FormField>
        </div>

        <div className="pt-1 space-y-3">
          <FormField label="Nama Kegiatan / Agenda" required>
            <Input
              type="text"
              required
              value={form.nama_kegiatan}
              onChange={(e) => setForm({ ...form, nama_kegiatan: e.target.value })}
              placeholder="Contoh: Pembacaan Tausiyah & Hikmah Maulid"
            />
          </FormField>

          <FormField label="Nama Pengisi Acara (Penceramah / Qori / Hadroh)">
            <Input
              type="text"
              value={form.nama_pengisi}
              onChange={(e) => setForm({ ...form, nama_pengisi: e.target.value })}
              placeholder="Contoh: Habib Umar bin Yahya"
            />
          </FormField>

          <FormField label="Catatan Teknis">
            <Textarea
              rows={2}
              value={form.catatan}
              onChange={(e) => setForm({ ...form, catatan: e.target.value })}
              placeholder="Contoh: Siapkan air minum dan mik wireless di podium"
            />
          </FormField>
        </div>

        <ModalFooter>
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" size="sm" type="submit">
            Simpan Kegiatan
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
