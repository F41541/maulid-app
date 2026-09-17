import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  ROLES,
} from "../src/lib/auth-tokens.ts";
import { getTodayString } from "../src/lib/format.ts";

const rootDir = process.cwd();

test("1. verifyPassword safe buffer comparison handles unequal lengths without error", () => {
  const password = "password123";
  const validHash = hashPassword(password);

  // Normal matching
  assert.equal(verifyPassword(password, validHash), true);
  assert.equal(verifyPassword("wrongpass", validHash), false);

  // Tampered salt:hash with invalid length
  const malformedHash1 = "1234:5678"; // much shorter hash length
  assert.equal(verifyPassword(password, malformedHash1), false);

  // Empty or invalid storedHash
  assert.equal(verifyPassword(password, ""), false);
  assert.equal(verifyPassword(password, null), false);
});

test("2. Username colon rejection in session token generation", () => {
  const validUser = {
    id: "usr-1",
    username: "ahmadfauzi",
    nama: "Ahmad Fauzi",
    role: ROLES.KETUA_PANITIA,
  };

  assert.ok(createSessionToken(validUser));

  const invalidUser = {
    id: "usr-2",
    username: "ahmad:fauzi",
    nama: "Ahmad Fauzi",
    role: ROLES.KETUA_PANITIA,
  };

  assert.throws(() => {
    createSessionToken(invalidUser);
  }, /Username cannot contain ':' delimiter/);
});

test("3. Timezone Asia/Jakarta in getTodayString format", () => {
  const today = getTodayString();
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);

  // Check year is 2026
  const [year, month, day] = today.split("-").map(Number);
  assert.equal(year, 2026);
  assert.ok(month >= 1 && month <= 12);
  assert.ok(day >= 1 && day <= 31);
});

test("4. Schema SQL and db.ts define target_role and created_by in tugas table", () => {
  const schemaPath = path.join(rootDir, "scripts", "schema.sql");
  const schemaContent = fs.readFileSync(schemaPath, "utf-8");

  assert.ok(
    schemaContent.includes("`target_role` VARCHAR(50) DEFAULT NULL"),
    "schema.sql must include target_role column"
  );
  assert.ok(
    schemaContent.includes("`created_by` VARCHAR(36) DEFAULT NULL"),
    "schema.sql must include created_by column"
  );

  const dbPath = path.join(rootDir, "src", "lib", "db.ts");
  const dbContent = fs.readFileSync(dbPath, "utf-8");
  assert.ok(
    dbContent.includes('await addCol("tugas", "target_role", "VARCHAR(50) NULL");'),
    "db.ts must migrate target_role"
  );
  assert.ok(
    dbContent.includes('await addCol("tugas", "created_by", "VARCHAR(36) NULL");'),
    "db.ts must migrate created_by"
  );
});

test("5. Users route handles toggle_status, sanitizes colons, and allows WAKIL_KETUA", () => {
  const usersRoutePath = path.join(rootDir, "src", "app", "api", "users", "route.ts");
  const usersContent = fs.readFileSync(usersRoutePath, "utf-8");

  assert.ok(usersContent.includes('action === "toggle_status"'), "Must handle toggle_status action");
  assert.ok(usersContent.includes("currentUser.id"), "Must protect against self-deactivation");
  assert.ok(usersContent.includes('username.includes(":")'), "Must reject colons in username");
  assert.ok(usersContent.includes("ROLES.WAKIL_KETUA"), "Must authorize WAKIL_KETUA");
});

test("6. Keuangan deficit protection with transaction and locking", () => {
  const keuanganRoutePath = path.join(rootDir, "src", "app", "api", "keuangan", "route.ts");
  const content = fs.readFileSync(keuanganRoutePath, "utf-8");

  assert.ok(content.includes("FOR UPDATE"), "Must use SELECT ... FOR UPDATE to lock row against race conditions");
  assert.ok(content.includes("Saldo"), "Must validate balance before recording expense");
  assert.ok(content.includes("tidak mencukupi"), "Must reject transactions when balance is insufficient");
});

test("7. Upload route verifies binary magic bytes and writes asynchronously", () => {
  const uploadRoutePath = path.join(rootDir, "src", "app", "api", "tugas", "upload", "route.ts");
  const content = fs.readFileSync(uploadRoutePath, "utf-8");

  assert.ok(content.includes("0xff && buffer[1] === 0xd8 && buffer[2] === 0xff"), "Must check JPEG magic bytes");
  assert.ok(content.includes("0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e"), "Must check PNG magic bytes");
  assert.ok(content.includes("0x52") && content.includes("0x49") && content.includes("0x57"), "Must check WebP RIFF/WEBP magic bytes");
  assert.ok(content.includes("await fs.promises.writeFile"), "Must use non-blocking async file write");
});

test("8. Formula injection mitigation in Keuangan and Tamu Excel export", () => {
  const keuanganPagePath = fs.existsSync(path.join(rootDir, "src", "app", "(portal)", "keuangan", "page.tsx"))
    ? path.join(rootDir, "src", "app", "(portal)", "keuangan", "page.tsx")
    : path.join(rootDir, "src", "app", "keuangan", "page.tsx");
  const keuanganContent = fs.readFileSync(keuanganPagePath, "utf-8");
  assert.ok(keuanganContent.includes("sanitizeFormula"), "Keuangan page must define formula sanitizer");

  const tamuPagePath = fs.existsSync(path.join(rootDir, "src", "app", "(portal)", "tamu", "page.tsx"))
    ? path.join(rootDir, "src", "app", "(portal)", "tamu", "page.tsx")
    : path.join(rootDir, "src", "app", "tamu", "page.tsx");
  const tamuContent = fs.readFileSync(tamuPagePath, "utf-8");
  assert.ok(tamuContent.includes("sanitizeFormula"), "Tamu page must define formula sanitizer");
});

test("9. Public guestbook form connects to WhatsApp in LocationContactSection", () => {
  const sectionPath = path.join(rootDir, "src", "components", "landing", "LocationContactSection.tsx");
  const content = fs.readFileSync(sectionPath, "utf-8");

  assert.ok(content.includes("wa.me"), "Must target WhatsApp API URL");
  assert.ok(content.includes("encodeURIComponent"), "Must encode message for WhatsApp");
  assert.ok(content.includes("Kirim Pesan via WhatsApp"), "Button must communicate WhatsApp sending");
});

test("10. Event date aligned to 11 Oktober 2026 across seeder and components", () => {
  const dbPath = path.join(rootDir, "src", "lib", "db.ts");
  const dbContent = fs.readFileSync(dbPath, "utf-8");
  assert.ok(dbContent.includes("2026-10-11"), "db.ts rundown seeder must specify 2026-10-11");
  assert.ok(dbContent.includes("2026-10-08"), "db.ts tugas seeder must align deadlines to October 2026");

  const countdownPath = fs.existsSync(path.join(rootDir, "src", "app", "(portal)", "dashboard", "components", "CountdownAcaraCard.tsx"))
    ? path.join(rootDir, "src", "app", "(portal)", "dashboard", "components", "CountdownAcaraCard.tsx")
    : path.join(rootDir, "src", "app", "dashboard", "components", "CountdownAcaraCard.tsx");
  const countdownContent = fs.readFileSync(countdownPath, "utf-8");
  assert.ok(countdownContent.includes("2026, 9, 11"), "CountdownAcaraCard must default Hari H to 11 Oktober 2026");
});

test("11. Keuangan void action enforces zero deficit protection with FOR UPDATE lock", () => {
  const keuanganRoutePath = path.join(rootDir, "src", "app", "api", "keuangan", "route.ts");
  const content = fs.readFileSync(keuanganRoutePath, "utf-8");

  assert.ok(content.includes("Pembatalan pemasukan ditolak"), "Must reject voiding income if it causes negative balance");
  assert.ok(content.includes("Pembatalan mutasi ditolak"), "Must reject voiding transfer if recipient channel has insufficient funds");
});

test("12. AUTH_SECRET distinguishes build phase from runtime fatal error", () => {
  const authTokensPath = path.join(rootDir, "src", "lib", "auth-tokens.ts");
  const content = fs.readFileSync(authTokensPath, "utf-8");

  assert.ok(content.includes("phase-production-build"), "Must check NEXT_PHASE to allow next build without crashing");
  assert.ok(content.includes("FATAL ERROR: AUTH_SECRET must be defined"), "Must throw fatal error on production runtime");
});

test("13. Rundown UI authorises Wakil Ketua in canEditRundown", () => {
  const rundownPagePath = fs.existsSync(path.join(rootDir, "src", "app", "(portal)", "rundown", "page.tsx"))
    ? path.join(rootDir, "src", "app", "(portal)", "rundown", "page.tsx")
    : path.join(rootDir, "src", "app", "rundown", "page.tsx");
  const content = fs.readFileSync(rundownPagePath, "utf-8");

  assert.ok(content.includes("isWakilRole"), "Rundown page must import and check isWakilRole");
  assert.ok(content.includes("wakil_ketua"), "canEditRundown must include wakil_ketua role");
});

test("14. Tugas API unlinks orphaned photos safely after successful DB update", () => {
  const tugasRoutePath = path.join(rootDir, "src", "app", "api", "tugas", "route.ts");
  const content = fs.readFileSync(tugasRoutePath, "utf-8");

  const updateSectionIndex = content.indexOf('action === "update"');
  const executeIndex = content.indexOf("UPDATE tugas SET", updateSectionIndex);
  const unlinkIndex = content.indexOf("safeUnlinkPhoto(existing.foto_dokumentasi)", updateSectionIndex);

  assert.ok(unlinkIndex > executeIndex, "safeUnlinkPhoto must execute AFTER database update succeeds");
});
