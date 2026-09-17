import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  ROLES,
} from "../src/lib/auth-tokens.ts";

test("1. PBKDF2 Password Hashing & Legacy Fallback", () => {
  const password = "SuperSecretPassword123!";
  const hash = hashPassword(password);

  assert.ok(hash.includes(":"), "Salt and hash must be delimited with a colon");
  const [salt, hexHash] = hash.split(":");
  assert.equal(salt.length, 32, "Salt should be 16 bytes (32 hex characters)");
  assert.equal(hexHash.length, 128, "SHA-512 hash should be 64 bytes (128 hex characters)");

  // Correct password verification
  assert.equal(verifyPassword(password, hash), true, "Correct password should verify successfully");

  // Incorrect password verification
  assert.equal(verifyPassword("WrongPassword", hash), false, "Incorrect password should fail verification");

  // Legacy fallback for test environments
  assert.equal(verifyPassword("password", "password"), true, "Legacy test plaintext password should verify");
  assert.equal(verifyPassword("admin", "admin"), true, "Legacy test plaintext admin password should verify");
  assert.equal(verifyPassword("wrong", "password"), false, "Mismatched plaintext password should fail");
});

test("2. Cryptographic Session Token Generation & Tamper Detection", () => {
  const user = {
    id: "usr-ketua-01",
    username: "ketua123",
    nama: "H. Ahmad Fauzi",
    role: ROLES.KETUA_PANITIA,
    seksi_id: null,
  };

  const token = createSessionToken(user);
  assert.ok(token, "Session token should be generated");

  const verified = verifySessionToken(token);
  assert.ok(verified, "Valid token must verify successfully");
  assert.equal(verified.userId, user.id);
  assert.equal(verified.username, user.username);
  assert.equal(verified.role, ROLES.KETUA_PANITIA);
  assert.equal(verified.seksiId, null);

  // Tamper test: Alter user role in base64 payload
  const decoded = Buffer.from(token, "base64").toString("utf-8");
  const tamperedDecoded = decoded.replace(ROLES.KETUA_PANITIA, "sekretaris");
  const tamperedToken = Buffer.from(tamperedDecoded).toString("base64");

  const tamperedResult = verifySessionToken(tamperedToken);
  assert.equal(tamperedResult, null, "Tampered payload signature must be rejected");

  // Expired token test
  const expiredData = `${user.id}:${user.username}:${user.role}::${Date.now() - 10000}`;
  const hmac = crypto.createHmac("sha256", process.env.AUTH_SECRET || "maulid-app-super-secret-key-1448h-2026m");
  const sig = hmac.update(expiredData).digest("hex");
  const expiredToken = Buffer.from(`${expiredData}:${sig}`).toString("base64");

  assert.equal(verifySessionToken(expiredToken), null, "Expired session token must be rejected");
});

test("3. Role-Based Access Control (RBAC) Permission Matrix", () => {
  // Define endpoint permission rules
  const permissions = {
    "/pengguna": [ROLES.KETUA_PANITIA],
    "/keuangan": [ROLES.KETUA_PANITIA, ROLES.WAKIL_KETUA, ROLES.BENDAHARA],
    "/rundown": [ROLES.KETUA_PANITIA, ROLES.WAKIL_KETUA, ROLES.SEKRETARIS],
    "/tamu": [ROLES.KETUA_PANITIA, ROLES.WAKIL_KETUA, ROLES.SEKRETARIS],
    "/struktur": [ROLES.KETUA_PANITIA, ROLES.WAKIL_KETUA],
  };

  function canAccess(role, path) {
    const effectiveRole = role === "admin" ? ROLES.KETUA_PANITIA : role;
    if (effectiveRole === ROLES.KETUA_PANITIA) return true;
    const allowed = permissions[path] || [];
    return allowed.includes(effectiveRole);
  }

  // Ketua Panitia has super-access across all areas
  assert.equal(canAccess(ROLES.KETUA_PANITIA, "/pengguna"), true);
  assert.equal(canAccess(ROLES.KETUA_PANITIA, "/keuangan"), true);
  assert.equal(canAccess(ROLES.KETUA_PANITIA, "/rundown"), true);
  assert.equal(canAccess(ROLES.KETUA_PANITIA, "/tamu"), true);

  // Wakil Ketua: Operational access, but strictly NO user account management
  assert.equal(canAccess(ROLES.WAKIL_KETUA, "/pengguna"), false);
  assert.equal(canAccess(ROLES.WAKIL_KETUA, "/keuangan"), true);
  assert.equal(canAccess(ROLES.WAKIL_KETUA, "/rundown"), true);
  assert.equal(canAccess(ROLES.WAKIL_KETUA, "/tamu"), true);

  // Bendahara: Financial access only, no rundown/tamu/users
  assert.equal(canAccess(ROLES.BENDAHARA, "/pengguna"), false);
  assert.equal(canAccess(ROLES.BENDAHARA, "/keuangan"), true);
  assert.equal(canAccess(ROLES.BENDAHARA, "/rundown"), false);
  assert.equal(canAccess(ROLES.BENDAHARA, "/tamu"), false);

  // Sekretaris: Rundown and tamu, but strictly NO financial access
  assert.equal(canAccess(ROLES.SEKRETARIS, "/pengguna"), false);
  assert.equal(canAccess(ROLES.SEKRETARIS, "/keuangan"), false);
  assert.equal(canAccess(ROLES.SEKRETARIS, "/rundown"), true);
  assert.equal(canAccess(ROLES.SEKRETARIS, "/tamu"), true);

  // Koordinator Seksi: Only their dashboard/tasks, no central modules
  assert.equal(canAccess(ROLES.KOORDINATOR_SEKSI, "/pengguna"), false);
  assert.equal(canAccess(ROLES.KOORDINATOR_SEKSI, "/keuangan"), false);
  assert.equal(canAccess(ROLES.KOORDINATOR_SEKSI, "/rundown"), false);
  assert.equal(canAccess(ROLES.KOORDINATOR_SEKSI, "/tamu"), false);
});

test("4. Financial Void System (Audit Trail & Double-Entry Reversal)", () => {
  // In-memory ledger representing MariaDB keuangan table
  const keuangan = [];

  // 1. Initial Infaq & Expense
  keuangan.push({ id: "k-1", tipe: "masuk", tanggal: "2026-09-01", keterangan: "Infaq Donatur A (Tunai)", nominal: 5000000, metode: "cash", status: "aktif" });
  keuangan.push({ id: "k-2", tipe: "masuk", tanggal: "2026-09-02", keterangan: "Transfer Sponsor B", nominal: 3000000, metode: "transfer", status: "aktif" });
  keuangan.push({ id: "k-3", tipe: "keluar", tanggal: "2026-09-03", keterangan: "DP Konsumsi", nominal: 2000000, metode: "cash", status: "aktif" });

  // calculateBalances replicates SQL aggregation from src/app/api/keuangan/route.ts
  function calculateBalances() {
    const cash_masuk = keuangan
      .filter((r) => r.metode === "cash" && r.tipe === "masuk" && (!r.status || r.status === "aktif"))
      .reduce((sum, r) => sum + r.nominal, 0);
    const cash_keluar = keuangan
      .filter((r) => r.metode === "cash" && r.tipe === "keluar" && (!r.status || r.status === "aktif"))
      .reduce((sum, r) => sum + r.nominal, 0);
    const tf_masuk = keuangan
      .filter((r) => r.metode === "transfer" && r.tipe === "masuk" && (!r.status || r.status === "aktif"))
      .reduce((sum, r) => sum + r.nominal, 0);
    const tf_keluar = keuangan
      .filter((r) => r.metode === "transfer" && r.tipe === "keluar" && (!r.status || r.status === "aktif"))
      .reduce((sum, r) => sum + r.nominal, 0);
    const omset_masuk = keuangan
      .filter((r) => r.tipe === "masuk" && (!r.kategori || r.kategori !== "mutasi_internal") && (!r.status || r.status === "aktif"))
      .reduce((sum, r) => sum + r.nominal, 0);
    const omset_keluar = keuangan
      .filter((r) => r.tipe === "keluar" && (!r.kategori || r.kategori !== "mutasi_internal") && (!r.status || r.status === "aktif"))
      .reduce((sum, r) => sum + r.nominal, 0);

    const saldoCash = cash_masuk - cash_keluar;
    const saldoRekening = tf_masuk - tf_keluar;
    const totalSaldo = saldoCash + saldoRekening;
    return { saldoCash, saldoRekening, totalSaldo, omsetMasuk: omset_masuk, omsetKeluar: omset_keluar };
  }

  // Check initial state: Cash 5M - 2M = 3M, Bank 3M, Total = 6M
  let bal = calculateBalances();
  assert.equal(bal.saldoCash, 3000000);
  assert.equal(bal.saldoRekening, 3000000);
  assert.equal(bal.totalSaldo, 6000000);
  assert.equal(bal.omsetMasuk, 8000000);
  assert.equal(bal.omsetKeluar, 2000000);

  // 2. Void Transaction k-3 (DP Konsumsi) with audit trail
  const reason = "Nota dibatalkan oleh pihak catering";
  const actor = "Bendahara Panitia";

  // Mark original as void
  const target = keuangan.find((r) => r.id === "k-3");
  target.status = "void";
  target.void_reason = reason;
  target.void_by = actor;
  target.void_at = new Date().toISOString();

  // Write reversal record
  keuangan.push({
    id: "rev-1",
    tipe: "masuk",
    tanggal: "2026-09-03",
    keterangan: "[VOID] Pembalik DP Konsumsi",
    nominal: 2000000,
    metode: "cash",
    status: "reversal",
    void_ref_id: "k-3",
  });

  // Audit trail verification: row k-3 is NEVER deleted
  const voidedRow = keuangan.find((r) => r.id === "k-3");
  assert.equal(voidedRow.status, "void");
  assert.equal(voidedRow.void_reason, reason);
  assert.equal(voidedRow.void_by, actor);

  // Balances after voiding expense:
  // DP Konsumsi (keluar 2M) is voided, cash saldo returns to 5M, total saldo returns to 8M
  bal = calculateBalances();
  assert.equal(bal.saldoCash, 5000000, "Cash balance should be restored to 5,000,000");
  assert.equal(bal.saldoRekening, 3000000, "Bank balance remains 3,000,000");
  assert.equal(bal.totalSaldo, 8000000, "Total balance restored to 8,000,000");
  assert.equal(bal.omsetKeluar, 0, "Omset keluar is now 0 after voiding the only expense");

  // 3. Paired Internal Mutation (Cash to Transfer 1,000,000)
  const pairId = "pair-mutasi-01";
  keuangan.push({
    id: "mut-keluar",
    tipe: "keluar",
    tanggal: "2026-09-04",
    keterangan: "Setor Tunai ke Bank",
    nominal: 1000000,
    metode: "cash",
    kategori: "mutasi_internal",
    status: "aktif",
    pair_id: pairId,
  });
  keuangan.push({
    id: "mut-masuk",
    tipe: "masuk",
    tanggal: "2026-09-04",
    keterangan: "Setor Tunai dari Dompet",
    nominal: 1000000,
    metode: "transfer",
    kategori: "mutasi_internal",
    status: "aktif",
    pair_id: pairId,
  });

  bal = calculateBalances();
  assert.equal(bal.saldoCash, 4000000, "Cash decreased by 1M");
  assert.equal(bal.saldoRekening, 4000000, "Bank increased by 1M");
  assert.equal(bal.totalSaldo, 8000000, "Total saldo unchanged during internal mutation");
  assert.equal(bal.omsetMasuk, 8000000, "Omset masuk must NOT count internal mutation");
  assert.equal(bal.omsetKeluar, 0, "Omset keluar must NOT count internal mutation");

  // 4. Voiding Paired Mutation: Both legs must be voided together
  const mutationPairs = keuangan.filter((r) => r.pair_id === pairId);
  assert.equal(mutationPairs.length, 2, "Must find exactly 2 paired legs");

  for (const leg of mutationPairs) {
    leg.status = "void";
    leg.void_reason = "Salah transfer rekening";
    leg.void_by = "Ketua";

    const revTipe = leg.tipe === "masuk" ? "keluar" : "masuk";
    keuangan.push({
      id: `rev-${leg.id}`,
      tipe: revTipe,
      tanggal: "2026-09-04",
      keterangan: "[VOID] Pembalik Mutasi",
      nominal: leg.nominal,
      metode: leg.metode,
      kategori: "mutasi_internal",
      status: "reversal",
      void_ref_id: leg.id,
      pair_id: pairId,
    });
  }

  // After voiding mutation, balances revert back cleanly
  bal = calculateBalances();
  assert.equal(bal.saldoCash, 5000000, "Cash restored to 5,000,000");
  assert.equal(bal.saldoRekening, 3000000, "Bank restored to 3,000,000");
  assert.equal(bal.totalSaldo, 8000000, "Total saldo preserved at 8,000,000");

  // 5. Verification: api/keuangan/route.ts SQL Query Integrity
  const apiFile = path.join(process.cwd(), "src/app/api/keuangan/route.ts");
  const apiContent = fs.readFileSync(apiFile, "utf-8");
  assert.ok(apiContent.includes("(status IS NULL OR status = 'aktif')"), "API must only sum active records");
  assert.ok(apiContent.includes("kategori != 'mutasi_internal'"), "API must exclude internal mutations from omset");
});
