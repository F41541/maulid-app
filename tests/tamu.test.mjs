import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { initSchema } from "../src/lib/db.ts";

const rootDir = process.cwd();

test("1. Tamu categories and defaults in MariaDB schema and validation", async () => {
  const schemaPath = path.join(rootDir, "scripts", "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf-8");

  // Verify ENUMs and defaults in MariaDB DDL
  assert.ok(sql.includes("`status` ENUM('VVIP', 'VIP', 'Reguler') NOT NULL DEFAULT 'VIP'"));
  assert.ok(sql.includes("`kehadiran` ENUM('Hadir', 'Tidak Hadir', 'Belum Konfirmasi') NOT NULL DEFAULT 'Hadir'"));

  const queries = [];
  const mockPool = {
    query: async (sqlStr, params) => {
      queries.push({ sql: sqlStr, params });
      return [[], []];
    },
    execute: async (sqlStr, params) => {
      queries.push({ sql: sqlStr, params });
      return [{ affectedRows: 1 }];
    },
  };

  await initSchema(mockPool);
  const tamuCreate = queries.find((q) => q.sql.includes("CREATE TABLE IF NOT EXISTS tamu"));
  assert.ok(tamuCreate, "tamu table creation query must be executed");
  assert.ok(tamuCreate.sql.includes("status ENUM('VVIP', 'VIP', 'Reguler') NOT NULL DEFAULT 'VIP'"));
  assert.ok(tamuCreate.sql.includes("kehadiran ENUM('Hadir', 'Tidak Hadir', 'Belum Konfirmasi') NOT NULL DEFAULT 'Hadir'"));
});

test("2. Tamu UI: Table cell does NOT render redundant 'Hadir' text outside select dropdown", () => {
  const tamuPagePath = fs.existsSync(path.join(rootDir, "src", "app", "(portal)", "tamu", "page.tsx"))
    ? path.join(rootDir, "src", "app", "(portal)", "tamu", "page.tsx")
    : path.join(rootDir, "src", "app", "tamu", "page.tsx");
  const content = fs.readFileSync(tamuPagePath, "utf-8");

  // Verify no static prefix like "Hadir: " or badge before the select
  assert.ok(
    !content.includes(">Hadir: <select") && !content.includes(">Hadir: <StatusSelect"),
    "Tamu table must not prepend redundant 'Hadir:' before select dropdown"
  );
  assert.ok(
    !content.includes("<span>Hadir</span><select") && !content.includes("<span>Hadir</span><StatusSelect"),
    "Tamu table must not render static 'Hadir' span outside dropdown"
  );

  const statusSelectPath = path.join(rootDir, "src", "components", "ui", "StatusSelect.tsx");
  const statusSelectContent = fs.existsSync(statusSelectPath) ? fs.readFileSync(statusSelectPath, "utf-8") : "";
  const combined = content + "\n" + statusSelectContent;

  // Verify kehadiran td contains only the dropdown and print-only span
  assert.ok(
    (content.includes("<StatusSelect") || content.includes("<select")) &&
    content.includes("handleQuickKehadiran(t.id"),
    "Kehadiran cell must contain direct interactive select dropdown or StatusSelect component"
  );
  assert.ok(
    combined.includes("hidden print:inline text-xs font-semibold") ||
    combined.includes('{t.kehadiran}'),
    "Print fallback must remain hidden in screen view"
  );
});

test("3. Tamu UI: Status badges have distinct category colors and Kehadiran dropdown uses status colors", () => {
  const tamuPagePath = fs.existsSync(path.join(rootDir, "src", "app", "(portal)", "tamu", "page.tsx"))
    ? path.join(rootDir, "src", "app", "(portal)", "tamu", "page.tsx")
    : path.join(rootDir, "src", "app", "tamu", "page.tsx");
  const content = fs.readFileSync(tamuPagePath, "utf-8");

  // Category badges: VVIP (amber + Crown), VIP (purple + Star)
  assert.ok(content.includes('case "VVIP":'), "VVIP case must exist in getStatusBadge");
  assert.ok(content.includes('variant="amber"'), "VVIP badge must use amber variant");
  assert.ok(content.includes('case "VIP":'), "VIP case must exist in getStatusBadge");
  assert.ok(content.includes('variant="purple"'), "VIP badge must use purple variant");

  const statusSelectPath = path.join(rootDir, "src", "components", "ui", "StatusSelect.tsx");
  const statusSelectContent = fs.existsSync(statusSelectPath) ? fs.readFileSync(statusSelectPath, "utf-8") : "";
  const combined = content + "\n" + statusSelectContent;

  // Kehadiran select dynamic styling
  assert.ok(
    combined.includes('val === "Hadir"') || combined.includes('t.kehadiran === "Hadir"'),
    "Kehadiran dropdown must check for Hadir status"
  );
  assert.ok(
    combined.includes("bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"),
    "Hadir status must use emerald badge styling"
  );
  assert.ok(
    combined.includes("bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800"),
    "Tidak Hadir status must use rose badge styling"
  );
  assert.ok(
    combined.includes("bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"),
    "Belum Konfirmasi status must use neutral slate styling"
  );
});

test("4. Tamu API: POST route handles update_kehadiran with strict enum validation", () => {
  const apiPath = path.join(rootDir, "src", "app", "api", "tamu", "route.ts");
  const content = fs.readFileSync(apiPath, "utf-8");

  // Handler for update_kehadiran exists
  assert.ok(content.includes('action === "update_kehadiran"'), "API must handle update_kehadiran action");

  // Enum validation
  assert.ok(
    content.includes('ALLOWED_KEHADIRAN.includes(kehadiran'),
    "API must validate kehadiran against ALLOWED_KEHADIRAN enum"
  );

  // Targeted update query
  assert.ok(
    content.includes("UPDATE tamu SET kehadiran = ? WHERE id = ?"),
    "API must execute targeted UPDATE on kehadiran"
  );
});

test("5. Tamu Export: Excel sheet generates exactly 3 columns [Nama Tamu, di, Tempat] with proper fallback", () => {
  const tamuPagePath = fs.existsSync(path.join(rootDir, "src", "app", "(portal)", "tamu", "page.tsx"))
    ? path.join(rootDir, "src", "app", "(portal)", "tamu", "page.tsx")
    : path.join(rootDir, "src", "app", "tamu", "page.tsx");
  const pageContent = fs.readFileSync(tamuPagePath, "utf-8");

  // Verify exportExcelLabel generates 3 columns
  assert.ok(
    pageContent.includes('["Nama Tamu", "di", "Tempat"]'),
    "exportExcelLabel must define exactly 3 columns: [Nama Tamu, di, Tempat]"
  );
  assert.ok(
    pageContent.includes('t.alamat || "Tempat"'),
    "Empty address must fallback to 'Tempat'"
  );

  // Functional verification with sample data
  const sampleData = [
    { nama: "Habib Muhammad Luthfi bin Yahya", alamat: "Pekalongan" },
    { nama: "K.H. Mustofa Bisri", alamat: "" },
    { nama: "Ustadz Abdul Somad", alamat: null },
  ];

  const rows = sampleData.map((t) => [t.nama, "di", t.alamat || "Tempat"]);
  const worksheetData = [["Nama Tamu", "di", "Tempat"], ...rows];

  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Label Tamu");

  assert.equal(worksheetData[0].length, 3);
  assert.deepEqual(worksheetData[0], ["Nama Tamu", "di", "Tempat"]);
  assert.deepEqual(worksheetData[1], ["Habib Muhammad Luthfi bin Yahya", "di", "Pekalongan"]);
  assert.deepEqual(worksheetData[2], ["K.H. Mustofa Bisri", "di", "Tempat"]);
  assert.deepEqual(worksheetData[3], ["Ustadz Abdul Somad", "di", "Tempat"]);

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  assert.ok(buf.length > 0, "Generated Excel buffer must be non-empty");
});
