"use client";

import { useEffect, useState, useCallback, Suspense } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { SkeletonTableRow } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { TableActionGroup } from "@/components/shared/TableActionGroup";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/lib/use-confirm";
import { useAuth } from "@/lib/use-auth";
import { ROLE_OPTIONS, ROLE_LABELS } from "@/lib/role-utils";
import { UserItem, Seksi } from "@/types";
import {
  UserCog,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Search,
} from "lucide-react";
import { EditUserModal } from "./components/EditUserModal";

type SeksiItem = Seksi;

function PenggunaContent() {
  const toast = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [seksiList, setSeksiList] = useState<SeksiItem[]>([]);
  const [panitiaList, setPanitiaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Modal Edit
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editData, setEditData] = useState<{
    id: string;
    username: string;
    nama: string;
    role: string;
    seksi_id: string;
    panitia_id?: string;
    new_password: string;
  }>({
    id: "",
    username: "",
    nama: "",
    role: "",
    seksi_id: "",
    panitia_id: "",
    new_password: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Hanya Ketua Panitia yang dapat mengakses halaman ini.");
        }
        throw new Error("Gagal mengambil data pengguna.");
      }
      const data = await res.json();
      setUsers(data.users || []);
      setSeksiList(data.seksiList || []);
      setPanitiaList(data.panitiaList || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat data pengguna";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenEdit = (user: UserItem) => {
    setEditData({
      id: user.id,
      username: user.username,
      nama: user.nama,
      role: user.role,
      seksi_id: user.seksi_id || "",
      panitia_id: user.panitia_id || "",
      new_password: "",
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          id: editData.id,
          username: editData.username,
          nama: editData.nama,
          role: editData.role,
          seksi_id: editData.seksi_id,
          panitia_id: editData.panitia_id || null,
          new_password: editData.new_password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal memperbarui data pengguna");
        return;
      }

      toast.success(`Akun @${editData.username} berhasil diperbarui`);
      setIsEditOpen(false);
      fetchData();
    } catch {
      toast.error("Terjadi kesalahan sistem saat memperbarui akun");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: UserItem) => {
    if (user.id === currentUser?.id) {
      toast.error("Tidak dapat menghapus akun sendiri yang sedang aktif digunakan.");
      return;
    }

    const ok = await confirm({
      title: "Hapus Akun Pengguna",
      message: `Apakah Anda yakin ingin menghapus akun @${user.username} (${user.nama}) secara permanen? Akun ini tidak akan bisa login lagi.`,
      variant: "danger",
      confirmText: "Ya, Hapus Akun",
    });
    if (!ok) return;

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: user.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal menghapus akun pengguna");
        return;
      }

      toast.success(`Akun @${user.username} berhasil dihapus`);
      fetchData();
    } catch {
      toast.error("Terjadi kesalahan sistem saat menghapus akun");
    }
  };

  const handleToggleStatus = async (user: UserItem) => {
    const nextStatus = user.status === "aktif" ? "nonaktif" : "aktif";
    const actionLabel = user.status === "aktif" ? "menonaktifkan" : "mengaktifkan";
    const ok = await confirm({
      title: `${user.status === "aktif" ? "Nonaktifkan" : "Aktifkan"} Akun`,
      message: `Apakah Anda yakin ingin ${actionLabel} akun @${user.username} (${user.nama})?`,
      variant: user.status === "aktif" ? "danger" : "primary",
      confirmText: user.status === "aktif" ? "Ya, Nonaktifkan" : "Ya, Aktifkan",
    });
    if (!ok) return;

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_status", id: user.id, status: nextStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal mengubah status akun");
        return;
      }

      toast.success(`Akun @${user.username} sekarang ${nextStatus}`);
      fetchData();
    } catch {
      toast.error("Terjadi kesalahan saat mengubah status akun");
    }
  };

  const formatRole = (role: string) => {
    return ROLE_LABELS[role] || role;
  };

  const filteredUsers = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.nama.toLowerCase().includes(q) ||
      (u.nama_seksi && u.nama_seksi.toLowerCase().includes(q)) ||
      u.role.toLowerCase().includes(q)
    );
  });

  return (
    <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 transition-colors w-full min-w-0">
        {/* Search Bar */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs mb-6 flex flex-wrap items-center justify-between gap-3 w-full min-w-0">
          <div className="flex-1 min-w-0 max-w-md w-full sm:w-auto">
            <Input
              type="text"
              leftIcon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari berdasarkan nama, username, atau peran..."
              aria-label="Cari pengguna berdasarkan nama, username, atau peran"
              className="w-full text-xs"
            />
          </div>
        </div>

        {/* Table Handling */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-sm min-w-[640px]">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Pengguna</th>
                  <th className="py-3.5 px-4">Peran (Role)</th>
                  <th className="py-3.5 px-4">Tautan Panitia / Seksi</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right no-print">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <SkeletonTableRow key={idx} columns={5} />
                  ))
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="p-6">
                      <ErrorState message={error} onRetry={fetchData} compact />
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6">
                      <EmptyState
                        icon={UserCog}
                        title="Belum Ada Akun Pengguna"
                        description={
                          search
                            ? "Tidak ada akun pengguna yang cocok dengan kata kunci pencarian."
                            : "Belum ada akun pengguna. Buat akun baru langsung dari tabel Struktur Organisasi."
                        }
                        secondaryActionLabel={search ? "Reset Pencarian" : undefined}
                        onSecondaryAction={() => setSearch("")}
                      />
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, idx) => (
                    <tr
                      key={u.id}
                      style={{ animationDelay: `${Math.min(idx * 35, 350)}ms` }}
                      className="animate-stagger-item hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {u.nama}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">@{u.username}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          {formatRole(u.role)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {u.panitia_nama ? (
                          <div className="flex flex-col">
                            <span className="text-slate-800 dark:text-slate-200 font-medium">
                              {u.panitia_nama}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {u.panitia_jabatan}
                              {u.nama_seksi ? ` — ${u.nama_seksi}` : ""}
                            </span>
                          </div>
                        ) : u.nama_seksi ? (
                          <span className="text-slate-600 dark:text-slate-300">
                            {u.nama_seksi}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u)}
                          title="Klik untuk mengubah status aktif/nonaktif"
                          className="focus:outline-none cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          {u.status === "aktif" ? (
                            <Badge
                              variant="success"
                              icon={<CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                            >
                              Aktif
                            </Badge>
                          ) : (
                            <Badge
                              variant="danger"
                              icon={<XCircle className="w-3 h-3 text-rose-600" />}
                            >
                              Nonaktif
                            </Badge>
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right no-print">
                        <TableActionGroup
                          onEdit={() => handleOpenEdit(u)}
                          onDelete={u.id === currentUser?.id ? undefined : () => handleDeleteUser(u)}
                          editTooltip="Edit data login & password"
                          deleteTooltip="Hapus akun"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <EditUserModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSubmit={handleEditSubmit}
          editData={editData}
          setEditData={setEditData}
          seksiList={seksiList}
          panitiaList={panitiaList}
          roleOptions={ROLE_OPTIONS}
          loading={isSubmitting}
        />

        {confirmDialog}
      </main>
  );
}

export default function PenggunaPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400">
          Memuat modul kelola pengguna...
        </div>
      }
    >
      <PenggunaContent />
    </Suspense>
  );
}
