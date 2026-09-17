import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");

function getAppFile(relPath) {
  const portalPath = relPath.replace(/^src\/app\/(dashboard|struktur|keuangan|rundown|tugas|tamu|pengguna)/, "src/app/(portal)/$1");
  const fullPortal = path.join(rootDir, portalPath);
  if (fs.existsSync(fullPortal)) return fullPortal;
  return path.join(rootDir, relPath);
}

test("1. Dashboard - Hapus Tugas Mendesak & Berjalan dan Pratinjau Susunan Acara", () => {
  const dashboardContent = fs.readFileSync(
    getAppFile("src/app/dashboard/page.tsx"),
    "utf-8"
  );
  assert.equal(
    dashboardContent.includes("Tugas Mendesak & Berjalan"),
    false,
    "Dashboard should not contain 'Tugas Mendesak & Berjalan'"
  );
  assert.equal(
    dashboardContent.includes("Pratinjau Susunan Acara"),
    false,
    "Dashboard should not contain 'Pratinjau Susunan Acara'"
  );
});

test("2. Dashboard - Urutan StatCard: Anggota, Total Saldo, Kesiapan Tugas, Tamu Undangan", () => {
  const dashboardContent = fs.readFileSync(
    getAppFile("src/app/dashboard/page.tsx"),
    "utf-8"
  );

  const idxAnggota = dashboardContent.indexOf('title="Anggota Panitia"');
  const idxSaldo = dashboardContent.indexOf('title="Total Saldo Kas"');
  const idxTugas = dashboardContent.indexOf('title="Kesiapan Tugas Seksi"');
  const idxTamu = dashboardContent.indexOf('title="Tamu Undangan"');

  assert.ok(idxAnggota !== -1, "Must have Anggota Panitia card");
  assert.ok(idxSaldo !== -1, "Must have Total Saldo Kas card");
  assert.ok(idxTugas !== -1, "Must have Kesiapan Tugas Seksi card");
  assert.ok(idxTamu !== -1, "Must have Tamu Undangan card");

  assert.ok(
    idxAnggota < idxSaldo,
    "Anggota Panitia must come before Total Saldo Kas"
  );
  assert.ok(
    idxSaldo < idxTugas,
    "Total Saldo Kas must come before Kesiapan Tugas Seksi"
  );
  assert.ok(
    idxTugas < idxTamu,
    "Kesiapan Tugas Seksi must come before Tamu Undangan"
  );
});

test("3. Hapus PageHeader title & description di seluruh halaman portal", () => {
  const portalPages = [
    "src/app/struktur/page.tsx",
    "src/app/keuangan/page.tsx",
    "src/app/rundown/page.tsx",
    "src/app/tugas/page.tsx",
    "src/app/tamu/page.tsx",
    "src/app/pengguna/page.tsx",
  ];

  for (const file of portalPages) {
    const content = fs.readFileSync(getAppFile(file), "utf-8");
    assert.equal(
      content.includes("<PageHeader"),
      false,
      `File ${file} should no longer contain <PageHeader`
    );
  }
});

test("4. Struktur - Switch modern untuk Bagan Visual / Tabel & SpeedDialActions", () => {
  const strukturContent = fs.readFileSync(
    getAppFile("src/app/struktur/page.tsx"),
    "utf-8"
  );

  // Verifikasi switch modern
  assert.ok(
    strukturContent.includes("Bagan Visual"),
    "Must have Bagan Visual switch option"
  );
  assert.ok(
    strukturContent.includes("Tabel / Daftar"),
    "Must have Tabel / Daftar switch option"
  );
  assert.ok(
    strukturContent.includes("SpeedDialActions"),
    "Must integrate SpeedDialActions"
  );
  assert.ok(
    strukturContent.includes("Cetak / PDF"),
    "Must include Cetak / PDF action"
  );
  assert.ok(
    strukturContent.includes("Seksi Baru"),
    "Must include Seksi Baru action"
  );
  assert.ok(
    strukturContent.includes("Tambah Anggota"),
    "Must include Tambah Anggota action"
  );
});

test("5. SpeedDialActions terpasang di seluruh halaman yang memiliki aksi", () => {
  const actionPages = [
    "src/app/struktur/page.tsx",
    "src/app/keuangan/page.tsx",
    "src/app/rundown/page.tsx",
    "src/app/tugas/page.tsx",
    "src/app/tamu/page.tsx",
  ];

  for (const file of actionPages) {
    const content = fs.readFileSync(getAppFile(file), "utf-8");
    assert.ok(
      content.includes("<SpeedDialActions"),
      `File ${file} must include <SpeedDialActions`
    );
  }
});

test("6. Responsiveness mobile - pembatasan overflow horizontal", () => {
  const globalsCss = fs.readFileSync(
    path.join(rootDir, "src/app/globals.css"),
    "utf-8"
  );
  assert.ok(
    globalsCss.includes("overflow-x: hidden"),
    "globals.css must restrict overflow-x on html/body"
  );

  const navbarContent = fs.readFileSync(
    path.join(rootDir, "src/components/Navbar.tsx"),
    "utf-8"
  );
  assert.ok(
    navbarContent.includes("overflow-x-hidden"),
    "Navbar must prevent horizontal flex blowout"
  );

  const tamuContent = fs.readFileSync(
    getAppFile("src/app/tamu/page.tsx"),
    "utf-8"
  );
  assert.equal(
    tamuContent.includes("min-w-[280px]"),
    false,
    "Tamu page filter bar should not have rigid min-w-[280px]"
  );
});
