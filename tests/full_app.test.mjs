import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";

function setupInMemoryDb() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");

  db.exec(`
    CREATE TABLE admin_users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nama TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE panitia (
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

    CREATE TABLE seksi (
      id TEXT PRIMARY KEY,
      nama_seksi TEXT NOT NULL,
      koordinator_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (koordinator_id) REFERENCES panitia(id) ON DELETE RESTRICT
    );

    CREATE TABLE tugas (
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

    CREATE TABLE rundown (
      id TEXT PRIMARY KEY,
      hari TEXT NOT NULL DEFAULT 'Hari H',
      waktu TEXT NOT NULL,
      nama_kegiatan TEXT NOT NULL,
      nama_pengisi TEXT,
      catatan TEXT,
      urutan INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE keuangan (
      id TEXT PRIMARY KEY,
      tipe TEXT NOT NULL CHECK(tipe IN ('masuk', 'keluar')),
      tanggal TEXT NOT NULL,
      keterangan TEXT NOT NULL,
      nominal INTEGER NOT NULL CHECK(nominal >= 0),
      metode TEXT NOT NULL DEFAULT 'cash' CHECK(metode IN ('cash', 'transfer')),
      kategori TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE tamu (
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
  return db;
}

test("1. Struktur Organisasi & Seksi Validation", () => {
  const db = setupInMemoryDb();

  db.prepare("INSERT INTO panitia (id, nama, jabatan) VALUES (?, ?, ?)").run("p-1", "Ahmad", "Ketua Panitia");
  db.prepare("INSERT INTO panitia (id, nama, jabatan) VALUES (?, ?, ?)").run("p-2", "Budi", "Koordinator Seksi");

  db.prepare("INSERT INTO seksi (id, nama_seksi, koordinator_id) VALUES (?, ?, ?)").run("s-1", "Seksi Acara", "p-2");

  const seksi = db.prepare("SELECT * FROM seksi WHERE id = ?").get("s-1");
  assert.equal(seksi.nama_seksi, "Seksi Acara");
  assert.equal(seksi.koordinator_id, "p-2");

  assert.throws(() => {
    db.prepare("DELETE FROM panitia WHERE id = ?").run("p-2");
  }, /FOREIGN KEY constraint failed/);
});

test("2. Rundown Acara Reordering", () => {
  const db = setupInMemoryDb();

  db.prepare("INSERT INTO rundown (id, waktu, nama_kegiatan, urutan) VALUES (?, ?, ?, ?)").run("r-1", "19:00", "Pembukaan", 1);
  db.prepare("INSERT INTO rundown (id, waktu, nama_kegiatan, urutan) VALUES (?, ?, ?, ?)").run("r-2", "19:30", "Sholawat", 2);
  db.prepare("INSERT INTO rundown (id, waktu, nama_kegiatan, urutan) VALUES (?, ?, ?, ?)").run("r-3", "20:15", "Tausiyah", 3);

  const reorderStmt = db.prepare("UPDATE rundown SET urutan = ? WHERE id = ?");
  reorderStmt.run(2, "r-1");
  reorderStmt.run(1, "r-2");

  const items = db.prepare("SELECT * FROM rundown ORDER BY urutan ASC").all();
  assert.equal(items[0].id, "r-2");
  assert.equal(items[1].id, "r-1");
  assert.equal(items[2].id, "r-3");
});

test("3. Tugas per Seksi & Progress Calculation", () => {
  const db = setupInMemoryDb();

  db.prepare("INSERT INTO panitia (id, nama, jabatan) VALUES (?, ?, ?)").run("p-1", "Ahmad", "Koordinator");
  db.prepare("INSERT INTO seksi (id, nama_seksi, koordinator_id) VALUES (?, ?, ?)").run("s-1", "Seksi Konsumsi", "p-1");

  db.prepare("INSERT INTO tugas (id, seksi_id, nama_tugas, status) VALUES (?, ?, ?, ?)").run("t-1", "s-1", "Beli Beras", "Selesai");
  db.prepare("INSERT INTO tugas (id, seksi_id, nama_tugas, status) VALUES (?, ?, ?, ?)").run("t-2", "s-1", "Pesan Kotak Makan", "Proses");
  db.prepare("INSERT INTO tugas (id, seksi_id, nama_tugas, status) VALUES (?, ?, ?, ?)").run("t-3", "s-1", "Distribusi", "Belum Mulai");

  const stat = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'Selesai' THEN 1 ELSE 0 END) as selesai
    FROM tugas WHERE seksi_id = 's-1'
  `).get();

  assert.equal(stat.total, 3);
  assert.equal(stat.selesai, 1);
  const percentage = Math.round((stat.selesai / stat.total) * 100);
  assert.equal(percentage, 33);
});

test("4. Multi-Kanal Kas (Dompet Cash vs Rekening Bank) & Total Saldo", () => {
  const db = setupInMemoryDb();

  // Infaq Tunai (Cash ke dompet)
  db.prepare("INSERT INTO keuangan (id, tipe, tanggal, keterangan, nominal, metode) VALUES (?, ?, ?, ?, ?, ?)").run(
    "k-1", "masuk", "2026-09-01", "Infaq Kotak Amal Jamaah", 1500000, "cash"
  );

  // Donasi Transfer (Rekening Bank)
  db.prepare("INSERT INTO keuangan (id, tipe, tanggal, keterangan, nominal, metode) VALUES (?, ?, ?, ?, ?, ?)").run(
    "k-2", "masuk", "2026-09-02", "Transfer Donatur H. Sulaeman", 5000000, "transfer"
  );

  // Pengeluaran Cash (Beli bahan)
  db.prepare("INSERT INTO keuangan (id, tipe, tanggal, keterangan, nominal, metode) VALUES (?, ?, ?, ?, ?, ?)").run(
    "k-3", "keluar", "2026-09-03", "Beli Spanduk & Konsumsi Ringan", 400000, "cash"
  );

  // Pengeluaran Transfer (DP Tenda)
  db.prepare("INSERT INTO keuangan (id, tipe, tanggal, keterangan, nominal, metode) VALUES (?, ?, ?, ?, ?, ?)").run(
    "k-4", "keluar", "2026-09-04", "Transfer DP Sewa Tenda", 2000000, "transfer"
  );

  const cashMasuk = db.prepare("SELECT COALESCE(SUM(nominal),0) as t FROM keuangan WHERE tipe='masuk' AND metode='cash'").get().t;
  const cashKeluar = db.prepare("SELECT COALESCE(SUM(nominal),0) as t FROM keuangan WHERE tipe='keluar' AND metode='cash'").get().t;
  const saldoCash = cashMasuk - cashKeluar;

  const tfMasuk = db.prepare("SELECT COALESCE(SUM(nominal),0) as t FROM keuangan WHERE tipe='masuk' AND metode='transfer'").get().t;
  const tfKeluar = db.prepare("SELECT COALESCE(SUM(nominal),0) as t FROM keuangan WHERE tipe='keluar' AND metode='transfer'").get().t;
  const saldoTransfer = tfMasuk - tfKeluar;

  const saldoTotal = saldoCash + saldoTransfer;

  assert.equal(saldoCash, 1100000);
  assert.equal(saldoTransfer, 3000000);
  assert.equal(saldoTotal, 4100000);

  // 4b. Mutasi Kas: Tarik Tunai dari Rekening ke Dompet Cash sebesar 1.000.000
  db.prepare("INSERT INTO keuangan (id, tipe, tanggal, keterangan, nominal, metode, kategori) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    "m-1", "keluar", "2026-09-05", "Mutasi ke Dompet Cash", 1000000, "transfer", "mutasi_internal"
  );
  db.prepare("INSERT INTO keuangan (id, tipe, tanggal, keterangan, nominal, metode, kategori) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    "m-2", "masuk", "2026-09-05", "Mutasi dari Rekening Bank", 1000000, "cash", "mutasi_internal"
  );

  const newCashMasuk = db.prepare("SELECT COALESCE(SUM(nominal),0) as t FROM keuangan WHERE tipe='masuk' AND metode='cash'").get().t;
  const newCashKeluar = db.prepare("SELECT COALESCE(SUM(nominal),0) as t FROM keuangan WHERE tipe='keluar' AND metode='cash'").get().t;
  const newSaldoCash = newCashMasuk - newCashKeluar;

  const newTfMasuk = db.prepare("SELECT COALESCE(SUM(nominal),0) as t FROM keuangan WHERE tipe='masuk' AND metode='transfer'").get().t;
  const newTfKeluar = db.prepare("SELECT COALESCE(SUM(nominal),0) as t FROM keuangan WHERE tipe='keluar' AND metode='transfer'").get().t;
  const newSaldoTransfer = newTfMasuk - newTfKeluar;

  const newSaldoTotal = newSaldoCash + newSaldoTransfer;

  assert.equal(newSaldoCash, 2100000); // Bertambah 1.000.000
  assert.equal(newSaldoTransfer, 2000000); // Berkurang 1.000.000
  assert.equal(newSaldoTotal, 4100000); // Grand total tetap sama
});

test("5. Manajemen Tamu Undangan (Hanya VVIP, VIP, Reguler; Default VIP & Hadir)", () => {
  const db = setupInMemoryDb();

  // Test default status = 'VIP' dan default kehadiran = 'Hadir'
  db.prepare("INSERT INTO tamu (id, nama) VALUES (?, ?)").run("tm-default", "Tamu Default");
  const def = db.prepare("SELECT * FROM tamu WHERE id = ?").get("tm-default");
  assert.equal(def.status, "VIP");
  assert.equal(def.kehadiran, "Hadir");

  db.prepare("INSERT INTO tamu (id, nama, alamat, status, pengundang, kehadiran) VALUES (?, ?, ?, ?, ?, ?)").run(
    "tm-1", "Habib Umar bin Yahya", "Jakarta Selatan", "VVIP", "Ketua Panitia", "Hadir"
  );
  db.prepare("INSERT INTO tamu (id, nama, alamat, status, pengundang, kehadiran) VALUES (?, ?, ?, ?, ?, ?)").run(
    "tm-2", "Bapak Camat", "Kantor Kecamatan", "VIP", "Sekretaris", "Hadir"
  );
  db.prepare("INSERT INTO tamu (id, nama, alamat, status, pengundang, kehadiran) VALUES (?, ?, ?, ?, ?, ?)").run(
    "tm-3", "Warga RT 02", "Kampung Baru", "Reguler", "Seksi Humas", "Belum Konfirmasi"
  );

  // Status di luar VVIP, VIP, Reguler harus gagal
  assert.throws(() => {
    db.prepare("INSERT INTO tamu (id, nama, status) VALUES (?, ?, ?)").run("tm-fail-1", "Invalid 1", "Penting Banget");
  }, /CHECK constraint failed/);

  assert.throws(() => {
    db.prepare("INSERT INTO tamu (id, nama, status) VALUES (?, ?, ?)").run("tm-fail-2", "Invalid 2", "Tokoh Masyarakat");
  }, /CHECK constraint failed/);

  assert.throws(() => {
    db.prepare("INSERT INTO tamu (id, nama, status) VALUES (?, ?, ?)").run("tm-fail-3", "Invalid 3", "Biasa");
  }, /CHECK constraint failed/);

  const total = db.prepare("SELECT COUNT(*) as c FROM tamu").get().c;
  assert.equal(total, 4);

  const vvip = db.prepare("SELECT * FROM tamu WHERE status = 'VVIP'").all();
  assert.equal(vvip.length, 1);
  assert.equal(vvip[0].nama, "Habib Umar bin Yahya");

  // Update kehadiran
  db.prepare("UPDATE tamu SET kehadiran = 'Hadir' WHERE id = 'tm-3'").run();
  const hadirCount = db.prepare("SELECT COUNT(*) as c FROM tamu WHERE kehadiran = 'Hadir'").get().c;
  assert.equal(hadirCount, 4);
});

test("6. Autentikasi Pengelola Aplikasi (admin@example.com / password)", () => {
  const db = setupInMemoryDb();

  db.prepare("INSERT INTO admin_users (id, username, password, nama, role) VALUES (?, ?, ?, ?, ?)").run(
    "admin-2", "admin@example.com", "password", "Pengelola Aplikasi", "admin"
  );

  const user = db.prepare("SELECT * FROM admin_users WHERE username = ?").get("admin@example.com");
  assert.ok(user);
  assert.equal(user.username, "admin@example.com");
  assert.equal(user.password, "password");
  assert.equal(user.role, "admin");
});
