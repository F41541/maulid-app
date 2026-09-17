import test, { describe, before, after, it } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { chromium } = require("/home/laxcyyfa/.npm/_npx/86170c4cd1c5da32/node_modules/playwright");

const BASE_URL = "http://localhost:3000";

describe("Role E2E: Akun Sekretaris Full Journey (All Pages, Features & Route Guards)", () => {
  let browser;
  let context;
  let page;
  const consoleErrors = [];

  before(async () => {
    const { execute } = await import("../../src/lib/db.ts");
    const { hashPassword } = await import("../../src/lib/auth-tokens.ts");

    // 1. Ensure test_sekretaris exists with active status
    await execute("DELETE FROM admin_users WHERE username = 'test_sekretaris'");
    await execute(
      `INSERT INTO admin_users (id, username, password, nama, role, status)
       VALUES ('test-sekretaris-id', 'test_sekretaris', ?, 'Sekretaris Panitia', 'sekretaris', 'aktif')`,
      [hashPassword("sekretaris123")]
    );

    // Clean up previous test data
    await execute("DELETE FROM tamu WHERE nama LIKE 'E2E-TEST-SEKRETARIS%'");
    await execute("DELETE FROM rundown WHERE nama_kegiatan LIKE 'E2E-TEST-SEKRETARIS%'");
    await execute("DELETE FROM tugas WHERE id = 'e2e-sekretaris-task' OR nama_tugas LIKE 'E2E-TEST-SEKRETARIS%'");

    // Create fixture task for Sekretaris
    await execute(
      `INSERT INTO tugas (id, seksi_id, nama_tugas, deskripsi, status, deadline, is_umum, created_by)
       VALUES ('e2e-sekretaris-task', (SELECT id FROM seksi LIMIT 1), 'E2E-TEST-SEKRETARIS-TUGAS-1', 'Pengujian tugas sekretaris', 'Belum Mulai', '1970-01-01', 1, 'test-sekretaris-id')`
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
      await execute("DELETE FROM tamu WHERE nama LIKE 'E2E-TEST-SEKRETARIS%'");
      await execute("DELETE FROM rundown WHERE nama_kegiatan LIKE 'E2E-TEST-SEKRETARIS%'");
      await execute("DELETE FROM tugas WHERE id = 'e2e-sekretaris-task' OR nama_tugas LIKE 'E2E-TEST-SEKRETARIS%'");
      await execute("DELETE FROM admin_users WHERE username = 'test_sekretaris'");
      await getPool().end();
    } catch {}

    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  });

  it("1. Authenticate as Sekretaris & Verify Bottom Bar Mode Navigation", async () => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.locator('input[autocomplete="username"]').fill("test_sekretaris");
    await page.locator('input[autocomplete="current-password"]').fill("sekretaris123");
    await page.locator('button[type="submit"]:has-text("Masuk ke Dashboard")').click();

    await page.waitForURL("**/dashboard", { timeout: 10000 });
    assert.ok(page.url().includes("/dashboard"), "Should redirect to /dashboard");

    // Verify role label in header profile menu
    const profileBtn = page.locator('header button[aria-label="Menu profil pengguna"]').first();
    await assert.doesNotReject(profileBtn.waitFor({ state: "visible", timeout: 8000 }));
    const profileText = await profileBtn.textContent();
    assert.ok(profileText.includes("Sekretaris"), `Header must display Sekretaris role, got: ${profileText}`);

    // Verify navigation links for Sekretaris: Dashboard, Tugas Saya, Rundown, Tamu
    const navBar = page.locator('nav[aria-label="Navigasi Bawah"]');
    await assert.doesNotReject(navBar.waitFor({ state: "visible", timeout: 5000 }));
    const navText = await navBar.textContent();
    assert.ok(navText.includes("Rundown"), "Navigation must include Rundown for Sekretaris");
    assert.ok(navText.includes("Tamu"), "Navigation must include Tamu for Sekretaris");
    assert.ok(navText.includes("Tugas"), "Navigation must include Tugas for Sekretaris");
    assert.ok(!navText.includes("Keuangan"), "Navigation must NOT include Keuangan for Sekretaris");
  });

  it("2. Tamu Undangan: Sekretaris Adds Guest, Changes Attendance & Verifies Persistence", async () => {
    await page.goto(`${BASE_URL}/tamu`, { waitUntil: "networkidle" });
    await page.waitForURL("**/tamu", { timeout: 8000 });

    // Open SpeedDial for Tamu
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

    await nameInput.fill("E2E-TEST-SEKRETARIS-TAMU-1");
    await addressInput.fill("Pondok Pesantren Al-Hikmah");

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
    assert.ok(tableText.includes("E2E-TEST-SEKRETARIS-TAMU-1"), "Created guest must persist in table");

    // 2.2 Quick Attendance Change (Belum Konfirmasi -> Hadir)
    const guestRow = page.locator('tr:has-text("E2E-TEST-SEKRETARIS-TAMU-1")').first();
    await assert.doesNotReject(guestRow.waitFor({ state: "visible", timeout: 5000 }));

    const statusSelect = guestRow.locator('select[aria-label*="kehadiran"], select').first();
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes("/api/tamu") && resp.request().method() === "POST"),
      statusSelect.selectOption("Hadir"),
    ]);
    await page.waitForTimeout(1000);

    // Verify persistence after reload
    await page.reload({ waitUntil: "networkidle" });
    const reloadedRow = page.locator('tr:has-text("E2E-TEST-SEKRETARIS-TAMU-1")').first();
    const reloadedSelect = reloadedRow.locator('select[aria-label*="kehadiran"], select').first();
    assert.equal(await reloadedSelect.inputValue(), "Hadir", "Attendance status must persist as 'Hadir'");
  });

  it("3. Rundown Acara: Sekretaris Adds Rundown Item & Verifies Persistence", async () => {
    await page.goto(`${BASE_URL}/rundown`, { waitUntil: "networkidle" });
    await page.waitForURL("**/rundown", { timeout: 8000 });

    // Open SpeedDial for Rundown
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
    await kegiatanInput.fill("E2E-TEST-SEKRETARIS-ACARA-1");

    // Fill TimeColonInput using explicit aria-labels
    const jamMulaiInput = modal.locator('input[aria-label="Jam Mulai"]').first();
    const menitMulaiInput = modal.locator('input[aria-label="Menit Mulai"]').first();
    await jamMulaiInput.fill("20");
    await menitMulaiInput.fill("00");

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
    assert.ok(mainText.includes("E2E-TEST-SEKRETARIS-ACARA-1"), "Created rundown item must persist");
  });

  it("4. Tugas per Seksi: Sekretaris Views Tasks & Updates Status", async () => {
    await page.goto(`${BASE_URL}/tugas`, { waitUntil: "networkidle" });
    await page.waitForURL("**/tugas", { timeout: 8000 });

    const taskTitle = page.locator('h3:has-text("E2E-TEST-SEKRETARIS-TUGAS-1")').first();
    await assert.doesNotReject(taskTitle.waitFor({ state: "visible", timeout: 8000 }));

    const taskCard = taskTitle.locator("xpath=ancestor::div[contains(@class, 'rounded-2xl') or contains(@class, 'bg-white')]").first();
    const statusSelect = taskCard.locator('select[aria-label*="Ubah status"], select').first();
    await assert.doesNotReject(statusSelect.waitFor({ state: "visible", timeout: 5000 }));

    const initialStatus = await statusSelect.inputValue();
    assert.equal(initialStatus, "Belum Mulai", "Initial status must be 'Belum Mulai'");

    await statusSelect.selectOption("Proses");
    await page.waitForTimeout(1000);

    // Verify DB record
    const { queryOne } = await import("../../src/lib/db.ts");
    const dbTask = await queryOne("SELECT status FROM tugas WHERE id = 'e2e-sekretaris-task'");
    assert.equal(dbTask.status, "Proses", "Task status in DB must update to 'Proses'");

    // Verify reload persistence
    await page.reload({ waitUntil: "networkidle" });
    const reloadedCard = page.locator('h3:has-text("E2E-TEST-SEKRETARIS-TUGAS-1")').locator("xpath=ancestor::div[contains(@class, 'rounded-2xl') or contains(@class, 'bg-white')]").first();
    const selectAfter = reloadedCard.locator('select[aria-label*="Ubah status"], select').first();
    assert.equal(await selectAfter.inputValue(), "Proses", "Task status must persist as 'Proses'");
  });

  it("5. Strict Route Guards: Sekretaris Cannot Access Keuangan, Struktur, Pengguna", async () => {
    // 5.1 Restricted /keuangan
    await page.goto(`${BASE_URL}/keuangan`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    let mainContent = await page.locator("main").textContent();
    assert.ok(
      !page.url().endsWith("/keuangan") || mainContent.includes("tidak memiliki akses") || mainContent.includes("Gagal") || mainContent.includes("Akses"),
      "Sekretaris must be restricted from accessing /keuangan"
    );

    // 5.2 Restricted /struktur
    await page.goto(`${BASE_URL}/struktur`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    mainContent = await page.locator("main").textContent();
    assert.ok(
      !page.url().endsWith("/struktur") || mainContent.includes("tidak memiliki akses") || mainContent.includes("Gagal") || mainContent.includes("Akses"),
      "Sekretaris must be restricted from accessing /struktur"
    );

    // 5.3 Restricted /pengguna
    await page.goto(`${BASE_URL}/pengguna`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    mainContent = await page.locator("main").textContent();
    assert.ok(
      !page.url().endsWith("/pengguna") || mainContent.includes("Hanya Ketua Panitia") || mainContent.includes("tidak"),
      "Sekretaris must be restricted from accessing /pengguna"
    );
  });

  it("6. Profile Menu Interaction & Clean Logout Flow", async () => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });

    // Open user profile dropdown
    const profileBtn = page.locator('header button[aria-label="Menu profil pengguna"]').first();
    await assert.doesNotReject(profileBtn.waitFor({ state: "visible", timeout: 5000 }));
    await profileBtn.click();
    await page.waitForTimeout(300);

    // Click logout
    const logoutBtn = page.locator('button:has-text("Keluar (Logout)"), button:has-text("Keluar")').first();
    await assert.doesNotReject(logoutBtn.waitFor({ state: "visible", timeout: 5000 }));
    await logoutBtn.click();

    await page.waitForURL((url) => url.pathname.includes("/login") || url.pathname === "/", { timeout: 8000 });
    assert.ok(page.url().includes("/login") || page.url().endsWith("/"), "Logout should redirect to /login");

    // Verify session cookie cleared
    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name === "maulid_session");
    assert.equal(sessionCookie, undefined, "Session cookie must be cleared upon logout");
  });

  it("7. Zero Fatal Console Errors for Sekretaris Role", async () => {
    const fatalErrors = consoleErrors.filter((e) => !e.includes("favicon") && !e.includes("404"));
    assert.deepEqual(fatalErrors, [], `Expected zero console errors for Sekretaris, got: ${fatalErrors.join("; ")}`);
    console.log("✅ Role Sekretaris Headed Playwright E2E Test PASSED flawlessly!");
  });
});
