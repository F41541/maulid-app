"use client";

import React from "react";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

interface Panitia {
  id: string;
  nama: string;
  jabatan: string;
}

interface SeksiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isEdit: boolean;
  form: {
    nama_seksi: string;
    koordinator_id: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      nama_seksi: string;
      koordinator_id: string;
    }>
  >;
  panitiaList: Panitia[];
}

export function SeksiModal({
  isOpen,
  onClose,
  onSubmit,
  isEdit,
  form,
  setForm,
  panitiaList,
}: SeksiModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Seksi Pelaksana" : "Tambah Seksi Baru"}
      description="Tentukan nama seksi dan tunjuk koordinator pelaksana."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="Nama Seksi" required>
          <Input
            type="text"
            required
            value={form.nama_seksi}
            onChange={(e) => setForm({ ...form, nama_seksi: e.target.value })}
            placeholder="Contoh: Seksi Ubudiyah / Seksi Dekorasi"
          />
        </FormField>

        <FormField
          label="Koordinator / Captain (Opsional)"
          hint="Penanggung jawab seksi dapat ditentukan sekarang atau menyusul."
        >
          <Select
            value={form.koordinator_id}
            onChange={(e) => setForm({ ...form, koordinator_id: e.target.value })}
          >
            <option value="">-- Belum Ditentukan (Opsional) --</option>
            {panitiaList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama} ({p.jabatan})
              </option>
            ))}
          </Select>
        </FormField>

        <ModalFooter>
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" size="sm" type="submit">
            Simpan Seksi
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
