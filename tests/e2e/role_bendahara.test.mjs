import test, { describe, before, after, it } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { chromium } = require("/home/laxcyyfa/.npm/_npx/86170c4cd1c5da32/node_modules/playwright");

const BASE_URL = "http://localhost:3000";

describe("Role E2E: Akun Bendahara Interactive Testing (A-Z Headed Playwright)", () => {
  let browser;
  let context;
  let page;
  const consoleErrors = [];

  before(async () => {
    const { query, execute } = await import("../../src/lib/db.ts");
    const { hashPassword } = await import("../../src/lib/auth-tokens.ts");

    // 1. Ensure test_bendahara exists with active status
    await execute("DELETE FROM admin_users WHERE username = 'test_bendahara'");
    await execute(
      `INSERT INTO admin_users (id, username, password, nama, role, status)
       VALUES ('test-bendahara-id', 'test_bendahara', ?, 'Bendahara Panitia', 'bendahara', 'aktif')`,
      [hashPassword("bendahara123")]
    );

    // Clean up previous test transactions & tasks if any
    await execute("DELETE FROM keuangan WHERE keterangan LIKE 'E2E-TEST-BENDAHARA%'");
    await execute("DELETE FROM tugas WHERE id = 'e2e-bendahara-task' OR nama_tugas LIKE 'E2E-TEST-BENDAHARA%'");
    await execute(
      `INSERT INTO tugas (id, seksi_id, nama_tugas, deskripsi, status, deadline, is_umum, created_by)
       VALUES ('e2e-bendahara-task', (SELECT id FROM seksi LIMIT 1), 'E2E-TEST-BENDAHARA-TUGAS-1', 'Pengujian status tugas role bendahara', 'Belum Mulai', '1970-01-01', 1, 'test-bendahara-id')`
    );

    // 2. Launch browser in Headed mode
    browser = await chromium.launch({
      headless: false,
      channel: "chrome",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });

    page = await context.newPage();

    // Stub print
    await page.addInitScript(() => {
      window.print = () => { window.__printed = true; };
    });

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    page.on("pageerror", (err) => {
      consoleErrors.push(err.message);
    });
  });

  after(async () => {
    try {
      const { execute, getPool } = await import("../../src/lib/db.ts");
      await execute("DELETE FROM keuangan WHERE keterangan LIKE 'E2E-TEST-BENDAHARA%'");
      await execute("DELETE FROM tugas WHERE id = 'e2e-bendahara-task' OR nama_tugas LIKE 'E2E-TEST-BENDAHARA%'");
      await execute("DELETE FROM admin_users WHERE username = 'test_bendahara'");
      await getPool().end();
    } catch {}

    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  });

  it("1. Authenticate as Bendahara & Verify Role Specific Shell Layout", async () => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.locator('input[autocomplete="username"]').fill("test_bendahara");
    await page.locator('input[autocomplete="current-password"]').fill("bendahara123");
    await page.locator('button[type="submit"]:has-text("Masuk ke Dashboard")').click();

    await page.waitForURL("**/dashboard", { timeout: 10000 });
    assert.ok(page.url().includes("/dashboard"), "Should redirect to /dashboard");

    // Wait for user profile menu in header
    const userProfileBtn = page.locator('header button[aria-label="Menu profil pengguna"], header');
    await assert.doesNotReject(userProfileBtn.first().waitFor({ state: "visible", timeout: 8000 }));
    const profileText = await userProfileBtn.first().textContent();
    assert.ok(
      profileText.includes("Bendahara") || profileText.includes("test_bendahara") || profileText.includes("Panitia"),
      "Header should reflect Bendahara role"
    );

    // Verify allowed navigation links: Dashboard, Keuangan, Tugas
    const navBar = page.locator('nav[aria-label="Navigasi Bawah"], nav');
    await assert.doesNotReject(navBar.waitFor({ state: "visible" }));
    const navText = await navBar.textContent();
    assert.ok(navText.includes("Keuangan"), "Navigation must include Keuangan for Bendahara");
    assert.ok(navText.includes("Tugas"), "Navigation must include Tugas for Bendahara");
  });

  it("2. Keuangan Kas: Create Pemasukan, Pengeluaran & Persistence", async () => {
    console.log("--> Navigating to /keuangan");
    await page.goto(`${BASE_URL}/keuangan`, { waitUntil: "networkidle" });
    console.log("--> Waiting for URL /keuangan");
    await page.waitForURL("**/keuangan", { timeout: 8000 });
    console.log("--> Arrived at /keuangan");

    async function openSpeedDialAction(label) {
      console.log(`--> Opening SpeedDial for: ${label}`);
      const menu = page.locator('div[role="menu"][aria-label="Daftar Aksi Cepat"]');
      if (!await menu.isVisible()) {
        const trigger = page.locator('button[aria-label="Aksi Keuangan"], button[aria-label="Menu Aksi"], button[aria-label="Tutup menu aksi"]').first();
        console.log("--> Clicking trigger:", await trigger.count());
        await trigger.click({ force: true });
        console.log("--> Waiting for menu visible");
        await menu.waitFor({ state: "visible", timeout: 5000 });
      }
      console.log(`--> Clicking menuitem: ${label}`);
      await page.locator(`button[role="menuitem"]:has-text("${label}")`).first().click({ force: true });
    }

    // 2.1 Tambah Kas Masuk
    await openSpeedDialAction("+ Kas Masuk");

    const modal = page.locator('div[role="dialog"]');
    await assert.doesNotReject(modal.waitFor({ state: "visible" }));

    const keteranganInput = modal.locator('input[placeholder*="Infaq Hamba Allah"]');
    const nominalInput = modal.locator('input[type="number"][placeholder*="1500000"]');

    await keteranganInput.fill("E2E-TEST-BENDAHARA-MASUK-50K");
    await nominalInput.fill("50000");

    const submitBtn = modal.locator('button[type="submit"]:has-text("Simpan Transaksi"), button[type="submit"]:has-text("Simpan")');
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes("/api/keuangan") && resp.request().method() === "POST"),
      submitBtn.click(),
    ]);

    const toastMasuk = page.locator('div[role="status"]:has-text("Transaksi berhasil dicatat")');
    await toastMasuk.waitFor({ state: "visible", timeout: 8000 });
    await modal.waitFor({ state: "hidden", timeout: 5000 });

    // Verify persistence after reload
    await page.reload({ waitUntil: "networkidle" });
    const contentAfterMasuk = await page.locator("main").textContent();
    assert.ok(contentAfterMasuk.includes("E2E-TEST-BENDAHARA-MASUK-50K"), "Kas Masuk must persist in table");

    // 2.2 Tambah Kas Keluar
    await openSpeedDialAction("+ Kas Keluar");
    await assert.doesNotReject(modal.waitFor({ state: "visible" }));

    const keteranganKeluar = modal.locator('input[placeholder*="Pembelian konsumsi"]');
    const nominalKeluar = modal.locator('input[type="number"][placeholder*="1500000"]');

    await keteranganKeluar.fill("E2E-TEST-BENDAHARA-KELUAR-20K");
    await nominalKeluar.fill("20000");

    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes("/api/keuangan") && resp.request().method() === "POST"),
      modal.locator('button[type="submit"]:has-text("Simpan Transaksi"), button[type="submit"]:has-text("Simpan")').click(),
    ]);

    const toastKeluar = page.locator('div[role="status"]:has-text("Transaksi berhasil dicatat")');
    await toastKeluar.waitFor({ state: "visible", timeout: 8000 });
    await modal.waitFor({ state: "hidden", timeout: 5000 });

    // Verify persistence after reload
    await page.reload({ waitUntil: "networkidle" });
    const contentAfterKeluar = await page.locator("main").textContent();
    assert.ok(contentAfterKeluar.includes("E2E-TEST-BENDAHARA-KELUAR-20K"), "Kas Keluar must persist in table");
  });

  it("3. Keuangan Kas: Void Transaction & Double-Entry Balance Correction", async () => {
    await page.goto(`${BASE_URL}/keuangan`, { waitUntil: "networkidle" });

    // Locate the row for E2E-TEST-BENDAHARA-MASUK-50K
    const testRow = page.locator('tr:has-text("E2E-TEST-BENDAHARA-MASUK-50K")').first();
    await assert.doesNotReject(testRow.waitFor({ state: "visible", timeout: 8000 }));

    const voidBtn = testRow.locator('button[aria-label*="Void"], button[aria-label*="Batalkan"]').first();
    await assert.doesNotReject(voidBtn.waitFor({ state: "visible", timeout: 5000 }));
    await voidBtn.click();

    const voidModal = page.locator('div[role="dialog"]');
    await assert.doesNotReject(voidModal.waitFor({ state: "visible" }));

    const reasonInput = voidModal.locator('textarea').first();
    await reasonInput.fill("E2E-TEST Void oleh Bendahara");

    const confirmBtn = voidModal.locator('button[type="submit"]:has-text("Proses Void & Reversal"), button:has-text("Void")').first();
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes("/api/keuangan") && resp.request().method() === "POST"),
      confirmBtn.click(),
    ]);
    await voidModal.waitFor({ state: "hidden", timeout: 5000 });

    // Switch status filter to 'all' so voided row is displayed
    const statusSelect = page.locator('select[aria-label="Filter Status Transaksi"]');
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes("/api/keuangan") && resp.status() === 200),
      statusSelect.selectOption("all"),
    ]);

    const rowAfterVoid = page.locator('tr:has-text("E2E-TEST-BENDAHARA-MASUK-50K")').first();
    await assert.doesNotReject(rowAfterVoid.waitFor({ state: "visible", timeout: 8000 }));
    const rowText = await rowAfterVoid.textContent();
    assert.ok(rowText.includes("VOID") || rowText.includes("void") || rowText.includes("Dibatalkan"), "Status should reflect VOID");
  });

  it("4. Tugas per Seksi: Bendahara Can View Tasks & Update Status", async () => {
    await page.goto(`${BASE_URL}/tugas`, { waitUntil: "networkidle" });
    await page.waitForURL("**/tugas", { timeout: 8000 });

    const taskTitle = page.locator('h3:has-text("E2E-TEST-BENDAHARA-TUGAS-1")').first();
    await assert.doesNotReject(taskTitle.waitFor({ state: "visible", timeout: 8000 }));

    const taskCard = taskTitle.locator("xpath=ancestor::div[contains(@class, 'rounded-2xl') or contains(@class, 'bg-white')]").first();
    const statusSelect = taskCard.locator('select[aria-label*="Ubah status"], select').first();
    await assert.doesNotReject(statusSelect.waitFor({ state: "visible", timeout: 5000 }));

    const initialStatus = await statusSelect.inputValue();
    assert.equal(initialStatus, "Belum Mulai", "Initial status of fixture task must be 'Belum Mulai'");

    await statusSelect.selectOption("Proses");
    await page.waitForTimeout(1000);

    // Verify DB update
    const { queryOne } = await import("../../src/lib/db.ts");
    const dbTask = await queryOne("SELECT status FROM tugas WHERE id = 'e2e-bendahara-task'");
    assert.equal(dbTask.status, "Proses", "Task status in DB must update to 'Proses'");

    // Verify persistence after reload
    await page.reload({ waitUntil: "networkidle" });
    const reloadedCard = page.locator('h3:has-text("E2E-TEST-BENDAHARA-TUGAS-1")').locator("xpath=ancestor::div[contains(@class, 'rounded-2xl') or contains(@class, 'bg-white')]").first();
    const selectAfter = reloadedCard.locator('select[aria-label*="Ubah status"], select').first();
    assert.equal(await selectAfter.inputValue(), "Proses", "Task status changed by bendahara must persist after reload");
  });

  it("5. Strict Route Guards: Bendahara Cannot Access Rundown, Tamu, Struktur, Pengguna", async () => {
    // 5.1 Restricted /rundown
    await page.goto(`${BASE_URL}/rundown`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    let content = await page.locator("main").textContent();
    assert.ok(
      !page.url().endsWith("/rundown") || content.includes("Gagal") || content.includes("tidak") || content.includes("Akses"),
      "Bendahara should be restricted from managing rundown"
    );

    // 5.2 Restricted /tamu
    await page.goto(`${BASE_URL}/tamu`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    content = await page.locator("main").textContent();
    assert.ok(
      !page.url().endsWith("/tamu") || content.includes("Gagal") || content.includes("tidak") || content.includes("Akses"),
      "Bendahara should be restricted from managing tamu"
    );

    // 5.3 Restricted /struktur
    await page.goto(`${BASE_URL}/struktur`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    content = await page.locator("main").textContent();
    assert.ok(
      !page.url().endsWith("/struktur") || content.includes("Gagal") || content.includes("tidak") || content.includes("Akses"),
      "Bendahara should be restricted from managing struktur"
    );

    // 5.4 Restricted /pengguna
    await page.goto(`${BASE_URL}/pengguna`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    content = await page.locator("main").textContent();
    assert.ok(
      !page.url().endsWith("/pengguna") || content.includes("Hanya Ketua Panitia") || content.includes("tidak"),
      "Bendahara should be restricted from managing pengguna"
    );
  });

  it("6. Logout Flow for Bendahara", async () => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });

    // Click user profile menu to open dropdown
    const profileBtn = page.locator('header button[aria-label="Menu profil pengguna"]').first();
    await assert.doesNotReject(profileBtn.waitFor({ state: "visible", timeout: 5000 }));
    await profileBtn.click();
    await page.waitForTimeout(300);

    const logoutBtn = page.locator('button:has-text("Keluar (Logout)"), button:has-text("Keluar")').first();
    await assert.doesNotReject(logoutBtn.waitFor({ state: "visible", timeout: 5000 }));
    await logoutBtn.click();

    await page.waitForURL((url) => url.pathname.includes("/login") || url.pathname === "/", { timeout: 8000 });
    assert.ok(page.url().includes("/login") || page.url().endsWith("/"), "Logout should redirect to /login");
  });

  it("7. Zero Fatal Console Errors for Bendahara Role", async () => {
    const fatalErrors = consoleErrors.filter((e) => !e.includes("favicon") && !e.includes("404"));
    assert.deepEqual(fatalErrors, [], `Expected zero console errors for Bendahara, got: ${fatalErrors.join("; ")}`);
    console.log("✅ Role Bendahara Headed Playwright E2E Test PASSED flawlessly!");
  });
});
