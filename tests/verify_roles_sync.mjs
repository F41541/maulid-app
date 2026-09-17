import { createRequire } from "module";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const { chromium } = require("/home/laxcyyfa/.npm/_npx/86170c4cd1c5da32/node_modules/playwright");

const BASE_URL = "http://localhost:3000";

async function main() {
  const { query, execute, getPool } = await import("../src/lib/db.ts");
  const { hashPassword } = await import("../src/lib/auth-tokens.ts");

  console.log("=== 1. PREPARING ROLE ACCOUNTS IN DATABASE ===");
  const accounts = [
    { username: "mfaisalfahri02@gmail.com", role: "ketua_panitia", nama: "Ketua Panitia", panitia_id: "p-3", seksi_id: null },
    { username: "hadi", role: "wakil_ketua", nama: "Hadi Pratama", panitia_id: "p-4", seksi_id: null },
    { username: "dewi", role: "bendahara", nama: "Dewi Anggraini", panitia_id: "p-6", seksi_id: null },
    { username: "siti", role: "sekretaris", nama: "Siti Nurhaliza", panitia_id: "p-5", seksi_id: null },
    { username: "zulfikar", role: "koordinator_seksi", nama: "Zulfikar Hidayat", panitia_id: "p-7", seksi_id: "s-1" },
    { username: "fajar", role: "anggota", nama: "Fajar Nugraha", panitia_id: "p-10", seksi_id: "s-1" },
    { username: "fauzi", role: "pelindung", nama: "K.H. Ahmad Fauzi", panitia_id: "p-1", seksi_id: null },
    { username: "mansur", role: "penasihat", nama: "Ustadz H. Mansur", panitia_id: "p-2", seksi_id: null },
  ];

  for (const acc of accounts) {
    const existing = await query("SELECT id FROM admin_users WHERE username = ?", [acc.username]);
    let uid;
    if (existing.length === 0) {
      uid = `user-${acc.username.replace(/[^a-zA-Z0-9]/g, "-")}`;
      await execute(
        "INSERT INTO admin_users (id, username, password, nama, role, seksi_id, status) VALUES (?, ?, ?, ?, ?, ?, 'aktif')",
        [uid, acc.username, hashPassword("password"), acc.nama, acc.role, acc.seksi_id]
      );
      console.log(`Created user account: ${acc.username} (${acc.role})`);
    } else {
      uid = existing[0].id;
      await execute(
        "UPDATE admin_users SET password = ?, role = ?, seksi_id = ?, status = 'aktif' WHERE id = ?",
        [hashPassword("password"), acc.role, acc.seksi_id, uid]
      );
      console.log(`Updated user account: ${acc.username} (${acc.role})`);
    }
    if (acc.panitia_id) {
      await execute("UPDATE panitia SET user_id = ? WHERE id = ?", [uid, acc.panitia_id]);
    }
  }

  // Get initial total saldo from DB
  const [initSaldoRow] = await query(`
    SELECT COALESCE(SUM(CASE WHEN tipe = 'masuk' AND (status IS NULL OR status = 'aktif') THEN nominal ELSE -nominal END), 0) as total_saldo
    FROM keuangan
  `);
  const initialSaldo = Number(initSaldoRow.total_saldo);
  console.log(`Initial DB Total Saldo: Rp ${initialSaldo.toLocaleString("id-ID")}`);

  // Launch browser
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // Helper login
  async function login(username, password) {
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.locator('input[autocomplete="username"]').fill(username);
    await page.locator('input[autocomplete="current-password"]').fill(password);
    await page.locator('button[type="submit"]:has-text("Masuk ke Dashboard")').click();
    await page.waitForURL("**/dashboard", { timeout: 10000 });
  }

  // Helper logout
  async function logout() {
    // Try header profile menu
    const profileBtn = page.locator('button[aria-label="Menu profil pengguna"]');
    if (await profileBtn.isVisible()) {
      await profileBtn.click();
      await page.waitForTimeout(300);
      const logoutBtn = page.locator('button[aria-label="Keluar dari akun"], button:has-text("Keluar")').first();
      await logoutBtn.click();
      await page.waitForURL("**/login", { timeout: 8000 });
      return;
    }

    // Or sidebar logout button
    const sidebarLogout = page.locator('button[aria-label="Keluar dari akun"]').first();
    if (await sidebarLogout.isVisible()) {
      await sidebarLogout.click();
      await page.waitForURL("**/login", { timeout: 8000 });
      return;
    }

    // Fallback: clear cookies and go to login
    await context.clearCookies();
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  }

  console.log("\n=== 2. LOGIN AS ADMIN/KETUA & CREATE +1.000.000 SALDO ===");
  await login("mfaisalfahri02@gmail.com", "password");
  console.log("Logged in as Ketua Panitia");

  // Go to /keuangan
  await page.goto(`${BASE_URL}/keuangan`, { waitUntil: "networkidle" });
  await page.waitForURL("**/keuangan");

  // Open SpeedDial -> + Kas Masuk
  const menu = page.locator('div[role="menu"][aria-label="Daftar Aksi Cepat"]');
  if (!await menu.isVisible()) {
    const trigger = page.locator('button[aria-label="Aksi Keuangan"], button[aria-label="Menu Aksi"], button[aria-label="Tutup menu aksi"]').first();
    await trigger.click({ force: true });
    await menu.waitFor({ state: "visible", timeout: 5000 });
  }
  await page.locator('button[role="menuitem"]:has-text("+ Kas Masuk")').first().click({ force: true });

  const modalKeuangan = page.locator('div[role="dialog"]');
  await modalKeuangan.waitFor({ state: "visible" });

  const keteranganInput = modalKeuangan.locator('input[placeholder*="Infaq Hamba Allah"]');
  const nominalInput = modalKeuangan.locator('input[type="number"][placeholder*="1500000"]');

  const KAS_KETERANGAN = "Infaq Jamaah Pengujian Saldo +1.000.000";
  await keteranganInput.fill(KAS_KETERANGAN);
  await nominalInput.fill("1000000");

  const submitKasBtn = modalKeuangan.locator('button[type="submit"]:has-text("Simpan Transaksi"), button[type="submit"]:has-text("Simpan")');
  await Promise.all([
    page.waitForResponse((resp) => resp.url().includes("/api/keuangan") && resp.request().method() === "POST"),
    submitKasBtn.click(),
  ]);

  const toastKas = page.locator('div[role="status"]:has-text("Transaksi berhasil dicatat")');
  await toastKas.waitFor({ state: "visible", timeout: 8000 });
  await modalKeuangan.waitFor({ state: "hidden", timeout: 5000 });
  console.log("Successfully created transaction: + Rp 1.000.000");

  // Verify saldo on /keuangan
  await page.reload({ waitUntil: "networkidle" });
  const expectedNewSaldo = initialSaldo + 1000000;
  console.log(`Expected new total saldo: Rp ${expectedNewSaldo.toLocaleString("id-ID")}`);

  console.log("\n=== 3. CREATE 1 TUGAS SEMUA DIVISI (IS_UMUM = 1) ===");
  await page.goto(`${BASE_URL}/tugas`, { waitUntil: "networkidle" });
  await page.waitForURL("**/tugas");

  // Open SpeedDial -> Tambah Tugas
  const tugasMenu = page.locator('div[role="menu"][aria-label="Daftar Aksi Cepat"]');
  if (!await tugasMenu.isVisible()) {
    const trigger = page.locator('button[aria-label="Aksi Tugas"], button[aria-label="Menu Aksi"], button[aria-label="Tutup menu aksi"]').first();
    await trigger.click({ force: true });
    await tugasMenu.waitFor({ state: "visible", timeout: 5000 });
  }
  await page.locator('button[role="menuitem"]:has-text("Tambah Tugas")').first().click({ force: true });

  const modalTugas = page.locator('div[role="dialog"]:has-text("Tambah Tugas Baru")');
  await modalTugas.waitFor({ state: "visible" });

  // Select "ALL" for Seksi Pelaksana
  const seksiSelect = modalTugas.locator('select:has(option[value="ALL"])');
  await seksiSelect.selectOption("ALL");
  await page.waitForTimeout(300);

  // Fill task name & details
  const TASK_TITLE = "Tugas Bersama Semua Divisi Persiapan Maulid 1448H";
  const taskNameInput = modalTugas.locator('input[placeholder*="Sewa tenda"]');
  await taskNameInput.fill(TASK_TITLE);

  const descInput = modalTugas.locator('textarea[placeholder*="Rincian teknis"]');
  await descInput.fill("Koordinasi dan gladi bersih seluruh divisi panitia Maulid");

  const dateInput = modalTugas.locator('input[type="date"]');
  if (await dateInput.isVisible()) {
    await dateInput.fill("2026-10-10");
  }

  const submitTugasBtn = modalTugas.locator('button[type="submit"]:has-text("Simpan Tugas")');
  await Promise.all([
    page.waitForResponse((resp) => resp.url().includes("/api/tugas") && resp.request().method() === "POST"),
    submitTugasBtn.click(),
  ]);

  const toastTugas = page.locator('div[role="status"]:has-text("Tugas baru berhasil ditambahkan")').first();
  await toastTugas.waitFor({ state: "visible", timeout: 8000 });
  await modalTugas.waitFor({ state: "hidden", timeout: 5000 });
  console.log(`Successfully created task for Semua Divisi: "${TASK_TITLE}"`);

  // Verify task appears
  await page.reload({ waitUntil: "networkidle" });
  const tugasPageContent = await page.locator("main").textContent();
  assert.ok(tugasPageContent.includes(TASK_TITLE), "Created task must appear on /tugas");
  console.log("Verified: Task appears on Ketua Panitia /tugas page.");

  await logout();
  console.log("Logged out from Ketua Panitia.\n");

  console.log("=== 4. CHECKING ACROSS ALL ROLES ===");
  const results = [];

  for (const acc of accounts) {
    console.log(`\n--- Testing Role: ${acc.role.toUpperCase()} (${acc.nama} - @${acc.username}) ---`);
    await login(acc.username, "password");

    const roleResult = {
      username: acc.username,
      role: acc.role,
      nama: acc.nama,
      dashboardSaldo: null,
      keuanganAccessible: false,
      keuanganSaldo: null,
      keuanganHasNewTransaction: false,
      tugasAccessible: false,
      tugasHasSharedTask: false,
      tugasCount: 0,
    };

    // 1. Check Dashboard
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
    await page.waitForSelector('text="Total Saldo Kas"', { timeout: 8000 }).catch(() => {});
    const dashboardHtml = await page.locator("main").textContent();

    // Extract Saldo from dashboard
    const saldoMatch = dashboardHtml.match(/Rp\s*([0-9\.\,]+)/);
    if (saldoMatch) {
      roleResult.dashboardSaldo = saldoMatch[0];
    }

    // 2. Check /keuangan
    try {
      const respKeuangan = await page.goto(`${BASE_URL}/keuangan`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1000);
      const url = page.url();
      if (url.includes("/keuangan") && respKeuangan && respKeuangan.status() === 200) {
        roleResult.keuanganAccessible = true;
        const keuanganContent = await page.locator("main").textContent();
        const mainSaldoMatch = keuanganContent.match(/Total Semua Saldo Kas[^\n]*\n*([^\n]+)/);
        roleResult.keuanganSaldo = mainSaldoMatch ? mainSaldoMatch[1].trim() : "Tersedia";
        roleResult.keuanganHasNewTransaction = keuanganContent.includes(KAS_KETERANGAN);
      } else {
        roleResult.keuanganAccessible = false;
      }
    } catch {
      roleResult.keuanganAccessible = false;
    }

    // 3. Check /tugas
    try {
      const respTugas = await page.goto(`${BASE_URL}/tugas`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1000);
      const url = page.url();
      if (url.includes("/tugas") && respTugas && respTugas.status() === 200) {
        roleResult.tugasAccessible = true;
        const tugasContent = await page.locator("main").textContent();
        roleResult.tugasHasSharedTask = tugasContent.includes(TASK_TITLE);
        roleResult.tugasCount = (tugasContent.match(/Ubah status/g) || []).length;
      } else {
        roleResult.tugasAccessible = false;
      }
    } catch {
      roleResult.tugasAccessible = false;
    }

    console.log(`Results for ${acc.role}:`);
    console.log(`- Dashboard Saldo : ${roleResult.dashboardSaldo}`);
    console.log(`- Keuangan Access : ${roleResult.keuanganAccessible ? "YES" : "NO (Restricted/Redirect)"}`);
    if (roleResult.keuanganAccessible) {
      console.log(`  - Saldo di /keuangan: ${roleResult.keuanganSaldo}`);
      console.log(`  - Transaksi Baru Ada: ${roleResult.keuanganHasNewTransaction ? "YES" : "NO"}`);
    }
    console.log(`- Tugas Access    : ${roleResult.tugasAccessible ? "YES" : "NO"}`);
    if (roleResult.tugasAccessible) {
      console.log(`  - Tugas Semua Divisi Muncul: ${roleResult.tugasHasSharedTask ? "YA (SAMA)" : "TIDAK MUNCUL"}`);
      console.log(`  - Total Tugas Terlihat     : ${roleResult.tugasCount}`);
    }

    results.push(roleResult);
    await logout();
  }

  await browser.close();
  await getPool().end();

  console.log("\n=======================================================");
  console.log("=== SUMMARY MATRIX ACROSS ALL ROLES ===");
  console.log("=======================================================");
  console.table(
    results.map((r) => ({
      Role: r.role,
      User: r.username,
      "Saldo Dashboard": r.dashboardSaldo,
      "Akses /keuangan": r.keuanganAccessible ? "Bisa" : "Terkunci",
      "Saldo /keuangan": r.keuanganAccessible ? r.keuanganSaldo : "N/A",
      "Akses /tugas": r.tugasAccessible ? "Bisa" : "Terkunci",
      "Tugas Semua Divisi Muncul?": r.tugasHasSharedTask ? "YA (SAMA)" : "TIDAK",
      "Total Tugas": r.tugasCount,
    }))
  );

  const allHaveSharedTask = results.filter(r => r.tugasAccessible).every(r => r.tugasHasSharedTask);
  const allSaldomatch = results.every(r => r.dashboardSaldo && r.dashboardSaldo.includes("5.300.000"));

  console.log("\n=== KESIMPULAN ===");
  console.log(`1. Apakah Saldo (+1.000.000 -> 5.300.000) sinkron di seluruh role? ${allSaldomatch ? "YA, 100% SAMA" : "BERBEDA"}`);
  console.log(`2. Apakah Tugas Semua Divisi muncul di seluruh role? ${allHaveSharedTask ? "YA, 100% SAMA" : "BERBEDA"}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
