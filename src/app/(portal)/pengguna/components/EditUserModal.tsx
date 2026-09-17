"use client";

import React from "react";
import { Modal, ModalFooter, ModalSection } from "@/components/ui/Modal";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

interface SeksiItem {
  id: string;
  nama_seksi: string;
}

interface PanitiaItem {
  id: string;
  nama: string;
  jabatan: string;
  seksi_id?: string | null;
  nama_seksi?: string | null;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  editData: {
    id: string;
    username: string;
    nama: string;
    role: string;
    seksi_id: string;
    panitia_id?: string;
    new_password: string;
  };
  setEditData: React.Dispatch<
    React.SetStateAction<{
      id: string;
      username: string;
      nama: string;
      role: string;
      seksi_id: string;
      panitia_id?: string;
      new_password: string;
    }>
  >;
  seksiList: SeksiItem[];
  panitiaList?: PanitiaItem[];
  roleOptions: readonly { value: string; label: string }[];
  loading?: boolean;
}

export function EditUserModal({
  isOpen,
  onClose,
  onSubmit,
  editData,
  setEditData,
  seksiList,
  panitiaList,
  roleOptions,
  loading = false,
}: EditUserModalProps) {
  const isKoordinatorAcara =
    editData.role === "koordinator_seksi" || editData.role === "koordinator_acara";

  const handleRoleChange = (newRole: string) => {
    const isKoord = newRole === "koordinator_seksi" || newRole === "koordinator_acara";
    setEditData((prev) => ({
      ...prev,
      role: newRole,
      seksi_id: isKoord ? prev.seksi_id : "",
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Akun Pengguna"
      description={`Ubah informasi profil, kredensial login, atau peran untuk @${editData.username}.`}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <ModalSection title="Profil & Kredensial" bordered={false}>
          <FormField label="Nama Lengkap" required>
            <Input
              type="text"
              value={editData.nama}
              onChange={(e) => setEditData({ ...editData, nama: e.target.value })}
              placeholder="Nama lengkap panitia"
              required
            />
          </FormField>

          <FormField label="Username Login" required>
            <Input
              type="text"
              value={editData.username}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  username: e.target.value.toLowerCase().replace(/\s+/g, ""),
                })
              }
              placeholder="Username login"
              required
            />
          </FormField>
        </ModalSection>

        <ModalSection title="Hak Akses">
          <FormField label="Peran / Hak Akses (Role)" required>
            <Select
              value={editData.role}
              onChange={(e) => handleRoleChange(e.target.value)}
              required
            >
              <option value="">-- Pilih Peran / Hak Akses --</option>
              {roleOptions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label="Tautkan ke Seksi Spesifik"
            required={isKoordinatorAcara}
            hint={
              !isKoordinatorAcara
                ? "Hanya aktif jika peran adalah Koordinator Acara / Seksi"
                : undefined
            }
          >
            <Select
              value={isKoordinatorAcara ? editData.seksi_id : ""}
              onChange={(e) => setEditData({ ...editData, seksi_id: e.target.value })}
              disabled={!isKoordinatorAcara}
              required={isKoordinatorAcara}
            >
              <option value="">
                {isKoordinatorAcara
                  ? "-- Pilih Seksi --"
                  : "-- Hanya aktif jika Koordinator Acara / Seksi --"}
              </option>
              {seksiList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama_seksi}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label="Tautan Anggota Panitia"
            hint="Hubungkan akun ini dengan anggota panitia di Struktur Organisasi"
          >
            <Select
              value={editData.panitia_id || ""}
              onChange={(e) => {
                const selectedPId = e.target.value;
                const p = panitiaList?.find((item) => item.id === selectedPId);
                setEditData((prev) => ({
                  ...prev,
                  panitia_id: selectedPId,
                  nama: p && (!prev.nama || prev.nama === prev.username) ? p.nama : prev.nama,
                  seksi_id: p?.seksi_id || prev.seksi_id,
                }));
              }}
            >
              <option value="">-- Pilih Anggota Panitia (Opsional) --</option>
              {panitiaList?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama} ({p.jabatan}{p.nama_seksi ? ` — ${p.nama_seksi}` : ""})
                </option>
              ))}
            </Select>
          </FormField>
        </ModalSection>

        <ModalSection title="Ubah Password">
          <FormField
            label="Password Baru"
            hint="Kosongkan jika tidak ingin mengganti kata sandi akun"
          >
            <Input
              type="password"
              value={editData.new_password}
              onChange={(e) => setEditData({ ...editData, new_password: e.target.value })}
              placeholder="Minimal 5 karakter (opsional)"
            />
          </FormField>
        </ModalSection>

        <ModalFooter>
          <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={loading}>
            Simpan Perubahan
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
