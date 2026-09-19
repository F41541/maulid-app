"use client";

import React, { useState, useEffect } from "react";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { FormField } from "@/components/ui/FormField";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/lib/toast";
import { Panitia, Seksi } from "@/types";

interface PindahPosisiModalProps {
  isOpen: boolean;
  onClose: () => void;
  panitia: Panitia | null;
  seksiList: Seksi[];
  onSuccess: () => void;
}

export function PindahPosisiModal({
  isOpen,
  onClose,
  panitia,
  seksiList,
  onSuccess,
}: PindahPosisiModalProps) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [jabatan, setJabatan] = useState("Anggota Seksi");
  const [seksiId, setSeksiId] = useState("");

  useEffect(() => {
    if (panitia) {
      setJabatan(panitia.jabatan || "Anggota Seksi");
      setSeksiId(panitia.seksi_id || "");
    }
  }, [panitia]);

  if (!panitia) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/struktur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_panitia",
          id: panitia.id,
          nama: panitia.nama,
          no_hp: panitia.no_hp || null,
          catatan: panitia.catatan || null,
          jabatan,
          seksi_id: seksiId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal memindahkan posisi panitia");
      } else {
        toast.success(`Posisi ${panitia.nama} berhasil diperbarui`);
        onSuccess();
        onClose();
      }
    } catch {
      toast.error("Terjadi kesalahan sistem saat memindahkan posisi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pindah Posisi / Jabatan Panitia"
      description={`Ubah jabatan dan seksi untuk ${panitia.nama}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info Panitia Saat Ini */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 text-xs space-y-1">
          <p className="text-slate-500 dark:text-slate-400">
            Nama Panitia: <strong className="text-slate-900 dark:text-slate-100">{panitia.nama}</strong>
          </p>
          <p className="text-slate-500 dark:text-slate-400">
            Posisi Saat Ini:{" "}
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              {panitia.jabatan}
            </span>
            {panitia.nama_seksi ? ` • ${panitia.nama_seksi}` : " • Tanpa Seksi (Utama)"}
          </p>
        </div>

        {/* Form Fields: Jabatan & Seksi */}
        <div className="space-y-3">
          <FormField label="Jabatan Baru" required>
            <Select
              required
              value={jabatan}
              onChange={(e) => setJabatan(e.target.value)}
            >
              <option value="Anggota Seksi">Anggota Seksi</option>
              <option value="Koordinator Seksi">Koordinator Seksi</option>
              <option value="Bendahara">Bendahara</option>
              <option value="Sekretaris">Sekretaris</option>
              <option value="Wakil Ketua">Wakil Ketua</option>
              <option value="Ketua Panitia">Ketua Panitia</option>
              <option value="Penasihat">Penasihat</option>
              <option value="Pelindung">Pelindung</option>
            </Select>
          </FormField>

          <FormField label="Seksi Baru (Opsional)">
            <Select
              value={seksiId}
              onChange={(e) => setSeksiId(e.target.value)}
            >
              <option value="">Tanpa Seksi</option>
              {seksiList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama_seksi}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Menyimpan..." : "Simpan Pemindahan"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
