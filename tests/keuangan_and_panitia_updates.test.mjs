import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

test("1. Panitia Table: Akun Pengguna is placed immediately before Aksi", () => {
  const file = fs.existsSync(path.join(rootDir, "src/app/(portal)/struktur/page.tsx"))
    ? path.join(rootDir, "src/app/(portal)/struktur/page.tsx")
    : path.join(rootDir, "src/app/struktur/page.tsx");
  const content = fs.readFileSync(file, "utf-8");

  // In the thead: Kontak / No HP -> Catatan -> Akun Pengguna -> Aksi
  const headerIdxHp = content.indexOf('<th className="py-3 px-4">Kontak / No HP</th>');
  const headerIdxCatatan = content.indexOf('<th className="py-3 px-4">Catatan</th>');
  const headerIdxAkun = content.indexOf('<th className="py-3 px-4">Akun Pengguna</th>');
  const headerIdxAksi = content.indexOf('<th className="py-3 px-4 text-right no-print">Aksi</th>');

  assert.ok(headerIdxHp !== -1, "Kontak / No HP header must exist");
  assert.ok(headerIdxCatatan !== -1, "Catatan header must exist");
  assert.ok(headerIdxAkun !== -1, "Akun Pengguna header must exist");
  assert.ok(headerIdxAksi !== -1, "Aksi header must exist");

  assert.ok(headerIdxHp < headerIdxCatatan, "Kontak must come before Catatan");
  assert.ok(headerIdxCatatan < headerIdxAkun, "Catatan must come before Akun Pengguna");
  assert.ok(headerIdxAkun < headerIdxAksi, "Akun Pengguna must come before Aksi");
});

test("2. Seeder & Auth: Ketua account is mfaisalfahri02@gmail.com with password 'password'", async () => {
  const dbFile = path.join(rootDir, "src/lib/db.ts");
  const dbContent = fs.readFileSync(dbFile, "utf-8");

  assert.ok(
    dbContent.includes("mfaisalfahri02@gmail.com"),
    "db.ts must seed mfaisalfahri02@gmail.com"
  );
  assert.ok(
    dbContent.includes("ketua_panitia"),
    "Role must be ketua_panitia"
  );

  // Test LoginPage does not prefill credentials (security hardening)
  const loginFile = path.join(rootDir, "src/app/login/page.tsx");
  const loginContent = fs.readFileSync(loginFile, "utf-8");
  assert.ok(
    loginContent.includes('useState("")'),
    "Login form inputs must initialize empty for security"
  );

  // MariaDB pool mock for schema and seed execution
  const { initSchema, seedInitialData } = await import("../src/lib/db.ts");
  const queries = [];
  const mockPool = {
    query: async (sql, params) => {
      queries.push({ sql, params });
      return [[], []];
    },
    execute: async (sql, params) => {
      queries.push({ sql, params });
      return [{ affectedRows: 1 }];
    },
  };

  await initSchema(mockPool);
  await seedInitialData(mockPool);

  const seedCall = queries.find(
    (q) =>
      q.sql &&
      q.sql.includes("admin_users") &&
      q.sql.includes("INSERT") &&
      (q.sql.includes("mfaisalfahri02@gmail.com") ||
        (q.params && q.params.includes("mfaisalfahri02@gmail.com")))
  );
  assert.ok(seedCall, "Seed query must include mfaisalfahri02@gmail.com");
  assert.ok(
    seedCall.sql.includes("password") ||
      (seedCall.params && seedCall.params.some((p) => typeof p === "string" && (p === "password" || p.includes(":")))),
    "Seed query must include password or hashed password"
  );
  assert.ok(
    seedCall.sql.includes("ketua_panitia") ||
      (seedCall.params && seedCall.params.includes("ketua_panitia")),
    "Seed query must include ketua_panitia"
  );
});

test("3. Keuangan Cards: Total Saldo is full-width white card; Dompet & Rekening split into 2 columns", () => {
  const file = fs.existsSync(path.join(rootDir, "src/app/(portal)/keuangan/page.tsx"))
    ? path.join(rootDir, "src/app/(portal)/keuangan/page.tsx")
    : path.join(rootDir, "src/app/keuangan/page.tsx");
  const content = fs.readFileSync(file, "utf-8");

  // Check that green gradient is removed from Total Semua Saldo
  assert.ok(
    !content.includes("from-slate-900 to-emerald-950"),
    "Old emerald gradient card must be removed"
  );

  // Check white card styling for Total Saldo
  assert.ok(
    content.includes("Total Semua Saldo Kas (Keseluruhan)"),
    "Must have total card"
  );
  assert.ok(
    content.includes("bg-white dark:bg-slate-900"),
    "Total card must use clean white card bg"
  );

  // Check 2-column subcards grid
  assert.ok(
    content.includes("grid grid-cols-1 sm:grid-cols-2 gap-5"),
    "Dompet and Rekening must be split into 2 columns"
  );
});

test("4. Keuangan: Aksi edit and related code eliminated", () => {
  const pageFile = fs.existsSync(path.join(rootDir, "src/app/(portal)/keuangan/page.tsx"))
    ? path.join(rootDir, "src/app/(portal)/keuangan/page.tsx")
    : path.join(rootDir, "src/app/keuangan/page.tsx");
  const pageContent = fs.readFileSync(pageFile, "utf-8");

  assert.ok(!pageContent.includes("editingTransaksi"), "editingTransaksi state must be removed");
  assert.ok(!pageContent.includes("openEdit"), "openEdit function must be removed");
  assert.ok(!pageContent.includes('action = editingTransaksi ? "update" : "create"'), "Update branch must be removed");

  const apiFile = path.join(rootDir, "src/app/api/keuangan/route.ts");
  const apiContent = fs.readFileSync(apiFile, "utf-8");
  assert.ok(!apiContent.includes('action === "update"'), 'action === "update" backend handler must be removed');

  const modalFile = fs.existsSync(path.join(rootDir, "src/app/(portal)/keuangan/components/TransaksiModal.tsx"))
    ? path.join(rootDir, "src/app/(portal)/keuangan/components/TransaksiModal.tsx")
    : path.join(rootDir, "src/app/keuangan/components/TransaksiModal.tsx");
  const modalContent = fs.readFileSync(modalFile, "utf-8");
  assert.ok(!modalContent.includes("isEdit"), "isEdit prop must be removed from TransaksiModal");
});
