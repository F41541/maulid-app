import mysql from "mysql2/promise";
import type { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { hashPassword } from "./auth-tokens.ts";

let _pool: Pool | null = null;
let _initialized = false;

export function getPool(): Pool {
  if (!_pool) {
    if (process.env.DATABASE_URL) {
      _pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        charset: "utf8mb4",
        decimalNumbers: true,
      });
    } else {
      const host = process.env.DB_HOST || "127.0.0.1";
      const port = Number(process.env.DB_PORT) || 3306;
      const user = process.env.DB_USER || "root";
      const password = process.env.DB_PASSWORD || "";
      const database = process.env.DB_NAME || "maulid_app";

      _pool = mysql.createPool({
        host,
        port,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        charset: "utf8mb4",
        decimalNumbers: true,
      });
    }
  }
  return _pool;
}

// Alias for getPool
export const getDb = getPool;

export async function query<T = RowDataPacket>(sql: string, params: any[] = []): Promise<T[]> {
  const pool = getPool();
  await ensureInitialized();
  const [rows] = await pool.query(sql, params as any);
  return rows as T[];
}

export async function queryOne<T = RowDataPacket>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function execute(sql: string, params: any[] = []): Promise<ResultSetHeader> {
  const pool = getPool();
  await ensureInitialized();
  const [result] = await pool.execute<ResultSetHeader>(sql, params as any);
  return result;
}

export async function withTransaction<T>(
  fn: (conn: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const pool = getPool();
  await ensureInitialized();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

let _initPromise: Promise<void> | null = null;

async function ensureInitialized() {
  if (_initialized) return;
  if (!_initPromise) {
    _initPromise = (async () => {
      try {
        await initSchema();
        await seedInitialData();
        _initialized = true;
      } catch (err) {
        _initPromise = null;
        _initialized = false;
        console.error("[Database] Init schema error:", err);
        throw err;
      }
    })();
  }
  return _initPromise;
}

export async function initSchema(customPool?: Pool): Promise<void> {
  const pool: Pool = customPool || getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id VARCHAR(36) PRIMARY KEY,
      username VARCHAR(191) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      nama VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'ketua_panitia',
      seksi_id VARCHAR(36) NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'aktif',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS panitia (
      id VARCHAR(36) PRIMARY KEY,
      nama VARCHAR(255) NOT NULL,
      jabatan VARCHAR(255) NOT NULL,
      seksi_id VARCHAR(36) NULL,
      no_hp VARCHAR(50) NULL,
      catatan TEXT NULL,
      user_id VARCHAR(36) NULL,
      foto_url TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS seksi (
      id VARCHAR(36) PRIMARY KEY,
      nama_seksi VARCHAR(255) NOT NULL,
      koordinator_id VARCHAR(36) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_seksi_koordinator FOREIGN KEY (koordinator_id) REFERENCES panitia(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tugas (
      id VARCHAR(36) PRIMARY KEY,
      seksi_id VARCHAR(36) NULL,
      nama_tugas VARCHAR(255) NOT NULL,
      deskripsi TEXT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'Belum Mulai',
      deadline VARCHAR(50) NULL,
      pj_id VARCHAR(36) NULL,
      foto_dokumentasi TEXT NULL,
      is_umum TINYINT(1) NOT NULL DEFAULT 0,
      target_role VARCHAR(50) NULL,
      created_by VARCHAR(36) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_tugas_seksi FOREIGN KEY (seksi_id) REFERENCES seksi(id) ON DELETE CASCADE,
      CONSTRAINT fk_tugas_pj FOREIGN KEY (pj_id) REFERENCES panitia(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS rundown (
      id VARCHAR(36) PRIMARY KEY,
      hari VARCHAR(50) NOT NULL DEFAULT 'Hari H',
      waktu VARCHAR(50) NOT NULL,
      nama_kegiatan VARCHAR(255) NOT NULL,
      nama_pengisi VARCHAR(255) NULL,
      catatan TEXT NULL,
      urutan INT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS keuangan (
      id VARCHAR(36) PRIMARY KEY,
      tipe ENUM('masuk', 'keluar') NOT NULL,
      tanggal VARCHAR(50) NOT NULL,
      keterangan TEXT NOT NULL,
      nominal BIGINT NOT NULL,
      metode ENUM('cash', 'transfer') NOT NULL DEFAULT 'cash',
      kategori VARCHAR(100) NULL,
      status ENUM('aktif', 'void', 'reversal') NOT NULL DEFAULT 'aktif',
      void_reason TEXT NULL,
      void_by VARCHAR(255) NULL,
      void_at DATETIME NULL,
      void_ref_id VARCHAR(36) NULL,
      pair_id VARCHAR(36) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tamu (
      id VARCHAR(36) PRIMARY KEY,
      nama VARCHAR(255) NOT NULL,
      alamat TEXT NULL,
      status ENUM('VVIP', 'VIP', 'Reguler') NOT NULL DEFAULT 'VIP',
      pengundang VARCHAR(255) NULL,
      kehadiran ENUM('Hadir', 'Tidak Hadir', 'Belum Konfirmasi') NOT NULL DEFAULT 'Hadir',
      catatan TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Migration for existing MariaDB columns
  const addCol = async (table: string, col: string, def: string) => {
    try {
      await pool.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
    } catch {}
  };

  await addCol("admin_users", "seksi_id", "VARCHAR(36) NULL");
  await addCol("admin_users", "status", "VARCHAR(20) NOT NULL DEFAULT 'aktif'");
  await addCol("tugas", "foto_dokumentasi", "TEXT NULL");
  await addCol("tugas", "is_umum", "TINYINT(1) NOT NULL DEFAULT 0");
  await addCol("tugas", "target_role", "VARCHAR(50) NULL");
  await addCol("tugas", "created_by", "VARCHAR(36) NULL");
  await addCol("keuangan", "status", "ENUM('aktif', 'void', 'reversal') NOT NULL DEFAULT 'aktif'");
  await addCol("keuangan", "void_reason", "TEXT NULL");
  await addCol("keuangan", "void_by", "VARCHAR(255) NULL");
  await addCol("keuangan", "void_at", "DATETIME NULL");
  await addCol("keuangan", "void_ref_id", "VARCHAR(36) NULL");
  await addCol("keuangan", "pair_id", "VARCHAR(36) NULL");

  try {
    await pool.query("UPDATE admin_users SET role = 'ketua_panitia' WHERE role = 'admin'");
  } catch {}
}

export async function seedInitialData(customPool?: Pool): Promise<void> {
  const pool: Pool = customPool || getPool();

  // 1. Clean up legacy admin seeder (Sekretariat Panitia) if present
  await pool.execute(
    "DELETE FROM admin_users WHERE username = 'admin' AND (nama = 'Sekretariat Panitia' OR id = 'admin-1')"
  ).catch(() => {});

  // Idempotent migration for old legacy placeholder without overwriting user password
  await pool.execute(
    "UPDATE admin_users SET username = 'mfaisalfahri02@gmail.com', nama = 'Ketua Panitia', role = 'ketua_panitia' WHERE username = 'admin@example.com'"
  );

  const [ketuaUser] = (await pool.query(
    "SELECT id FROM admin_users WHERE username = ? OR id = ?",
    ["mfaisalfahri02@gmail.com", "admin-2"]
  )) as [RowDataPacket[], unknown];

  if (ketuaUser.length === 0) {
    await pool.execute(
      "INSERT INTO admin_users (id, username, password, nama, role) VALUES (?, ?, ?, ?, ?)",
      ["admin-2", "mfaisalfahri02@gmail.com", hashPassword("password"), "Ketua Panitia", "ketua_panitia"]
    );
  }

  // 2. Check panitia
  const [panitiaRows] = (await pool.query(
    "SELECT count(*) as count FROM panitia"
  )) as [Array<{ count: number }>, unknown];

  if (Number(panitiaRows[0]?.count || 0) === 0) {
    const p1 = "p-1";
    const p2 = "p-2";
    const p3 = "p-3";
    const p4 = "p-4";
    const p5 = "p-5";
    const p6 = "p-6";
    const pAcara = "p-7";
    const pPerlengkapan = "p-8";
    const pKonsumsi = "p-9";

    const insertPanitiaSql =
      "INSERT INTO panitia (id, nama, jabatan, seksi_id, no_hp, catatan) VALUES (?, ?, ?, ?, ?, ?)";

    await pool.execute(insertPanitiaSql, [p1, "K.H. Ahmad Fauzi", "Pelindung", null, "081234567890", "Ketua Yayasan"]);
    await pool.execute(insertPanitiaSql, [p2, "Ustadz H. Mansur", "Penasihat", null, "081234567891", "Tokoh Masyarakat"]);
    await pool.execute(insertPanitiaSql, [p3, "Muhammad Rizky", "Ketua Panitia", null, "081234567892", "Penanggung Jawab Umum"]);
    await pool.execute(insertPanitiaSql, [p4, "Hadi Pratama", "Wakil Ketua", null, "081234567893", "Pembantu Ketua"]);
    await pool.execute(insertPanitiaSql, [p5, "Siti Nurhaliza", "Sekretaris", null, "081234567894", "Administrasi Acara"]);
    await pool.execute(insertPanitiaSql, [p6, "Dewi Anggraini", "Bendahara", null, "081234567895", "Keuangan Panitia"]);

    await pool.execute(insertPanitiaSql, [pAcara, "Zulfikar Hidayat", "Koordinator Seksi", null, "081234567896", "PJ Susunan Acara"]);
    await pool.execute(insertPanitiaSql, [pPerlengkapan, "Budi Setiawan", "Koordinator Seksi", null, "081234567897", "PJ Alat & Sound"]);
    await pool.execute(insertPanitiaSql, [pKonsumsi, "Aisyah Zahra", "Koordinator Seksi", null, "081234567898", "PJ Konsumsi Jamaah"]);

    // 3. Seksi
    const s1 = "s-1";
    const s2 = "s-2";
    const s3 = "s-3";
    const insertSeksiSql = "INSERT INTO seksi (id, nama_seksi, koordinator_id) VALUES (?, ?, ?)";
    await pool.execute(insertSeksiSql, [s1, "Seksi Acara", pAcara]);
    await pool.execute(insertSeksiSql, [s2, "Seksi Perlengkapan", pPerlengkapan]);
    await pool.execute(insertSeksiSql, [s3, "Seksi Konsumsi", pKonsumsi]);

    // Update seksi_id
    await pool.execute("UPDATE panitia SET seksi_id = ? WHERE id = ?", [s1, pAcara]);
    await pool.execute("UPDATE panitia SET seksi_id = ? WHERE id = ?", [s2, pPerlengkapan]);
    await pool.execute("UPDATE panitia SET seksi_id = ? WHERE id = ?", [s3, pKonsumsi]);

    // Add member
    const pAcaraMember = "p-10";
    await pool.execute(insertPanitiaSql, [pAcaraMember, "Fajar Nugraha", "Anggota Seksi", s1, "081298765431", "Operator Audio"]);

    // 4. Initial Rundown (11 Oktober 2026)
    const insertRundownSql =
      "INSERT INTO rundown (id, hari, waktu, nama_kegiatan, nama_pengisi, catatan, urutan) VALUES (?, ?, ?, ?, ?, ?, ?)";
    await pool.execute(insertRundownSql, ["r-1", "2026-10-11", "19:30 - 19:45", "Pembukaan & Tawasul", "Ustadz H. Mansur", "Acara dimulai tepat waktu", 1]);
    await pool.execute(insertRundownSql, ["r-4", "2026-10-11", "19:45 - 20:05", "Sambutan Ketua Panitia & Pelindung", "Muhammad Rizky & K.H. Ahmad Fauzi", "Masing-masing 7 - 10 menit", 2]);
    await pool.execute(insertRundownSql, ["r-2", "2026-10-11", "20:05 - 20:30", "Pembacaan Ayat Suci Al-Qur'an", "Ustadz Qori Syamsuri", "Surat Al-Ahzab", 3]);
    await pool.execute(insertRundownSql, ["r-5", "2026-10-11", "20:30 - 21:45", "Mau'idhoh Hasanah / Tausiyah Inti", "Habib Umar bin Yahya", "Tema Meneladani Akhlak Rasulullah SAW", 4]);
    await pool.execute(insertRundownSql, ["r-3", "2026-10-11", "21:45 - 22:30", "Pembacaan Maulid Diba'i & Sholawat", "Grup Hadroh Syubban", "Jamaah berdiri saat mahalul qiyam", 5]);
    await pool.execute(insertRundownSql, ["r-6", "2026-10-11", "22:30 - 22:45", "Doa Penutup & Ramah Tamah", "K.H. Ahmad Fauzi", "Pembagian konsumsi berkah", 6]);

    // 5. Initial Tugas (Deadline menuju 11 Oktober 2026)
    const insertTugasSql =
      "INSERT INTO tugas (id, seksi_id, nama_tugas, deskripsi, status, deadline, pj_id) VALUES (?, ?, ?, ?, ?, ?, ?)";
    await pool.execute(insertTugasSql, ["t-1", s1, "Konfirmasi Jadwal Penceramah & Qori", "Hubungi Habib dan Qori H-3 acara", "Selesai", "2026-10-08", pAcara]);
    await pool.execute(insertTugasSql, ["t-2", s1, "Siapkan Teks Rawi Maulid & MC", "Cetak panduan pembacaan maulid", "Proses", "2026-10-09", pAcaraMember]);
    await pool.execute(insertTugasSql, ["t-3", s2, "Sewa Tenda, Panggung & Sound System", "Kapasitas 500 jamaah di halaman masjid", "Selesai", "2026-10-05", pPerlengkapan]);
    await pool.execute(insertTugasSql, ["t-4", s2, "Pemasangan Lampu Sorot & Banner Panggung", "Banner ukuran 6x3 meter dan penerangan", "Proses", "2026-10-10", pPerlengkapan]);
    await pool.execute(insertTugasSql, ["t-5", s3, "Pemesanan Snack Box & Nasi Kebuli", "Pesan 500 kotak makanan berkah", "Belum Mulai", "2026-10-10", pKonsumsi]);

    // 6. Initial Keuangan
    const insertKeuanganSql =
      "INSERT INTO keuangan (id, tipe, tanggal, keterangan, nominal, metode) VALUES (?, ?, ?, ?, ?, ?)";
    await pool.execute(insertKeuanganSql, ["k-1", "masuk", "2026-09-01", "Kas Awal Yayasan", 5000000, "transfer"]);
    await pool.execute(insertKeuanganSql, ["k-2", "masuk", "2026-09-05", "Hamba Allah (Infaq Donatur)", 3500000, "cash"]);
    await pool.execute(insertKeuanganSql, ["k-3", "masuk", "2026-09-10", "Bapak H. Sulaeman (Donasi Pribadi)", 2000000, "transfer"]);
    await pool.execute(insertKeuanganSql, ["k-4", "keluar", "2026-09-12", "DP Sewa Tenda & Sound System", 3000000, "transfer"]);
    await pool.execute(insertKeuanganSql, ["k-5", "keluar", "2026-09-13", "Cetak Banner & Spanduk Acara", 450000, "cash"]);
    await pool.execute(insertKeuanganSql, ["k-6", "keluar", "2026-09-14", "DP Konsumsi Makanan Jamaah", 2500000, "cash"]);
  }

  // 7. Check Tamu
  const [tamuRows] = (await pool.query(
    "SELECT count(*) as count FROM tamu"
  )) as [Array<{ count: number }>, unknown];

  if (Number(tamuRows[0]?.count || 0) === 0) {
    const insertTamuSql =
      "INSERT INTO tamu (id, nama, alamat, status, pengundang, kehadiran, catatan) VALUES (?, ?, ?, ?, ?, ?, ?)";
    await pool.execute(insertTamuSql, ["tm-1", "Habib Umar bin Yahya", "Jakarta Selatan", "VVIP", "Ketua Panitia", "Hadir", "Penceramah Utama Maulid"]);
    await pool.execute(insertTamuSql, ["tm-2", "K.H. Syarif Hidayatullah", "Kecamatan Caringin", "VVIP", "Pelindung", "Hadir", "Pimpinan Ponpes Al-Hikmah"]);
    await pool.execute(insertTamuSql, ["tm-3", "Bapak Camat & Rombongan", "Kantor Kecamatan", "VIP", "Sekretaris", "Hadir", "Undangan Muspika"]);
    await pool.execute(insertTamuSql, ["tm-4", "Ust. Qori Syamsuri", "Tangerang", "VIP", "Seksi Acara", "Hadir", "Qori Internasional"]);
    await pool.execute(insertTamuSql, ["tm-5", "H. Sulaeman", "Jl. Melati No. 12", "VIP", "Bendahara", "Hadir", "Donatur Utama"]);
    await pool.execute(insertTamuSql, ["tm-6", "Jamaah Majelis Ta'lim An-Nur", "Komplek Griya Indah", "Reguler", "Seksi Humas", "Hadir", "Jamaah Pengajian"]);
  }
}
