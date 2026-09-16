import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

const dbDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, "maulid.db");
let _db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!_db) {
    _db = new DatabaseSync(dbPath);
    _db.exec("PRAGMA foreign_keys = ON;");
    initSchema(_db);
    seedInitialData(_db);
  }
  return _db;
}

export function initSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nama TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS panitia (
      id TEXT PRIMARY KEY,
      nama TEXT NOT NULL,
      jabatan TEXT NOT NULL,
      seksi_id TEXT,
      no_hp TEXT,
      catatan TEXT,
      user_id TEXT,
      foto_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS seksi (
      id TEXT PRIMARY KEY,
      nama_seksi TEXT NOT NULL,
      koordinator_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (koordinator_id) REFERENCES panitia(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS tugas (
      id TEXT PRIMARY KEY,
      seksi_id TEXT NOT NULL,
      nama_tugas TEXT NOT NULL,
      deskripsi TEXT,
      status TEXT NOT NULL DEFAULT 'Belum Mulai',
      deadline TEXT,
      pj_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (seksi_id) REFERENCES seksi(id) ON DELETE CASCADE,
      FOREIGN KEY (pj_id) REFERENCES panitia(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS rundown (
      id TEXT PRIMARY KEY,
      hari TEXT NOT NULL DEFAULT 'Hari H',
      waktu TEXT NOT NULL,
      nama_kegiatan TEXT NOT NULL,
      nama_pengisi TEXT,
      catatan TEXT,
      urutan INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS keuangan (
      id TEXT PRIMARY KEY,
      tipe TEXT NOT NULL CHECK(tipe IN ('masuk', 'keluar')),
      tanggal TEXT NOT NULL,
      keterangan TEXT NOT NULL,
      nominal INTEGER NOT NULL CHECK(nominal >= 0),
      metode TEXT NOT NULL DEFAULT 'cash' CHECK(metode IN ('cash', 'transfer')),
      kategori TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tamu (
      id TEXT PRIMARY KEY,
      nama TEXT NOT NULL,
      alamat TEXT,
      status TEXT NOT NULL DEFAULT 'VIP' CHECK(status IN ('VVIP', 'VIP', 'Reguler')),
      pengundang TEXT,
      kehadiran TEXT NOT NULL DEFAULT 'Hadir' CHECK(kehadiran IN ('Hadir', 'Tidak Hadir', 'Belum Konfirmasi')),
      catatan TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration helper: clean up non-conforming tamu statuses, or recreate table if constraint is missing
  try {
    // Check if table has legacy schema
    const currentTableSql = db
      .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='tamu'")
      .get() as { sql: string } | undefined;

    if (currentTableSql && !currentTableSql.sql.includes("'Reguler'")) {
      db.exec(`
        -- Delete any guest with status outside VVIP, VIP, Reguler as requested
        DELETE FROM tamu WHERE status NOT IN ('VVIP', 'VIP', 'Reguler');

        CREATE TABLE tamu_new (
          id TEXT PRIMARY KEY,
          nama TEXT NOT NULL,
          alamat TEXT,
          status TEXT NOT NULL DEFAULT 'VIP' CHECK(status IN ('VVIP', 'VIP', 'Reguler')),
          pengundang TEXT,
          kehadiran TEXT NOT NULL DEFAULT 'Hadir' CHECK(kehadiran IN ('Hadir', 'Tidak Hadir', 'Belum Konfirmasi')),
          catatan TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        INSERT INTO tamu_new (id, nama, alamat, status, pengundang, kehadiran, catatan, created_at)
        SELECT id, nama, alamat, status, pengundang, CASE WHEN kehadiran IN ('Hadir', 'Tidak Hadir', 'Belum Konfirmasi') THEN kehadiran ELSE 'Hadir' END, catatan, created_at
        FROM tamu;

        DROP TABLE tamu;
        ALTER TABLE tamu_new RENAME TO tamu;
      `);
    }
  } catch (e) {
    // Migration fallback
  }

  // Migration helper: check if 'hari' exists in rundown
  try {
    const rundownInfo = db.prepare("PRAGMA table_info(rundown)").all() as Array<{ name: string }>;
    const hasHari = rundownInfo.some((col) => col.name === "hari");
    if (!hasHari) {
      db.exec("ALTER TABLE rundown ADD COLUMN hari TEXT NOT NULL DEFAULT 'Hari H';");
    }
  } catch {
    // column might already exist
  }

  // Migration helper: check if 'metode' exists in keuangan
  try {
    const tableInfo = db.prepare("PRAGMA table_info(keuangan)").all() as Array<{ name: string }>;
    const hasMetode = tableInfo.some((col) => col.name === "metode");
    if (!hasMetode) {
      db.exec("ALTER TABLE keuangan ADD COLUMN metode TEXT NOT NULL DEFAULT 'cash' CHECK(metode IN ('cash', 'transfer'));");
    }
  } catch {
    // column might already exist
  }

  // Migration helper: check if 'role' exists in admin_users
  try {
    const userTableInfo = db.prepare("PRAGMA table_info(admin_users)").all() as Array<{ name: string }>;
    const hasRole = userTableInfo.some((col) => col.name === "role");
    if (!hasRole) {
      db.exec("ALTER TABLE admin_users ADD COLUMN role TEXT NOT NULL DEFAULT 'admin';");
    }
  } catch {
    // column might already exist
  }
}

export function seedInitialData(db: DatabaseSync) {
  // Check if admin user exists
  const existingAdmin = db.prepare("SELECT id FROM admin_users WHERE username = ?").get("admin");
  if (!existingAdmin) {
    db.prepare("INSERT INTO admin_users (id, username, password, nama, role) VALUES (?, ?, ?, ?, ?)").run(
      "admin-1",
      "admin",
      "admin123", // default password
      "Sekretariat Panitia",
      "admin"
    );
  }

  const existingExampleAdmin = db.prepare("SELECT id FROM admin_users WHERE username = ?").get("admin@example.com");
  if (!existingExampleAdmin) {
    db.prepare("INSERT INTO admin_users (id, username, password, nama, role) VALUES (?, ?, ?, ?, ?)").run(
      "admin-2",
      "admin@example.com",
      "password",
      "Pengelola Aplikasi",
      "admin"
    );
  }

  // Check if panitia exists
  const panitiaCount = db.prepare("SELECT count(*) as count FROM panitia").get() as { count: number };
  if (panitiaCount.count === 0) {
    // 1. Initial leadership panitia
    const p1 = "p-1";
    const p2 = "p-2";
    const p3 = "p-3";
    const p4 = "p-4";
    const p5 = "p-5";
    const p6 = "p-6";

    // Coordinators
    const pAcara = "p-7";
    const pPerlengkapan = "p-8";
    const pKonsumsi = "p-9";

    const insertPanitia = db.prepare(
      "INSERT INTO panitia (id, nama, jabatan, seksi_id, no_hp, catatan) VALUES (?, ?, ?, ?, ?, ?)"
    );

    insertPanitia.run(p1, "K.H. Ahmad Fauzi", "Pelindung", null, "081234567890", "Ketua Yayasan");
    insertPanitia.run(p2, "Ustadz H. Mansur", "Penasihat", null, "081234567891", "Tokoh Masyarakat");
    insertPanitia.run(p3, "Muhammad Rizky", "Ketua Panitia", null, "081234567892", "Penanggung Jawab Umum");
    insertPanitia.run(p4, "Hadi Pratama", "Wakil Ketua", null, "081234567893", "Pembantu Ketua");
    insertPanitia.run(p5, "Siti Nurhaliza", "Sekretaris", null, "081234567894", "Administrasi Acara");
    insertPanitia.run(p6, "Dewi Anggraini", "Bendahara", null, "081234567895", "Keuangan Panitia");

    insertPanitia.run(pAcara, "Zulfikar Hidayat", "Koordinator Seksi", null, "081234567896", "PJ Susunan Acara");
    insertPanitia.run(pPerlengkapan, "Budi Setiawan", "Koordinator Seksi", null, "081234567897", "PJ Alat & Sound");
    insertPanitia.run(pKonsumsi, "Aisyah Zahra", "Koordinator Seksi", null, "081234567898", "PJ Konsumsi Jamaah");

    // 2. Initial Seksi
    const s1 = "s-1";
    const s2 = "s-2";
    const s3 = "s-3";
    const insertSeksi = db.prepare("INSERT INTO seksi (id, nama_seksi, koordinator_id) VALUES (?, ?, ?)");
    insertSeksi.run(s1, "Seksi Acara", pAcara);
    insertSeksi.run(s2, "Seksi Perlengkapan", pPerlengkapan);
    insertSeksi.run(s3, "Seksi Konsumsi", pKonsumsi);

    // Update seksi_id on panitia coordinators
    const updatePanitiaSeksi = db.prepare("UPDATE panitia SET seksi_id = ? WHERE id = ?");
    updatePanitiaSeksi.run(s1, pAcara);
    updatePanitiaSeksi.run(s2, pPerlengkapan);
    updatePanitiaSeksi.run(s3, pKonsumsi);

    // Add members
    const pAcaraMember = "p-10";
    insertPanitia.run(pAcaraMember, "Fajar Nugraha", "Anggota Seksi", s1, "081298765431", "Operator Audio");

    // 3. Initial Rundown
    const insertRundown = db.prepare(
      "INSERT INTO rundown (id, hari, waktu, nama_kegiatan, nama_pengisi, catatan, urutan) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    insertRundown.run("r-1", "Hari H", "19:30 - 19:45", "Pembukaan & Tawasul", "Ustadz H. Mansur", "Acara dimulai tepat waktu", 1);
    insertRundown.run("r-2", "Hari H", "19:45 - 20:15", "Pembacaan Ayat Suci Al-Qur'an", "Ustadz Qori Syamsuri", "Surat Al-Ahzab", 2);
    insertRundown.run("r-3", "Hari H", "20:15 - 20:45", "Pembacaan Maulid Diba'i & Sholawat", "Grup Hadroh Syubban", "Jamaah berdiri saat mahalul qiyam", 3);
    insertRundown.run("r-4", "Hari H", "20:45 - 21:00", "Sambutan Ketua Panitia & Pelindung", "Muhammad Rizky & K.H. Ahmad Fauzi", "Masing-masing 7 menit", 4);
    insertRundown.run("r-5", "Hari H", "21:00 - 22:30", "Mau'idhoh Hasanah / Tausiyah Inti", "Habib Umar bin Yahya", "Tema Meneladani Akhlak Rasulullah", 5);
    insertRundown.run("r-6", "Hari H", "22:30 - 22:45", "Doa Penutup & Ramah Tamah", "K.H. Ahmad Fauzi", "Pembagian konsumsi berkah", 6);

    // 4. Initial Tugas
    const insertTugas = db.prepare(
      "INSERT INTO tugas (id, seksi_id, nama_tugas, deskripsi, status, deadline, pj_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    insertTugas.run("t-1", s1, "Konfirmasi Jadwal Penceramah & Qori", "Hubungi Habib dan Qori H-3 acara", "Selesai", "2026-09-14", pAcara);
    insertTugas.run("t-2", s1, "Siapkan Teks Rawi Maulid & MC", "Cetak panduan pembacaan maulid", "Proses", "2026-09-15", pAcaraMember);
    insertTugas.run("t-3", s2, "Sewa Tenda, Panggung & Sound System", "Kapasitas 500 jamaah di halaman masjid", "Selesai", "2026-09-12", pPerlengkapan);
    insertTugas.run("t-4", s2, "Pemasangan Lampu Sorot & Banner Panggung", "Banner ukuran 6x3 meter dan penerangan", "Proses", "2026-09-16", pPerlengkapan);
    insertTugas.run("t-5", s3, "Pemesanan Snack Box & Nasi Kebuli", "Pesan 500 kotak makanan berkah", "Belum Mulai", "2026-09-16", pKonsumsi);

    // 5. Initial Keuangan
    const insertKeuangan = db.prepare(
      "INSERT INTO keuangan (id, tipe, tanggal, keterangan, nominal, metode) VALUES (?, ?, ?, ?, ?, ?)"
    );
    insertKeuangan.run("k-1", "masuk", "2026-09-01", "Kas Awal Yayasan", 5000000, "transfer");
    insertKeuangan.run("k-2", "masuk", "2026-09-05", "Hamba Allah (Infaq Donatur)", 3500000, "cash");
    insertKeuangan.run("k-3", "masuk", "2026-09-10", "Bapak H. Sulaeman (Donasi Pribadi)", 2000000, "transfer");
    insertKeuangan.run("k-4", "keluar", "2026-09-12", "DP Sewa Tenda & Sound System", 3000000, "transfer");
    insertKeuangan.run("k-5", "keluar", "2026-09-13", "Cetak Banner & Spanduk Acara", 450000, "cash");
    insertKeuangan.run("k-6", "keluar", "2026-09-14", "DP Konsumsi Makanan Jamaah", 2500000, "cash");
  }

  // Check if tamu exists
  const tamuCount = db.prepare("SELECT count(*) as count FROM tamu").get() as { count: number };
  if (tamuCount.count === 0) {
    const insertTamu = db.prepare(
      "INSERT INTO tamu (id, nama, alamat, status, pengundang, kehadiran, catatan) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    insertTamu.run("tm-1", "Habib Umar bin Yahya", "Jakarta Selatan", "VVIP", "Ketua Panitia", "Hadir", "Penceramah Utama Maulid");
    insertTamu.run("tm-2", "K.H. Syarif Hidayatullah", "Kecamatan Caringin", "VVIP", "Pelindung", "Hadir", "Pimpinan Ponpes Al-Hikmah");
    insertTamu.run("tm-3", "Bapak Camat & Rombongan", "Kantor Kecamatan", "VIP", "Sekretaris", "Hadir", "Undangan Muspika");
    insertTamu.run("tm-4", "Ust. Qori Syamsuri", "Tangerang", "VIP", "Seksi Acara", "Hadir", "Qori Internasional");
    insertTamu.run("tm-5", "H. Sulaeman", "Jl. Melati No. 12", "VIP", "Bendahara", "Hadir", "Donatur Utama");
    insertTamu.run("tm-6", "Jamaah Majelis Ta'lim An-Nur", "Komplek Griya Indah", "Reguler", "Seksi Humas", "Hadir", "Jamaah Pengajian");
  }
}
