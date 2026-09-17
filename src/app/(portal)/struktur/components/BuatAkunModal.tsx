"use client";

import React, { useState, useEffect } from "react";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/lib/toast";
import { ROLE_OPTIONS } from "@/lib/role-utils";

interface PanitiaTarget {
  id: string;
  nama: string;
  jabatan: string;
  seksi_id: string | null;
  nama_seksi?: string;
}

interface BuatAkunModalProps {
  isOpen: boolean;
  onClose: () => void;
  panitia: PanitiaTarget | null;
  onSuccess: () => void;
}

export function BuatAkunModal({
  isOpen,
  onClose,
  panitia,
  onSuccess,
}: BuatAkunModalProps) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("koordinator_seksi");

  useEffect(() => {
    if (panitia) {
      const suggestedUsername = panitia.nama
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 15);
      setUsername(suggestedUsername);
      setPassword("");

      let defaultRole = "koordinator_seksi";
      if (panitia.jabatan === "Ketua Panitia") defaultRole = "ketua_panitia";
      else if (panitia.jabatan === "Wakil Ketua") defaultRole = "wakil_ketua";
      else if (panitia.jabatan === "Sekretaris") defaultRole = "sekretaris";
      else if (panitia.jabatan === "Bendahara") defaultRole = "bendahara";
      else if (panitia.jabatan === "Pelindung") defaultRole = "pelindung";
      else if (panitia.jabatan === "Penasihat") defaultRole = "penasihat";
      setRole(defaultRole);
    }
  }, [panitia]);

  if (!panitia) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("Username wajib diisi");
      return;
    }
    if (password.length < 5) {
      toast.error("Password minimal 5 karakter");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          username: username.trim(),
          password,
          nama: panitia.nama,
          role,
          seksi_id: panitia.seksi_id || null,
          panitia_id: panitia.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal membuat akun");
      } else {
        toast.success(`Akun @${username} berhasil dibuat untuk ${panitia.nama}`);
        onSuccess();
        onClose();
      }
    } catch {
      toast.error("Terjadi kesalahan sistem saat membuat akun");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Buat Akun Pengguna Panitia"
      description={`Generate akun login untuk ${panitia.nama} (${panitia.jabatan})`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 text-xs space-y-1">
          <p className="text-slate-500 dark:text-slate-400">
            Nama Anggota: <strong className="text-slate-800 dark:text-slate-100">{panitia.nama}</strong>
          </p>
          <p className="text-slate-500 dark:text-slate-400">
            Jabatan: <span className="font-semibold text-emerald-700 dark:text-emerald-400">{panitia.jabatan}</span>
            {panitia.nama_seksi ? ` (${panitia.nama_seksi})` : ""}
          </p>
        </div>

        <FormField label="Username Login" required hint="Gunakan huruf dan angka tanpa spasi">
          <Input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="contoh: ahmadfauzi"
          />
        </FormField>

        <FormField label="Password Baru" required hint="Minimal 5 karakter">
          <Input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Masukkan kata sandi..."
          />
        </FormField>

        <FormField label="Hak Akses (Role)" required>
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </FormField>

        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Menyimpan..." : "Buat Akun Sekarang"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
