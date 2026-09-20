-- ==========================================================
-- Skema Database MariaDB / MySQL untuk Maulid App
-- Karakteristik: InnoDB, UTF-8 (utf8mb4_unicode_ci)
-- ==========================================================

CREATE DATABASE IF NOT EXISTS `maulid_app` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `maulid_app`;

-- 1. Tabel Pengguna Admin
CREATE TABLE IF NOT EXISTS `admin_users` (
  `id` VARCHAR(36) NOT NULL,
  `username` VARCHAR(191) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `nama` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'ketua_panitia',
  `seksi_id` VARCHAR(36) DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'aktif',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_admin_username` (`username`),
  KEY `idx_admin_seksi_id` (`seksi_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabel Panitia
CREATE TABLE IF NOT EXISTS `panitia` (
  `id` VARCHAR(36) NOT NULL,
  `nama` VARCHAR(255) NOT NULL,
  `jabatan` VARCHAR(255) NOT NULL,
  `seksi_id` VARCHAR(36) DEFAULT NULL,
  `no_hp` VARCHAR(50) DEFAULT NULL,
  `catatan` TEXT DEFAULT NULL,
  `user_id` VARCHAR(36) DEFAULT NULL,
  `foto_url` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_panitia_seksi_id` (`seksi_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabel Seksi
CREATE TABLE IF NOT EXISTS `seksi` (
  `id` VARCHAR(36) NOT NULL,
  `nama_seksi` VARCHAR(255) NOT NULL,
  `koordinator_id` VARCHAR(36) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_seksi_koordinator` (`koordinator_id`),
  CONSTRAINT `fk_seksi_koordinator` FOREIGN KEY (`koordinator_id`) REFERENCES `panitia` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabel Tugas
CREATE TABLE IF NOT EXISTS `tugas` (
  `id` VARCHAR(36) NOT NULL,
  `seksi_id` VARCHAR(36) DEFAULT NULL,
  `nama_tugas` VARCHAR(255) NOT NULL,
  `deskripsi` TEXT DEFAULT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Belum Mulai',
  `deadline` VARCHAR(50) DEFAULT NULL,
  `pj_id` VARCHAR(36) DEFAULT NULL,
  `foto_dokumentasi` TEXT DEFAULT NULL,
  `is_umum` TINYINT(1) NOT NULL DEFAULT 0,
  `target_role` VARCHAR(50) DEFAULT NULL,
  `created_by` VARCHAR(36) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tugas_seksi` (`seksi_id`),
  KEY `idx_tugas_pj` (`pj_id`),
  CONSTRAINT `fk_tugas_seksi` FOREIGN KEY (`seksi_id`) REFERENCES `seksi` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tugas_pj` FOREIGN KEY (`pj_id`) REFERENCES `panitia` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabel Rundown Acara
CREATE TABLE IF NOT EXISTS `rundown` (
  `id` VARCHAR(36) NOT NULL,
  `hari` VARCHAR(50) NOT NULL DEFAULT 'Hari H',
  `waktu` VARCHAR(50) NOT NULL,
  `nama_kegiatan` VARCHAR(255) NOT NULL,
  `nama_pengisi` VARCHAR(255) DEFAULT NULL,
  `catatan` TEXT DEFAULT NULL,
  `urutan` INT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rundown_urutan` (`urutan`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabel Keuangan & Kas
CREATE TABLE IF NOT EXISTS `keuangan` (
  `id` VARCHAR(36) NOT NULL,
  `tipe` ENUM('masuk', 'keluar') NOT NULL,
  `tanggal` VARCHAR(50) NOT NULL,
  `keterangan` TEXT NOT NULL,
  `nominal` BIGINT NOT NULL,
  `metode` ENUM('cash', 'transfer') NOT NULL DEFAULT 'cash',
  `kategori` VARCHAR(100) DEFAULT NULL,
  `status` ENUM('aktif', 'void', 'reversal') NOT NULL DEFAULT 'aktif',
  `void_reason` TEXT DEFAULT NULL,
  `void_by` VARCHAR(255) DEFAULT NULL,
  `void_at` DATETIME DEFAULT NULL,
  `void_ref_id` VARCHAR(36) DEFAULT NULL,
  `pair_id` VARCHAR(36) DEFAULT NULL,
  `rab_id` VARCHAR(36) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_keuangan_tipe_metode` (`tipe`, `metode`),
  KEY `idx_keuangan_tanggal` (`tanggal`),
  KEY `idx_keuangan_status` (`status`),
  KEY `idx_keuangan_pair_id` (`pair_id`),
  KEY `idx_keuangan_rab_id` (`rab_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tabel Tamu Undangan
CREATE TABLE IF NOT EXISTS `tamu` (
  `id` VARCHAR(36) NOT NULL,
  `nama` VARCHAR(255) NOT NULL,
  `alamat` TEXT DEFAULT NULL,
  `status` ENUM('VVIP', 'VIP', 'Reguler') NOT NULL DEFAULT 'VIP',
  `pengundang` VARCHAR(255) DEFAULT NULL,
  `kehadiran` ENUM('Hadir', 'Tidak Hadir', 'Belum Konfirmasi') NOT NULL DEFAULT 'Hadir',
  `catatan` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tamu_status` (`status`),
  KEY `idx_tamu_kehadiran` (`kehadiran`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Tabel Wadah / Judul RAB (Master)
CREATE TABLE IF NOT EXISTS `rab` (
  `id` VARCHAR(36) NOT NULL,
  `nama_anggaran` VARCHAR(255) NOT NULL,
  `catatan` TEXT DEFAULT NULL,
  `created_by` VARCHAR(36) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Tabel Rincian Item RAB (Detail)
CREATE TABLE IF NOT EXISTS `rab_items` (
  `id` VARCHAR(36) NOT NULL,
  `rab_id` VARCHAR(36) NOT NULL,
  `nama_item` VARCHAR(255) NOT NULL,
  `volume` DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  `satuan` VARCHAR(50) NOT NULL DEFAULT 'pcs',
  `harga_satuan` BIGINT NOT NULL DEFAULT 0,
  `total_estimasi` BIGINT NOT NULL DEFAULT 0,
  `catatan` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rab_items_rab_id` (`rab_id`),
  CONSTRAINT `fk_rab_items_rab` FOREIGN KEY (`rab_id`) REFERENCES `rab` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
