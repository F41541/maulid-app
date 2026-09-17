import test, { describe, before, after, it } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { chromium } = require("/home/laxcyyfa/.npm/_npx/86170c4cd1c5da32/node_modules/playwright");

const BASE_URL = "http://localhost:3000";

describe("Role E2E: Akun Wakil Ketua Full Journey (All Pages, Features & Route Guards)", () => {
  let browser;
  let context;
  let page;
  const consoleErrors = [];

  before(async () => {
    const { execute } = await import("../../src/lib/db.ts");
    const { hashPassword } = await import("../../src/lib/auth-tokens.ts");

    // 1. Ensure test_wakil exists with active status
    await execute("DELETE FROM admin_users WHERE username = 'test_wakil'");
    await execute(
      `INSERT INTO admin_users (id, username, password, nama, role, status)
       VALUES ('test-wakil-id', 'test_wakil', ?, 'Wakil Ketua Panitia', 'wakil_ketua', 'aktif')`,
      [hashPassword("wakil123")]
    );

    // Clean up previous test data
    await execute("DELETE FROM keuangan WHERE keterangan LIKE 'E2E-TEST-WAKIL%'");
    await execute("DELETE FROM tamu WHERE nama LIKE 'E2E-TEST-WAKIL%'");
    await execute("DELETE FROM rundown WHERE nama_kegiatan LIKE 'E2E-TEST-WAKIL%'");
    await execute("DELETE FROM tugas WHERE id = 'e2e-wakil-task' OR nama_tugas LIKE 'E2E-TEST-WAKIL%'");

    // Create fixture task for Wakil Ketua
    await execute(
      `INSERT INTO tugas (id, seksi_id, nama_tugas, deskripsi, status, deadline, is_umum, created_by)
       VALUES ('e2e-wakil-task', (SELECT id FROM seksi LIMIT 1), 'E2E-TEST-WAKIL-TUGAS-1', 'Pengujian tugas wakil ketua', 'Belum Mulai', '1970-01-01', 1, 'test-wakil-id')`
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
      await execute("DELETE FROM keuangan WHERE keterangan LIKE 'E2E-TEST-WAKIL%'");
      await execute("DELETE FROM tamu WHERE nama LIKE 'E2E-TEST-WAKIL%'");
      await execute("DELETE FROM rundown WHERE nama_kegiatan LIKE 'E2E-TEST-WAKIL%'");
      await execute("DELETE FROM tugas WHERE id = 'e2e-wakil-task' OR nama_tugas LIKE 'E2E-TEST-WAKIL%'");
      await execute("DELETE FROM admin_users WHERE username = 'test_wakil'");
      await getPool().end();
    } catch {}

    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  });

  it("1. Authenticate as Wakil Ketua & Verify Desktop Sidebar Navigation", async () => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.locator('input[autocomplete="username"]').fill("test_wakil");
    await page.locator('input[autocomplete="current-password"]').fill("wakil123");
    await page.locator('button[type="submit"]:has-text("Masuk ke Dashboard")').click();

    await page.waitForURL("**/dashboard", { timeout: 10000 });
    assert.ok(page.url().includes("/dashboard"), "Should redirect to /dashboard");

    // Wakil Ketua is a desktop sidebar role
    const sidebar = page.locator('aside').filter({ has: page.locator('nav[aria-label="Navigasi Sidebar"]') }).first();
    await assert.doesNotReject(sidebar.waitFor({ state: "visible", timeout: 8000 }));

    // Verify role label in bottom user card of sidebar
    const sidebarText = await sidebar.textContent();
    assert.ok(sidebarText.includes("Wakil Ketua"), `Sidebar must display Wakil Ketua role, got: ${sidebarText}`);

    // Verify allowed sidebar navigation items
    const navLinks = sidebar.locator('nav[aria-label="Navigasi Sidebar"]');
    const linksText = await navLinks.textContent();
    assert.ok(linksText.includes("Dashboard") || linksText.includes("Beranda"), "Sidebar must include Dashboard");
    assert.ok(linksText.includes("Struktur"), "Sidebar must include Struktur Organisasi");
    assert.ok(linksText.includes("Rundown"), "Sidebar must include Rundown Acara");
    assert.ok(linksText.includes("Tugas"), "Sidebar must include Tugas per Seksi");
    assert.ok(linksText.includes("Keuangan"), "Sidebar must include Keuangan Kas");
    assert.ok(linksText.includes("Tamu"), "Sidebar must include Tamu Undangan");
    assert.ok(!linksText.includes("Kelola Akun") && !linksText.includes("Pengguna"), "Sidebar must NOT include Kelola Akun for Wakil Ketua");
  });

  it("2. Struktur Organisasi: Wakil Ketua Views Org Chart & Hierarchy", async () => {
    await page.goto(`${BASE_URL}/struktur`, { waitUntil: "networkidle" });
    await page.waitForURL("**/struktur", { timeout: 8000 });

    const mainText = await page.locator("main").textContent();
    assert.ok(mainText.includes("Struktur") || mainText.includes("Panitia"), "Struktur page should display panitia organization");
  });

  it("3. Keuangan Kas: Wakil Ketua Adds Kas & Verifies Persistence", async () => {
    await page.goto(`${BASE_URL}/keuangan`, { waitUntil: "networkidle" });
    await page.waitForURL("**/keuangan", { timeout: 8000 });

    // Open SpeedDial or Add button
    const menu = page.locator('div[role="menu"][aria-label="Daftar Aksi Cepat"]');
    if (!await menu.isVisible()) {
      const trigger = page.locator('button[aria-label="Aksi Keuangan"], button[aria-label="Menu Aksi"], button[aria-label="Tutup menu aksi"]').first();
      await trigger.click({ force: true });
      await menu.waitFor({ state: "visible", timeout: 5000 });
    }

    await page.locator('button[role="menuitem"]:has-text("Kas Masuk")').first().click({ force: true });

    const modal = page.locator('div[role="dialog"]');
    await assert.doesNotReject(modal.waitFor({ state: "visible", timeout: 5000 }));

    const keteranganInput = modal.locator('input[placeholder*="Infaq Hamba Allah"]');
    const nominalInput = modal.locator('input[type="number"][placeholder*="1500000"], input[type="number"]');

    await keteranganInput.fill("E2E-TEST-WAKIL-KAS-1");
    await nominalInput.fill("450000");

    const submitBtn = modal.locator('button[type="submit"]:has-text("Simpan Transaksi"), button[type="submit"]:has-text("Simpan")');
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes("/api/keuangan") && resp.request().method() === "POST"),
      submitBtn.click(),
    ]);

    const toast = page.locator('div[role="status"]:has-text("Transaksi berhasil dicatat")');
    await toast.waitFor({ state: "visible", timeout: 8000 });
    await modal.waitFor({ state: "hidden", timeout: 5000 });

    // Verify persistence after reload
    await page.reload({ waitUntil: "networkidle" });
    const tableText = await page.locator("main").textContent();
    assert.ok(tableText.includes("E2E-TEST-WAKIL-KAS-1"), "Created transaction must persist in table");
  });

  it("4. Tamu Undangan: Wakil Ketua Adds Guest & Verifies Persistence", async () => {
    await page.goto(`${BASE_URL}/tamu`, { waitUntil: "networkidle" });
    await page.waitForURL("**/tamu", { timeout: 8000 });

    const menu = page.locator('div[role="menu"][aria-label="Daftar Aksi Cepat"]');
    if (!await menu.isVisible()) {
      const trigger = page.locator('button[aria-label="Aksi Tamu"], button[aria-label="Menu Aksi"], button[aria-label="Tutup menu aksi"]').first();
      await trigger.click({ force: true });
      await menu.waitFor({ state: "visible", timeout: 5000 });
    }
    await page.locator('button[role="menuitem"]:has-text("Tambah Tamu")').first().click({ force: true });

    const modal = page.locator('div[role="dialog"]');
    await assert.doesNotReject(modal.waitFor({ state: "visible", timeout: 5000 }));

    const nameInput = modal.locator('input[placeholder*="Habib Jindan"]').first();
    const addressInput = modal.locator('input[placeholder*="Ponpes Darul Ulum"]').first();

    await nameInput.fill("E2E-TEST-WAKIL-TAMU-1");
    await addressInput.fill("Pondok Pesantren Al-Falah");

    const submitBtn = modal.locator('button[type="submit"]:has-text("Simpan Tamu")');
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes("/api/tamu") && resp.request().method() === "POST"),
      submitBtn.click(),
    ]);

    const toast = page.locator('div[role="status"]:has-text("Tamu undangan ditambahkan")');
    await toast.waitFor({ state: "visible", timeout: 8000 });
    await modal.waitFor({ state: "hidden", timeout: 5000 });

    // Verify persistence after reload
    await page.reload({ waitUntil: "networkidle" });
    const tableText = await page.locator("main").textContent();
    assert.ok(tableText.includes("E2E-TEST-WAKIL-TAMU-1"), "Created guest must persist in table");
  });

  it("5. Rundown Acara: Wakil Ketua Adds Rundown Item & Verifies Persistence", async () => {
    await page.goto(`${BASE_URL}/rundown`, { waitUntil: "networkidle" });
    await page.waitForURL("**/rundown", { timeout: 8000 });

    const menu = page.locator('div[role="menu"][aria-label="Daftar Aksi Cepat"]');
    if (!await menu.isVisible()) {
      const trigger = page.locator('button[aria-label="Aksi Rundown"], button[aria-label="Menu Aksi"], button[aria-label="Tutup menu aksi"]').first();
      await trigger.click({ force: true });
      await menu.waitFor({ state: "visible", timeout: 5000 });
    }
    await page.locator('button[role="menuitem"]:has-text("Tambah Rangkaian Acara")').first().click({ force: true });

    const modal = page.locator('div[role="dialog"]');
    await assert.doesNotReject(modal.waitFor({ state: "visible", timeout: 5000 }));

    const kegiatanInput = modal.locator('input[placeholder*="Tausiyah"]').first();
    await kegiatanInput.fill("E2E-TEST-WAKIL-ACARA-1");

    const jamMulaiInput = modal.locator('input[aria-label="Jam Mulai"]').first();
    const menitMulaiInput = modal.locator('input[aria-label="Menit Mulai"]').first();
    await jamMulaiInput.fill("21");
    await menitMulaiInput.fill("30");

    const submitBtn = modal.locator('button[type="submit"]:has-text("Simpan Kegiatan")');
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes("/api/rundown") && resp.request().method() === "POST"),
      submitBtn.click(),
    ]);

    const toast = page.locator('div[role="status"]:has-text("Kegiatan berhasil ditambahkan")');
    await toast.first().waitFor({ state: "visible", timeout: 8000 });
    await modal.waitFor({ state: "hidden", timeout: 5000 });

    // Verify persistence after reload
    await page.reload({ waitUntil: "networkidle" });
    const mainText = await page.locator("main").textContent();
    assert.ok(mainText.includes("E2E-TEST-WAKIL-ACARA-1"), "Created rundown item must persist");
  });

  it("6. Tugas per Seksi: Wakil Ketua Views Tasks & Updates Status with DB Persistence", async () => {
    await page.goto(`${BASE_URL}/tugas`, { waitUntil: "networkidle" });
    await page.waitForURL("**/tugas", { timeout: 8000 });

    const taskTitle = page.locator('h3:has-text("E2E-TEST-WAKIL-TUGAS-1")').first();
    await assert.doesNotReject(taskTitle.waitFor({ state: "visible", timeout: 8000 }));

    const taskCard = taskTitle.locator("xpath=ancestor::div[contains(@class, 'rounded-2xl') or contains(@class, 'bg-white')]").first();
    const statusSelect = taskCard.locator('select[aria-label*="Ubah status"], select').first();
    await assert.doesNotReject(statusSelect.waitFor({ state: "visible", timeout: 5000 }));

    const initialStatus = await statusSelect.inputValue();
    assert.equal(initialStatus, "Belum Mulai", "Initial status of fixture task must be 'Belum Mulai'");

    // Update status to 'Proses'
    await statusSelect.selectOption("Proses");
    await page.waitForTimeout(1000);

    // Verify DB record
    const { queryOne } = await import("../../src/lib/db.ts");
    const dbTask = await queryOne("SELECT status FROM tugas WHERE id = 'e2e-wakil-task'");
    assert.equal(dbTask.status, "Proses", "Task status in DB must update to 'Proses'");

    // Verify reload persistence
    await page.reload({ waitUntil: "networkidle" });
    const reloadedCard = page.locator('h3:has-text("E2E-TEST-WAKIL-TUGAS-1")').locator("xpath=ancestor::div[contains(@class, 'rounded-2xl') or contains(@class, 'bg-white')]").first();
    const selectAfter = reloadedCard.locator('select[aria-label*="Ubah status"], select').first();
    assert.equal(await selectAfter.inputValue(), "Proses", "Task status changed by wakil ketua must persist as 'Proses'");
  });

  it("7. Kelola Pengguna: Wakil Ketua Can View Users on /pengguna Despite Hidden From Sidebar", async () => {
    await page.goto(`${BASE_URL}/pengguna`, { waitUntil: "networkidle" });
    await page.waitForURL("**/pengguna", { timeout: 8000 });
    const table = page.locator("table");
    await assert.doesNotReject(table.waitFor({ state: "visible", timeout: 8000 }));
    const tableText = await table.textContent();
    assert.ok(tableText.includes("Peran") || tableText.includes("Pengguna"), "User management table should be rendered for Wakil Ketua");
  });

  it("8. Sidebar User Menu & Clean Logout Flow", async () => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });

    // Wakil Ketua logs out via sidebar logout button
    const logoutBtn = page.locator('aside button[aria-label="Keluar dari akun"]').first();
    await assert.doesNotReject(logoutBtn.waitFor({ state: "visible", timeout: 5000 }));
    await logoutBtn.click();

    await page.waitForURL((url) => url.pathname.includes("/login") || url.pathname === "/", { timeout: 8000 });
    assert.ok(page.url().includes("/login") || page.url().endsWith("/"), "Logout should redirect to /login");

    // Verify session cookie cleared
    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name === "maulid_session");
    assert.equal(sessionCookie, undefined, "Session cookie must be cleared upon logout");
  });

  it("9. Zero Fatal Console Errors for Wakil Ketua Role", async () => {
    // Filter out expected 403 status code when accessing forbidden /pengguna
    const fatalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("403") && !e.includes("401")
    );
    assert.deepEqual(fatalErrors, [], `Expected zero console errors for Wakil Ketua, got: ${fatalErrors.join("; ")}`);
    console.log("✅ Role Wakil Ketua Headed Playwright E2E Test PASSED flawlessly!");
  });
});
