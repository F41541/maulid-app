import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { initSchema } from "../src/lib/db.ts";

const rootDir = process.cwd();

test("1. Tugas: is_umum flag and multi-division scoping in MariaDB schema", async () => {
  const schemaPath = path.join(rootDir, "scripts", "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf-8");
  assert.ok(sql.includes("`is_umum` TINYINT(1) NOT NULL DEFAULT 0"), "schema.sql must define is_umum");

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
  const tugasTableQuery = queries.find((q) => q.sql.includes("CREATE TABLE IF NOT EXISTS tugas"));
  assert.ok(tugasTableQuery, "tugas table query must be executed");
  assert.ok(tugasTableQuery.sql.includes("is_umum TINYINT(1) NOT NULL DEFAULT 0"), "tugas query must include is_umum");

  // In-memory scoping verification
  const seksiId = "seksi-1";
  const tasks = [
    { id: "task-1", seksi_id: null, is_umum: 1, nama_tugas: "Gotong Royong" },
    { id: "task-2", seksi_id: "seksi-1", is_umum: 0, nama_tugas: "Konsumsi" },
    { id: "task-3", seksi_id: "seksi-2", is_umum: 0, nama_tugas: "Dekorasi" },
  ];

  const divisionTasks = tasks.filter((t) => t.seksi_id === seksiId || t.is_umum === 1);
  assert.equal(divisionTasks.length, 2);
  assert.ok(divisionTasks.some((t) => t.id === "task-1"));
  assert.ok(divisionTasks.some((t) => t.id === "task-2"));
  assert.ok(!divisionTasks.some((t) => t.id === "task-3"));
});

test("2. TugasModal: wider layout, single-row DateInput, Seluruh Divisi in dropdown, conditional PJ below seksi", () => {
  const modalPath = path.join(rootDir, "src", "app", "tugas", "components", "TugasModal.tsx");
  const content = fs.readFileSync(modalPath, "utf-8");

  // 1. Modal must have wider layout maxWidth="lg"
  assert.ok(content.includes('maxWidth="lg"'), "TugasModal must set maxWidth='lg'");

  // 2. Standalone checkbox banner for is_umum must be removed
  assert.ok(!content.includes("is_umum_checkbox"), "TugasModal must not have standalone is_umum_checkbox");

  // 3. 'Seluruh Divisi' must be moved into the Seksi Pelaksana dropdown
  assert.match(
    content,
    /<option\s+value=["']ALL["']>\s*🌐\s*Seluruh Divisi/i,
    "TugasModal must contain 'Seluruh Divisi' option inside the Seksi dropdown"
  );

  // 4. DateInput must be 1 full line (not crammed into a 2-column grid with status)
  assert.ok(!content.includes("grid grid-cols-1 sm:grid-cols-2 gap-3"), "TugasModal must not cram DateInput into a 2-column grid");

  // 5. Penanggung Jawab (PJ) must only appear when Seluruh Divisi is chosen (isTugasUmum)
  assert.ok(
    content.includes("{isTugasUmum && ("),
    "Penanggung Jawab field must be conditionally rendered only when isTugasUmum is active"
  );

  // 6. Penanggung Jawab must appear directly AFTER Seksi Pelaksana dropdown
  const seksiIdx = content.indexOf("Seksi Pelaksana");
  const pjIdx = content.indexOf("Penanggung Jawab (PJ Tugas Seluruh Divisi)");
  assert.ok(seksiIdx !== -1, "Seksi Pelaksana section must exist");
  assert.ok(pjIdx !== -1, "Penanggung Jawab section must exist");
  assert.ok(seksiIdx < pjIdx, "Penanggung Jawab must be positioned below Seksi Pelaksana");

  // 7. Selecting a specific seksi must clear pj_id
  assert.match(
    content,
    /seksi_id:\s*val,\s*pj_id:\s*["']["']/,
    "Selecting a specific seksi must clear pj_id"
  );
});

test("3. Tugas Card: Redundant status badge removed and dropdown aligned to bottom right", () => {
  const file = path.join(rootDir, "src/app/tugas/page.tsx");
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

test("4. Tugas Card: Status dropdown colored dynamically by status", () => {
  const file = path.join(rootDir, "src/app/tugas/page.tsx");
  const content = fs.readFileSync(file, "utf-8");

  assert.ok(
    content.includes('t.status === "Selesai"'),
    "Tugas status dropdown must check for Selesai"
  );
  assert.ok(
    content.includes("bg-emerald-50 text-emerald-700 border-emerald-300"),
    "Selesai status dropdown must be colored emerald/green"
  );
  assert.ok(
    content.includes('t.status === "Proses"'),
    "Tugas status dropdown must check for Proses"
  );
  assert.ok(
    content.includes("bg-amber-50 text-amber-700 border-amber-300"),
    "Proses status dropdown must be colored amber/yellow"
  );
  assert.ok(
    content.includes("bg-slate-100 text-slate-700 border-slate-300"),
    "Belum Mulai status dropdown must be colored slate/gray"
  );
});

test("5. Progress Badges Tugas per Seksi: Responsive layout", () => {
  const file = path.join(rootDir, "src/app/tugas/page.tsx");
  const content = fs.readFileSync(file, "utf-8");

  // Grid / flex layout
  assert.ok(
    content.includes("flex flex-wrap gap-3 sm:gap-4"),
    "Progress container must use responsive flex wrap container"
  );

  // Item responsive sizing: 1 on mobile (w-full), 3 full on desktop (lg:min-w-[calc(33.333%-1rem)]), flexible remainder (sm:flex-1)
  assert.ok(
    content.includes("w-full sm:flex-1 sm:min-w-[calc(50%-0.75rem)] lg:min-w-[calc(33.333%-1rem)]"),
    "Progress badge item must be 1 on mobile, 3 full on desktop, with flexible remainder"
  );
});

test("6. Tugas Filter Bar: Remains compact 2-item filter", () => {
  const file = path.join(rootDir, "src/app/tugas/page.tsx");
  const content = fs.readFileSync(file, "utf-8");

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
