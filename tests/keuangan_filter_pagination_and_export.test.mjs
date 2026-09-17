import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

test("1. Keuangan: Date range filter and 20-items pagination in table", () => {
  const keuanganFile = path.join(rootDir, "src/app/keuangan/page.tsx");
  const content = fs.readFileSync(keuanganFile, "utf-8");

  // Filter input date range
  assert.ok(content.includes('aria-label="Filter Dari Tanggal"'), "Must have Dari Tanggal filter input");
  assert.ok(content.includes('aria-label="Filter Sampai Tanggal"'), "Must have Sampai Tanggal filter input");
  assert.ok(content.includes("Reset Tanggal"), "Must have Reset Tanggal button");

  // Items per page 20
  assert.ok(content.includes("const itemsPerPage = 20"), "Must set itemsPerPage = 20");
  assert.ok(content.includes("paginatedTransactions"), "Must compute paginatedTransactions");

  // Pagination navigation controls
  assert.ok(content.includes('aria-label="Halaman Sebelumnya"'), "Must have previous page button");
  assert.ok(content.includes('aria-label="Halaman Selanjutnya"'), "Must have next page button");
  assert.ok(content.includes("Array.from({ length: totalPages }"), "Must render full numbered page buttons");
});

test("2. Keuangan API: GET endpoint supports startDate and endDate query parameters", () => {
  const apiFile = path.join(rootDir, "src/app/api/keuangan/route.ts");
  const content = fs.readFileSync(apiFile, "utf-8");

  assert.ok(content.includes('searchParams.get("startDate")'), "API must read startDate param");
  assert.ok(content.includes('searchParams.get("endDate")'), "API must read endDate param");
  assert.ok(content.includes("tanggal >= ?"), "API SQL must filter startDate");
  assert.ok(content.includes("tanggal <= ?"), "API SQL must filter endDate");
});

test("3. Keuangan: Excel Export (.xlsx via xlsx) fetches from DB and replaces CSV", () => {
  const keuanganFile = path.join(rootDir, "src/app/keuangan/page.tsx");
  const content = fs.readFileSync(keuanganFile, "utf-8");

  assert.ok(!content.includes("exportCSV"), "exportCSV must be eliminated");
  assert.ok(!content.includes("downloadCSV"), "downloadCSV must not be used");
  assert.ok(content.includes("exportExcel"), "exportExcel function must be present");
  assert.ok(content.includes('XLSX.utils.book_append_sheet(wb, ws, "Laporan Kas")'), "Must create XLSX worksheet");
  assert.ok(content.includes('label: "Ekspor Excel (.xlsx)"'), "SpeedDial must feature Ekspor Excel (.xlsx)");

  // Assert export-csv.ts does not exist
  const csvFile = path.join(rootDir, "src/lib/export-csv.ts");
  assert.equal(fs.existsSync(csvFile), false, "export-csv.ts must be deleted");
});

test("4. Filter Bars: Total count indicators removed from all 5 pages", () => {
  const files = [
    "src/app/keuangan/page.tsx",
    "src/app/tamu/page.tsx",
    "src/app/pengguna/page.tsx",
    "src/app/tugas/page.tsx",
    "src/app/struktur/page.tsx",
  ];

  for (const relPath of files) {
    const fullPath = path.join(rootDir, relPath);
    const content = fs.readFileSync(fullPath, "utf-8");
    assert.equal(
      /Total\s+\{[^}]+\}\s+(transaksi|tamu|pengguna|tugas|Anggota)/i.test(content),
      false,
      `File ${relPath} must not contain 'Total {n} ...' in filter bar`
    );
  }
});

test("5. Tamu: Kategori and Kehadiran use dropdown select", () => {
  const tamuFile = path.join(rootDir, "src/app/tamu/page.tsx");
  const content = fs.readFileSync(tamuFile, "utf-8");

  // Kategori filter dropdown
  assert.ok(content.includes('aria-label="Filter Kategori Tamu"'), "Kategori filter must be a select");
  assert.ok(content.includes('<option value="all">Semua Kategori</option>'), "Kategori select must have options");

  // Kehadiran table column dropdown
  assert.ok(content.includes('aria-label={`Ubah status kehadiran untuk ${t.nama}`}'), "Kehadiran in table must be a select");
  assert.ok(!content.includes("<SegmentedControl"), "SegmentedControl must not be used in tamu/page.tsx");
});

test("6. Toast: Positioned at top-right (top-4 right-4) with slide-down animation", () => {
  const toastFile = path.join(rootDir, "src/components/ui/Toast.tsx");
  const content = fs.readFileSync(toastFile, "utf-8");

  assert.ok(content.includes("top-4 right-4"), "Toast container must be placed at top-4 right-4");
  assert.ok(content.includes("animate-kinetic-slide-down"), "Toast must animate slide-down");
  assert.ok(!content.includes("bottom-4 right-4"), "Toast container must not be at bottom-4 right-4");
});

test("7. SQLite Elimination: Pure MariaDB configuration and zero SQLite leftovers", () => {
  const dbFile = path.join(rootDir, "src/lib/db.ts");
  const dbContent = fs.readFileSync(dbFile, "utf-8");
  assert.ok(!dbContent.includes("initSqliteSchema"), "db.ts must not have initSqliteSchema");
  assert.ok(!dbContent.includes("seedSqliteData"), "db.ts must not have seedSqliteData");

  const nextConfigFile = path.join(rootDir, "next.config.ts");
  const nextConfigContent = fs.readFileSync(nextConfigFile, "utf-8");
  assert.ok(!nextConfigContent.includes("node:sqlite"), "next.config.ts must not include node:sqlite");

  const sqliteDts = path.join(rootDir, "src/types/sqlite.d.ts");
  assert.equal(fs.existsSync(sqliteDts), false, "sqlite.d.ts must be deleted");

  const migrateScript = path.join(rootDir, "scripts/migrate-sqlite-to-mysql.mjs");
  assert.equal(fs.existsSync(migrateScript), false, "migrate-sqlite-to-mysql.mjs must be deleted");
});
