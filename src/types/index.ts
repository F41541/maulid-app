export interface Transaksi {
  id: string;
  tipe: "masuk" | "keluar";
  tanggal: string;
  keterangan: string;
  nominal: number;
  metode: "cash" | "transfer";
  kategori?: string | null;
  status?: "aktif" | "void" | "reversal" | null;
  void_reason?: string | null;
  void_by?: string | null;
  void_at?: string | null;
  void_ref_id?: string | null;
  pair_id?: string | null;
  rab_id?: string | null;
  nama_anggaran?: string | null;
  created_at?: string;
}

export interface Panitia {
  id: string;
  nama: string;
  jabatan: string;
  seksi_id: string | null;
  nama_seksi?: string;
  no_hp: string | null;
  catatan: string | null;
  user_id?: string | null;
  user_username?: string | null;
  created_at?: string;
}

export interface Seksi {
  id: string;
  nama_seksi: string;
  koordinator_id: string | null;
  koordinator_nama?: string;
  koordinator_hp?: string | null;
  total_anggota?: number;
  total_tugas?: number;
  tugas_selesai?: number;
}

export interface RundownItem {
  id: string;
  hari: string;
  waktu: string;
  nama_kegiatan: string;
  nama_pengisi: string | null;
  catatan: string | null;
  urutan: number;
  created_at?: string;
}

export interface Tamu {
  id: string;
  nama: string;
  alamat: string | null;
  status: "VVIP" | "VIP" | "Reguler";
  pengundang?: string | null;
  kehadiran: "Hadir" | "Tidak Hadir" | "Belum Konfirmasi";
  catatan: string | null;
  created_at?: string;
}

export interface Tugas {
  id: string;
  seksi_id: string | null;
  nama_tugas: string;
  deskripsi: string | null;
  status: "Belum Mulai" | "Proses" | "Selesai";
  deadline: string | null;
  foto_dokumentasi?: string | null;
  nama_seksi?: string | null;
  is_umum?: number | null;
  pj_id?: string | null;
  pj_nama?: string | null;
  pj_hp?: string | null;
  target_role?: string | null;
  created_by?: string | null;
  created_at?: string;
}

export interface UserItem {
  id: string;
  username: string;
  nama: string;
  role: string;
  seksi_id?: string | null;
  status: string;
  created_at: string;
  nama_seksi?: string | null;
  panitia_id?: string | null;
  panitia_nama?: string | null;
  panitia_jabatan?: string | null;
}

export interface RabWadah {
  id: string;
  nama_anggaran: string;
  catatan?: string | null;
  total_rencana: number;
  total_realisasi: number;
  sisa_anggaran: number;
  persentase_realisasi: number;
  items_count: number;
  items?: RabItemDetail[];
  created_at?: string;
  updated_at?: string;
}

export interface RabItemDetail {
  id: string;
  rab_id: string;
  nama_item: string;
  volume: number;
  satuan: string;
  harga_satuan: number;
  total_estimasi: number;
  catatan?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RabRingkasanGlobal {
  totalRencana: number;
  totalRealisasi: number;
  sisaAnggaran: number;
  persentaseRealisasi: number;
  totalWadah: number;
  totalItems: number;
}
