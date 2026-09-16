import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";

test("Database Schema & Seed Flow", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");

  db.exec(`
    CREATE TABLE admin_users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nama TEXT NOT NULL,
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
      kategori TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert Panitia
  db.prepare("INSERT INTO panitia (id, nama, jabatan) VALUES (?, ?, ?)").run("p-1", "Ahmad", "Ketua Panitia");
  db.prepare("INSERT INTO panitia (id, nama, jabatan) VALUES (?, ?, ?)").run("p-2", "Budi", "Koordinator Seksi");

  // Insert Seksi (koordinator ref valid)
  db.prepare("INSERT INTO seksi (id, nama_seksi, koordinator_id) VALUES (?, ?, ?)").run("s-1", "Seksi Acara", "p-2");

  // Foreign key restriction test
  assert.throws(() => {
    db.prepare("INSERT INTO seksi (id, nama_seksi, koordinator_id) VALUES (?, ?, ?)").run("s-2", "Seksi Invalid", "p-999");
  }, /FOREIGN KEY constraint failed/);

  // Keuangan calculate
  db.prepare("INSERT INTO keuangan (id, tipe, tanggal, keterangan, nominal) VALUES (?, ?, ?, ?, ?)").run("k-1", "masuk", "2026-09-01", "Infaq", 1000000);
  db.prepare("INSERT INTO keuangan (id, tipe, tanggal, keterangan, nominal) VALUES (?, ?, ?, ?, ?)").run("k-2", "keluar", "2026-09-02", "Beli Banner", 200000);

  const masuk = db.prepare("SELECT COALESCE(SUM(nominal), 0) as total FROM keuangan WHERE tipe = 'masuk'").get().total;
  const keluar = db.prepare("SELECT COALESCE(SUM(nominal), 0) as total FROM keuangan WHERE tipe = 'keluar'").get().total;
  assert.equal(masuk, 1000000);
  assert.equal(keluar, 200000);
  assert.equal(masuk - keluar, 800000);
});
