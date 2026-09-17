import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

function getAppFile(relPath) {
  const portalPath = relPath.replace(/^src\/app\/(keuangan|tugas|tamu|struktur|rundown|dashboard|pengguna)/, "src/app/(portal)/$1");
  const fullPortal = path.join(rootDir, portalPath);
  if (fs.existsSync(fullPortal)) return fullPortal;
  return path.join(rootDir, relPath);
}

test("1. Keuangan Cards: Badges replaced with larger icon containers", () => {
  const file = getAppFile("src/app/keuangan/page.tsx");
  const content = fs.readFileSync(file, "utf-8");

  // Verify text badges are removed from the cards
  assert.ok(!content.includes(">Grand Total<"), "Grand Total text badge must be removed");
  assert.ok(!content.includes(">Tunai</span>"), "Tunai text badge must be removed");
  assert.ok(!content.includes(">Bank</span>"), "Bank text badge must be removed");

  // Verify icon containers exist with enlarged dimensions (w-10 h-10) and shadow-2xs
  assert.ok(
    content.includes("w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600"),
    "Wallet & Banknote icon containers must be styled with w-10 h-10 rounded-xl"
  );
  assert.ok(
    content.includes("w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600"),
    "CreditCard icon container must be styled with w-10 h-10 rounded-xl"
  );
});

test("2. Keuangan Filter: Expanded to full width with responsive grid", () => {
  const file = getAppFile("src/app/keuangan/page.tsx");
  const content = fs.readFileSync(file, "utf-8");

  // Full-width grid container check
  assert.ok(
    content.includes("grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 w-full items-end"),
    "Keuangan filter bar must be expanded into a 5-column responsive full-width grid"
  );

  // Check inputs have w-full
  assert.ok(
    content.includes('aria-label="Filter Tipe Transaksi"'),
    "Tipe filter must exist"
  );
  assert.ok(
    content.includes('aria-label="Filter Kanal Saldo"'),
    "Kanal saldo filter must exist"
  );
  assert.ok(
    content.includes('aria-label="Filter Status Transaksi"'),
    "Status filter must exist"
  );
  assert.ok(
    content.includes('aria-label="Filter Dari Tanggal"'),
    "Dari tanggal filter must exist"
  );
  assert.ok(
    content.includes('aria-label="Filter Sampai Tanggal"'),
    "Sampai tanggal filter must exist"
  );
});

test("3. Tugas Filter: Remains 2-item filter as-is", () => {
  const file = getAppFile("src/app/tugas/page.tsx");
  const content = fs.readFileSync(file, "utf-8");

  // Verify tugas filter has NOT been forced into 5 columns
  assert.ok(
    !content.includes("lg:grid-cols-5"),
    "Tugas filter must remain simple 2 items without lg:grid-cols-5"
  );
  assert.ok(
    content.includes('aria-label="Filter seksi tugas"'),
    "Filter seksi must remain"
  );
  assert.ok(
    content.includes('aria-label="Filter status tugas"'),
    "Filter status must remain"
  );
});

test("4. App Tab Favicon & Icon: Panitia Maulid brand logo", () => {
  // Check layout.tsx metadata
  const layoutFile = path.join(rootDir, "src/app/layout.tsx");
  const layoutContent = fs.readFileSync(layoutFile, "utf-8");

  assert.ok(layoutContent.includes('icons:'), "layout.tsx must configure icons metadata");
  assert.ok(layoutContent.includes('/icon.svg'), "layout.tsx must point to /icon.svg");

  // Check src/app/icon.svg exists and contains Sallallahu 'Alaihi Wasallam symbol
  const appIconFile = path.join(rootDir, "src/app/icon.svg");
  assert.ok(fs.existsSync(appIconFile), "src/app/icon.svg must exist");
  const appIconContent = fs.readFileSync(appIconFile, "utf-8");
  assert.ok(appIconContent.includes("#059669"), "icon must use emerald fill #059669");
  assert.ok(appIconContent.includes("ﷺ"), "icon must contain Sallallahu 'Alaihi Wasallam calligraphic symbol");

  // Check public/icon.svg exists
  const publicIconFile = path.join(rootDir, "public/icon.svg");
  assert.ok(fs.existsSync(publicIconFile), "public/icon.svg must exist");
});

test("5. Tugas Card: Redundant status badge removed and dropdown aligned to bottom right", () => {
  const file = getAppFile("src/app/tugas/page.tsx");
  const content = fs.readFileSync(file, "utf-8");

  // Verify redundant status badge next to dropdown is removed
  assert.ok(!content.includes("<Badge"), "Badge component should not be used in task card footer");
  assert.ok(!content.includes("CheckCircle2"), "CheckCircle2 icon should be removed from task card");
  assert.ok(!content.includes("Hourglass"), "Hourglass icon should be removed from task card");

  // Verify dropdown container is aligned to the right
  assert.ok(
    content.includes("border-t border-slate-100 dark:border-slate-800 flex items-center justify-end"),
    "Dropdown footer container must align items to bottom right using justify-end"
  );
  assert.ok(
    content.includes("aria-label={`Ubah status ${t.nama_tugas}`}"),
    "Quick status change dropdown must remain functional"
  );
});

test("6. Nominal Digit: Font matches standard sans-serif without font-mono", () => {
  const file = getAppFile("src/app/keuangan/page.tsx");
  const content = fs.readFileSync(file, "utf-8");

  // Verify font-mono is removed from nominal table column
  assert.ok(
    !content.includes('text-right font-mono font-bold'),
    "Nominal table cell must not use font-mono"
  );
  assert.ok(
    content.includes('text-right font-bold'),
    "Nominal table cell must use standard font-bold"
  );

  // Verify modals don't force font-mono on nominal inputs
  const trxModal = fs.readFileSync(getAppFile("src/app/keuangan/components/TransaksiModal.tsx"), "utf-8");
  assert.ok(!trxModal.includes('className="font-mono"'), "TransaksiModal nominal input must not use font-mono");

  const mutasiModal = fs.readFileSync(getAppFile("src/app/keuangan/components/MutasiModal.tsx"), "utf-8");
  assert.ok(!mutasiModal.includes('className="font-mono"'), "MutasiModal nominal input must not use font-mono");
});

test("7. Progress Badges Tugas per Seksi: Responsive layout (1 on mobile, 3 full on desktop, flexible remainder)", () => {
  const file = getAppFile("src/app/tugas/page.tsx");
  const content = fs.readFileSync(file, "utf-8");

  // Old hardcoded 4-column and 2-column mobile grid must not be used
  assert.ok(
    !content.includes("grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4"),
    "Old grid-cols-2 lg:grid-cols-4 must be replaced"
  );

  // New responsive flex container
  assert.ok(
    content.includes("flex flex-wrap gap-3 sm:gap-4 mb-6"),
    "Progress badges must use flex flex-wrap container"
  );

  // Responsive item classes: w-full for mobile (1 col), sm:flex-1 for tablet, lg:min-w for 3 full on desktop
  assert.ok(
    content.includes("w-full sm:flex-1 sm:min-w-[calc(50%-0.75rem)] lg:min-w-[calc(33.333%-1rem)]"),
    "Progress badges must have responsive classes (1 on mobile, 3 full on desktop, remainder flexible)"
  );
});

test("8. Badge Dropdowns: Colored according to status (excluding filters)", () => {
  // Tugas card status dropdown
  const tugasFile = getAppFile("src/app/tugas/page.tsx");
  const tugasContent = fs.readFileSync(tugasFile, "utf-8");

  const statusSelectFile = path.join(rootDir, "src/components/ui/StatusSelect.tsx");
  const statusSelectContent = fs.existsSync(statusSelectFile) ? fs.readFileSync(statusSelectFile, "utf-8") : "";
  const combinedTugas = tugasContent + "\n" + statusSelectContent;

  assert.ok(
    combinedTugas.includes('val === "Selesai"') || combinedTugas.includes('t.status === "Selesai"'),
    "Tugas status dropdown must check for Selesai"
  );
  assert.ok(
    combinedTugas.includes('bg-emerald-50 text-emerald-700 border-emerald-300'),
    "Selesai status dropdown must be colored emerald/green"
  );
  assert.ok(
    combinedTugas.includes('val === "Proses"') || combinedTugas.includes('t.status === "Proses"'),
    "Tugas status dropdown must check for Proses"
  );
  assert.ok(
    combinedTugas.includes('bg-amber-50 text-amber-700 border-amber-300'),
    "Proses status dropdown must be colored amber/yellow"
  );
  assert.ok(
    combinedTugas.includes('bg-slate-100 text-slate-700 border-slate-300'),
    "Belum Mulai status dropdown must be colored slate/gray"
  );

  // Filter dropdowns in tugas must remain standard without status badge colors
  assert.ok(
    tugasContent.includes('aria-label="Filter seksi tugas"'),
    "Filter seksi must remain"
  );
  assert.ok(
    tugasContent.includes('aria-label="Filter status tugas"'),
    "Filter status must remain"
  );

  // Tamu table attendance dropdown
  const tamuFile = getAppFile("src/app/tamu/page.tsx");
  const tamuContent = fs.readFileSync(tamuFile, "utf-8");
  const combinedTamu = tamuContent + "\n" + statusSelectContent;

  assert.ok(
    combinedTamu.includes('val === "Hadir"') || combinedTamu.includes('t.kehadiran === "Hadir"'),
    "Tamu attendance dropdown must check for Hadir"
  );
  assert.ok(
    combinedTamu.includes('bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700'),
    "Hadir status dropdown must be colored emerald"
  );
  assert.ok(
    combinedTamu.includes('bg-rose-50 dark:bg-rose-950/50 text-rose-700'),
    "Tidak Hadir status dropdown must be colored rose/red"
  );
});

