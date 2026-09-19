"use client";

import React from "react";
import { Modal, ModalFooter, ModalSection } from "@/components/ui/Modal";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

interface TamuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isEdit: boolean;
  form: {
    nama: string;
    alamat: string;
    status: string;
    pengundang: string;
    kehadiran: string;
    catatan: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      nama: string;
      alamat: string;
      status: string;
      pengundang: string;
      kehadiran: string;
      catatan: string;
    }>
  >;
}

export function TamuModal({
  isOpen,
  onClose,
  onSubmit,
  isEdit,
  form,
  setForm,
}: TamuModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Data Tamu Undangan" : "Tambah Tamu Undangan"}
      description="Kelola daftar undangan VIP/VVIP dan konfirmasi kehadiran acara."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Section 1: Identitas */}
        <ModalSection title="Identitas Tamu" bordered={false}>
          <FormField label="Nama Lengkap Tamu / Instansi" required>
            <Input
              type="text"
              required
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              placeholder="Contoh: Habib Jindan bin Novel / Camat Caringin"
            />
          </FormField>

          <FormField label="Alamat / Domisili / Lembaga">
            <Input
              type="text"
              value={form.alamat}
              onChange={(e) => setForm({ ...form, alamat: e.target.value })}
              placeholder="Contoh: RT 03 / Ponpes Darul Ulum"
            />
          </FormField>
        </ModalSection>

        {/* Section 2: Kategori & Status */}
        <ModalSection title="Kategori & Konfirmasi">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Status / Kategori" required>
              <Select
                required
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="VIP">VIP</option>
                <option value="VVIP">VVIP</option>
                <option value="Reguler">Reguler</option>
              </Select>
            </FormField>

            <FormField label="Undangan Dari Siapa">
              <Input
                type="text"
                value={form.pengundang}
                onChange={(e) => setForm({ ...form, pengundang: e.target.value })}
                placeholder="Contoh: Ketua Panitia / Humas"
              />
            </FormField>
          </div>

          <FormField label="Konfirmasi Kehadiran">
            <Select
              value={form.kehadiran}
              onChange={(e) => setForm({ ...form, kehadiran: e.target.value })}
            >
              <option value="Hadir">Hadir</option>
              <option value="Belum Konfirmasi">Belum Konfirmasi</option>
              <option value="Tidak Hadir">Tidak Hadir</option>
            </Select>
          </FormField>

          <FormField label="Catatan Khusus (Kursi Depan, Sambutan, dll)">
            <Textarea
              rows={2}
              value={form.catatan}
              onChange={(e) => setForm({ ...form, catatan: e.target.value })}
              placeholder="Contoh: Disediakan karpet VVIP baris depan"
            />
          </FormField>
        </ModalSection>

        <ModalFooter>
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" size="sm" type="submit">
            Simpan Tamu
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
