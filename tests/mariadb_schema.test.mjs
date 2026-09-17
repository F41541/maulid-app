import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getPool, getDb, query, queryOne, execute, initSchema, seedInitialData } from "../src/lib/db.ts";

test("MariaDB Schema File & DDL Validation", () => {
  const schemaPath = path.join(process.cwd(), "scripts", "schema.sql");
  assert.ok(fs.existsSync(schemaPath), "scripts/schema.sql harus ada");

  const sql = fs.readFileSync(schemaPath, "utf-8");

  // Pastikan semua 7 tabel utama ada di DDL
  const expectedTables = [
    "admin_users",
    "panitia",
    "seksi",
    "tugas",
    "rundown",
    "keuangan",
    "tamu"
  ];

  for (const table of expectedTables) {
    assert.ok(
      sql.includes(`CREATE TABLE IF NOT EXISTS \`${table}\``),
      `Tabel ${table} harus didefinisikan di schema.sql`
    );
  }

  // Pastikan menggunakan InnoDB dan utf8mb4
  assert.ok(sql.includes("ENGINE=InnoDB"), "Harus menggunakan engine InnoDB");
  assert.ok(sql.includes("utf8mb4"), "Harus menggunakan charset utf8mb4");

  // Pastikan relasi foreign key penting terdefinisi
  assert.ok(sql.includes("fk_seksi_koordinator"), "Foreign key seksi -> panitia harus ada");
  assert.ok(sql.includes("fk_tugas_seksi"), "Foreign key tugas -> seksi harus ada");
  assert.ok(sql.includes("fk_tugas_pj"), "Foreign key tugas -> panitia harus ada");
});

test("MariaDB Driver & Helpers Export Validation", () => {
  assert.equal(typeof getPool, "function");
  assert.equal(typeof getDb, "function");
  assert.equal(typeof query, "function");
  assert.equal(typeof queryOne, "function");
  assert.equal(typeof execute, "function");
  assert.equal(typeof initSchema, "function");
  assert.equal(typeof seedInitialData, "function");
});

test("Schema Script & VPS Deployment Docs Validation", () => {
  const schemaScriptPath = path.join(process.cwd(), "scripts", "schema.sql");
  assert.ok(fs.existsSync(schemaScriptPath), "scripts/schema.sql harus ada");

  const vpsDocPath = path.join(process.cwd(), "docs", "VPS_DEPLOYMENT.md");
  assert.ok(fs.existsSync(vpsDocPath), "docs/VPS_DEPLOYMENT.md harus ada");

  const envExamplePath = path.join(process.cwd(), ".env.example");
  assert.ok(fs.existsSync(envExamplePath), ".env.example harus ada");
});
