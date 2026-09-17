import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { initSchema } from "../src/lib/db.ts";

const rootDir = process.cwd();

test("1. Rundown schema and migration supports 'hari' field with default value", async () => {
  const schemaPath = path.join(rootDir, "scripts", "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf-8");
  assert.ok(sql.includes("`hari` VARCHAR(50) NOT NULL DEFAULT 'Hari H'"), "schema.sql must define hari with default");

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
  const rundownTableQuery = queries.find((q) => q.sql.includes("CREATE TABLE IF NOT EXISTS rundown"));
  assert.ok(rundownTableQuery, "rundown table query must be executed");
  assert.ok(rundownTableQuery.sql.includes("hari VARCHAR(50) NOT NULL DEFAULT 'Hari H'"), "rundown query must include hari default");
});

test("2. Rundown UI: Vertical timeline connector connects sequence numbers without touching", () => {
  const rundownPagePath = path.join(rootDir, "src", "app", "rundown", "page.tsx");
  const content = fs.readFileSync(rundownPagePath, "utf-8");

  // Row container has relative positioning
  assert.ok(content.includes("transition group relative"), "Row container must have relative positioning");

  // Vertical connector line for non-last items
  assert.ok(
    content.includes("index < sortedItems.length - 1"),
    "Connector line must only be rendered between items, excluding the last one"
  );
  assert.ok(
    content.includes("w-0.5 bg-slate-200 dark:bg-slate-700 rounded-full pointer-events-none"),
    "Connector line must be a subtle 2px rounded vertical bar"
  );

  // Spacing / gaps (don't touch circle badges)
  assert.ok(
    content.includes("top-[52px] sm:top-[56px] -bottom-2 sm:-bottom-3"),
    "Connector line must maintain breathing room/margin from both the current and next number circle"
  );
});

test("3. RundownModal: Integrates DateInput for 'hari' and TimeColonInput for 'waktu'", () => {
  const modalPath = path.join(rootDir, "src", "app", "rundown", "components", "RundownModal.tsx");
  const content = fs.readFileSync(modalPath, "utf-8");

  // DateInput import & usage
  assert.ok(content.includes('import { DateInput } from "@/components/ui/DateInput";'), "Must import DateInput");
  assert.ok(content.includes("<DateInput"), "Must render DateInput component");
  assert.ok(content.includes("value={form.hari}"), "DateInput must bind to form.hari");

  // TimeColonInput import & usage
  assert.ok(content.includes('import { TimeColonInput } from "@/components/ui/TimeColonInput";'), "Must import TimeColonInput");
  assert.ok(content.includes("<TimeColonInput"), "Must render TimeColonInput component");
  assert.ok(content.includes("value={form.waktu}"), "TimeColonInput must bind to form.waktu");
});

test("4. Rundown API: Endpoints handle chronological ordering and atomic reorder transaction", () => {
  const apiPath = path.join(rootDir, "src", "app", "api", "rundown", "route.ts");
  const content = fs.readFileSync(apiPath, "utf-8");

  // GET ordering
  assert.ok(
    content.includes("ORDER BY urutan ASC, created_at ASC"),
    "GET endpoint must sort by urutan ASC and created_at ASC"
  );

  // POST reorder handler with transaction
  assert.ok(content.includes('action === "reorder"'), "POST must handle action 'reorder'");
  assert.ok(content.includes("withTransaction"), "Reorder must be wrapped in atomic transaction");
  assert.ok(
    content.includes("UPDATE rundown SET urutan = ? WHERE id = ?"),
    "Reorder must update urutan per item"
  );
});
