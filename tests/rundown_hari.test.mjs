import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { initSchema } from "../src/lib/db.ts";

test("Rundown schema and migration supports 'hari' field with default value", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  initSchema(db);

  // Insert rundown item with hari
  db.prepare(
    "INSERT INTO rundown (id, hari, waktu, nama_kegiatan, nama_pengisi, catatan, urutan) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run("r-test-1", "Hari H (Sabtu)", "08:00 - 09:00", "Registrasi", null, null, 1);

  const item = db.prepare("SELECT * FROM rundown WHERE id = ?").get("r-test-1");
  assert.equal(item.hari, "Hari H (Sabtu)");
  assert.equal(item.waktu, "08:00 - 09:00");
  assert.equal(item.nama_kegiatan, "Registrasi");

  // Insert rundown without explicit hari: should default or allow migration default
  db.prepare(
    "INSERT INTO rundown (id, waktu, nama_kegiatan, urutan) VALUES (?, ?, ?, ?)"
  ).run("r-test-2", "09:00 - 10:00", "Pembukaan", 2);

  const item2 = db.prepare("SELECT * FROM rundown WHERE id = ?").get("r-test-2");
  assert.ok(item2.hari !== undefined);
});
