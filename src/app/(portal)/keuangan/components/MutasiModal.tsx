"use client";

import React from "react";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

interface MutasiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  mutasiForm: {
    dari: "cash" | "transfer";
    ke: "cash" | "transfer";
    nominal: string;
    tanggal: string;
    catatan: string;
  };
  setMutasiForm: React.Dispatch<
    React.SetStateAction<{
      dari: "cash" | "transfer";
      ke: "cash" | "transfer";
      nominal: string;
      tanggal: string;
      catatan: string;
    }>
  >;
}

export function MutasiModal({
  isOpen,
  onClose,
  onSubmit,
  mutasiForm,
  setMutasiForm,
}: MutasiModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mutasi Kas Internal (Cash ⇋ Rekening)"
      description="Pencatatan perpindahan fisik saldo (misal: setor tunai dompet ke bank atau tarik tunai ATM ke dompet panitia)."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Dari (Sumber Dana)" required>
            <Select
              value={mutasiForm.dari}
              onChange={(e) => {
                const dariVal = e.target.value as "cash" | "transfer";
                setMutasiForm({
                  ...mutasiForm,
                  dari: dariVal,
                  ke: dariVal === "cash" ? "transfer" : "cash",
                });
              }}
            >
              <option value="cash">Dompet (Tunai / Cash)</option>
              <option value="transfer">Rekening (Bank)</option>
            </Select>
          </FormField>

          <FormField label="Ke (Tujuan Saldo)" required>
            <Select
              value={mutasiForm.ke}
              onChange={(e) => {
                const keVal = e.target.value as "cash" | "transfer";
                setMutasiForm({
                  ...mutasiForm,
                  ke: keVal,
                  dari: keVal === "cash" ? "transfer" : "cash",
                });
              }}
            >
              <option value="transfer">Rekening (Bank)</option>
              <option value="cash">Dompet (Tunai / Cash)</option>
            </Select>
          </FormField>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-3">
          <FormField label="Nominal Mutasi (Rp)" required>
            <Input
              type="number"
              required
              min={1}
              value={mutasiForm.nominal}
              onChange={(e) => setMutasiForm({ ...mutasiForm, nominal: e.target.value })}
              placeholder="Contoh: 1000000"
            />
          </FormField>

          <FormField label="Tanggal Mutasi" required>
            <DateInput
              required
              value={mutasiForm.tanggal}
              onChange={(val) => setMutasiForm({ ...mutasiForm, tanggal: val })}
            />
          </FormField>

          <FormField label="Keterangan Tambahan (Opsional)">
            <Input
              type="text"
              value={mutasiForm.catatan}
              onChange={(e) => setMutasiForm({ ...mutasiForm, catatan: e.target.value })}
              placeholder="Contoh: Tarik tunai ATM untuk konsumsi hari-H"
            />
          </FormField>
        </div>

        <ModalFooter>
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" size="sm" type="submit">
            Proses Mutasi Saldo
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
