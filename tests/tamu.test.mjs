import test from "node:test";
import assert from "node:assert/strict";
import { initSchema, seedInitialData } from "../src/lib/db.ts";
import { DatabaseSync } from "node:sqlite";

test("Tamu categories and defaults in DB schema and API validation", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  initSchema(db);

  // Default values when only nama is provided: default VIP dan Hadir
  db.prepare("INSERT INTO tamu (id, nama) VALUES (?, ?)").run("t-1", "Ahmad");
  const row = db.prepare("SELECT * FROM tamu WHERE id = ?").get("t-1");
  assert.equal(row.status, "VIP");
  assert.equal(row.kehadiran, "Hadir");

  // Valid categories: VVIP, VIP, Reguler
  assert.doesNotThrow(() => {
    db.prepare("INSERT INTO tamu (id, nama, status, kehadiran) VALUES (?, ?, ?, ?)").run("t-2", "Budi", "VVIP", "Hadir");
    db.prepare("INSERT INTO tamu (id, nama, status, kehadiran) VALUES (?, ?, ?, ?)").run("t-3", "Cici", "VIP", "Hadir");
    db.prepare("INSERT INTO tamu (id, nama, status, kehadiran) VALUES (?, ?, ?, ?)").run("t-4", "Dodi", "Reguler", "Tidak Hadir");
  });

  // Invalid categories should throw error
  assert.throws(() => {
    db.prepare("INSERT INTO tamu (id, nama, status) VALUES (?, ?, ?)").run("t-5", "Eko", "Penting Banget");
  }, /CHECK constraint failed/);

  assert.throws(() => {
    db.prepare("INSERT INTO tamu (id, nama, status) VALUES (?, ?, ?)").run("t-6", "Fani", "Tokoh Masyarakat");
  }, /CHECK constraint failed/);

  assert.throws(() => {
    db.prepare("INSERT INTO tamu (id, nama, status) VALUES (?, ?, ?)").run("t-7", "Gani", "Biasa");
  }, /CHECK constraint failed/);
});

test("Migration cleans up non-conforming categories and applies constraint", () => {
  const db = new DatabaseSync(":memory:");
  // Create old table schema without constraint
  db.exec(`
    CREATE TABLE tamu (
      id TEXT PRIMARY KEY,
      nama TEXT NOT NULL,
      alamat TEXT,
      status TEXT NOT NULL DEFAULT 'Biasa',
      pengundang TEXT,
      kehadiran TEXT DEFAULT 'Belum Konfirmasi',
      catatan TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  db.prepare("INSERT INTO tamu (id, nama, status) VALUES (?, ?, ?)").run("old-1", "VVIP Guest", "VVIP");
  db.prepare("INSERT INTO tamu (id, nama, status) VALUES (?, ?, ?)").run("old-2", "VIP Guest", "VIP");
  db.prepare("INSERT INTO tamu (id, nama, status) VALUES (?, ?, ?)").run("old-3", "Reguler Guest", "Reguler");
  db.prepare("INSERT INTO tamu (id, nama, status) VALUES (?, ?, ?)").run("old-4", "Penting Guest", "Penting Banget");
  db.prepare("INSERT INTO tamu (id, nama, status) VALUES (?, ?, ?)").run("old-5", "Tokoh Guest", "Tokoh Masyarakat");
  db.prepare("INSERT INTO tamu (id, nama, status) VALUES (?, ?, ?)").run("old-6", "Biasa Guest", "Biasa");

  initSchema(db);

  const remaining = db.prepare("SELECT * FROM tamu").all();
  assert.equal(remaining.length, 3);
  const statuses = remaining.map((r) => r.status).sort();
  assert.deepEqual(statuses, ["Reguler", "VIP", "VVIP"]);
});

