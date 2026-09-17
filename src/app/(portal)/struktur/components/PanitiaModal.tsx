"use client";

import React from "react";
import { Modal, ModalFooter, ModalSection } from "@/components/ui/Modal";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

interface SeksiOption {
  id: string;
  nama_seksi: string;
}

interface PanitiaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isEdit: boolean;
  form: {
    nama: string;
    jabatan: string;
    seksi_id: string;
    no_hp: string;
    catatan: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      nama: string;
      jabatan: string;
      seksi_id: string;
      no_hp: string;
      catatan: string;
    }>
  >;
  seksiList: SeksiOption[];
}

export function PanitiaModal({
  isOpen,
  onClose,
  onSubmit,
  isEdit,
  form,
  setForm,
  seksiList,
}: PanitiaModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Anggota Panitia" : "Tambah Anggota Panitia"}
      description="Data kepengurusan panitia peringatan Maulid Nabi."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Section 1: Identitas & Jabatan */}
        <ModalSection title="Identitas & Amanah" bordered={false}>
          <FormField label="Nama Lengkap" required>
            <Input
              type="text"
              required
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              placeholder="Contoh: Muhammad Rizky"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Jabatan" required>
              <Select
                required
                value={form.jabatan}
                onChange={(e) => setForm({ ...form, jabatan: e.target.value })}
              >
                <option value="Anggota Seksi">Anggota Seksi (Default)</option>
                <option value="Koordinator Seksi">Koordinator Seksi</option>
                <option value="Bendahara">Bendahara</option>
                <option value="Sekretaris">Sekretaris</option>
                <option value="Wakil Ketua">Wakil Ketua</option>
                <option value="Ketua Panitia">Ketua Panitia</option>
                <option value="Penasihat">Penasihat</option>
                <option value="Pelindung">Pelindung</option>
              </Select>
            </FormField>

            <FormField label="Seksi (Opsional)">
              <Select
                value={form.seksi_id}
                onChange={(e) => setForm({ ...form, seksi_id: e.target.value })}
              >
                <option value="">-- Tanpa Seksi (Utama) --</option>
                {seksiList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nama_seksi}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        </ModalSection>

        {/* Section 2: Kontak & Catatan */}
        <ModalSection title="Kontak & Keterangan">
          <FormField label="No. HP / WhatsApp">
            <Input
              type="text"
              value={form.no_hp}
              onChange={(e) => setForm({ ...form, no_hp: e.target.value })}
              placeholder="081234567890"
            />
          </FormField>

          <FormField label="Catatan Tambahan">
            <Textarea
              rows={2}
              value={form.catatan}
              onChange={(e) => setForm({ ...form, catatan: e.target.value })}
              placeholder="Contoh: Penanggung jawab sound system masjid"
            />
          </FormField>
        </ModalSection>

        <ModalFooter>
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" size="sm" type="submit">
            Simpan Anggota
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
