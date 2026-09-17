import test, { describe, before, after, it } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { chromium } = require("/home/laxcyyfa/.npm/_npx/86170c4cd1c5da32/node_modules/playwright");

const BASE_URL = "http://localhost:3000";

describe("Role E2E: Akun Koordinator Seksi Full Journey (All Pages, Features & Route Guards)", () => {
  let browser;
  let context;
  let page;
  const consoleErrors = [];

  before(async () => {
    const { execute } = await import("../../src/lib/db.ts");
    const { hashPassword } = await import("../../src/lib/auth-tokens.ts");

    // 1. Ensure test_koordinator exists with active status
    await execute("DELETE FROM admin_users WHERE username = 'test_koordinator'");
    await execute(
      `INSERT INTO admin_users (id, username, password, nama, role, status)
       VALUES ('test-koordinator-id', 'test_koordinator', ?, 'Koordinator Acara', 'koordinator_seksi', 'aktif')`,
      [hashPassword("koordinator123")]
    );

    // Clean up previous test task and insert fixture task for Koordinator
    await execute("DELETE FROM tugas WHERE id = 'e2e-koordinator-task' OR nama_tugas LIKE 'E2E-TEST-KOORDINATOR%'");
    await execute(
      `INSERT INTO tugas (id, seksi_id, nama_tugas, deskripsi, status, deadline, is_umum, created_by)
       VALUES ('e2e-koordinator-task', (SELECT id FROM seksi LIMIT 1), 'E2E-TEST-KOORDINATOR-TUGAS-1', 'Tugas koordinasi seksi acara', 'Belum Mulai', '1970-01-01', 1, 'test-koordinator-id')`
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
      await execute("DELETE FROM tugas WHERE id = 'e2e-koordinator-task' OR nama_tugas LIKE 'E2E-TEST-KOORDINATOR%'");
      await execute("DELETE FROM admin_users WHERE username = 'test_koordinator'");
      await getPool().end();
    } catch {}

    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  });

  it("1. Authenticate as Koordinator Seksi & Verify Bottom Bar Mode Navigation", async () => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.locator('input[autocomplete="username"]').fill("test_koordinator");
    await page.locator('input[autocomplete="current-password"]').fill("koordinator123");
    await page.locator('button[type="submit"]:has-text("Masuk ke Dashboard")').click();

    await page.waitForURL("**/dashboard", { timeout: 10000 });
    assert.ok(page.url().includes("/dashboard"), "Should redirect to /dashboard");

    // Verify role label in header profile menu
    const profileBtn = page.locator('header button[aria-label="Menu profil pengguna"]').first();
    await assert.doesNotReject(profileBtn.waitFor({ state: "visible", timeout: 8000 }));
    const profileText = await profileBtn.textContent();
    assert.ok(profileText.includes("Koordinator"), `Header must display Koordinator role/name, got: ${profileText}`);

    // Verify navigation links for Koordinator: only Dashboard and Tugas (Tugas Seksi)
    const navBar = page.locator('nav[aria-label="Navigasi Bawah"]');
    await assert.doesNotReject(navBar.waitFor({ state: "visible", timeout: 5000 }));
    const navText = await navBar.textContent();
    assert.ok(navText.includes("Dashboard") || navText.includes("Beranda"), "Navigation must include Dashboard");
    assert.ok(navText.includes("Tugas"), "Navigation must include Tugas");
    assert.ok(!navText.includes("Keuangan"), "Navigation must NOT include Keuangan for Koordinator");
    assert.ok(!navText.includes("Rundown"), "Navigation must NOT include Rundown for Koordinator");
    assert.ok(!navText.includes("Tamu"), "Navigation must NOT include Tamu for Koordinator");
    assert.ok(!navText.includes("Struktur"), "Navigation must NOT include Struktur for Koordinator");
    assert.ok(!navText.includes("Pengguna") && !navText.includes("Akun"), "Navigation must NOT include Pengguna for Koordinator");
  });

  it("2. Tugas per Seksi: Koordinator Seksi Views Tasks & Updates Status with DB Persistence", async () => {
    await page.goto(`${BASE_URL}/tugas`, { waitUntil: "networkidle" });
    await page.waitForURL("**/tugas", { timeout: 8000 });

    const taskTitle = page.locator('h3:has-text("E2E-TEST-KOORDINATOR-TUGAS-1")').first();
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
    const dbTask = await queryOne("SELECT status FROM tugas WHERE id = 'e2e-koordinator-task'");
    assert.equal(dbTask.status, "Proses", "Task status in DB must update to 'Proses'");

    // Verify reload persistence
    await page.reload({ waitUntil: "networkidle" });
    const reloadedCard = page.locator('h3:has-text("E2E-TEST-KOORDINATOR-TUGAS-1")').locator("xpath=ancestor::div[contains(@class, 'rounded-2xl') or contains(@class, 'bg-white')]").first();
    const selectAfter = reloadedCard.locator('select[aria-label*="Ubah status"], select').first();
    assert.equal(await selectAfter.inputValue(), "Proses", "Task status changed by koordinator must persist as 'Proses'");
  });

  it("3. Strict Route Guards: Koordinator Cannot Access Restricted Pages", async () => {
    // 3.1 Restricted /keuangan
    await page.goto(`${BASE_URL}/keuangan`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    let content = await page.locator("main").textContent();
    assert.ok(
      !page.url().endsWith("/keuangan") || content.includes("tidak memiliki akses") || content.includes("Gagal") || content.includes("Akses"),
      "Koordinator must be restricted from /keuangan"
    );

    // 3.2 Restricted /rundown
    await page.goto(`${BASE_URL}/rundown`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    content = await page.locator("main").textContent();
    assert.ok(
      !page.url().endsWith("/rundown") || content.includes("tidak memiliki akses") || content.includes("Gagal") || content.includes("Akses"),
      "Koordinator must be restricted from /rundown"
    );

    // 3.3 Restricted /tamu
    await page.goto(`${BASE_URL}/tamu`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    content = await page.locator("main").textContent();
    assert.ok(
      !page.url().endsWith("/tamu") || content.includes("tidak memiliki akses") || content.includes("Gagal") || content.includes("Akses"),
      "Koordinator must be restricted from /tamu"
    );

    // 3.4 Restricted /struktur
    await page.goto(`${BASE_URL}/struktur`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    content = await page.locator("main").textContent();
    assert.ok(
      !page.url().endsWith("/struktur") || content.includes("tidak memiliki akses") || content.includes("Gagal") || content.includes("Akses"),
      "Koordinator must be restricted from /struktur"
    );

    // 3.5 Restricted /pengguna
    await page.goto(`${BASE_URL}/pengguna`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    content = await page.locator("main").textContent();
    assert.ok(
      !page.url().endsWith("/pengguna") || content.includes("Hanya Ketua Panitia") || content.includes("tidak"),
      "Koordinator must be restricted from /pengguna"
    );
  });

  it("4. Profile Menu Interaction & Clean Logout Flow", async () => {
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

  it("5. Zero Fatal Console Errors for Koordinator Seksi Role", async () => {
    const fatalErrors = consoleErrors.filter((e) => !e.includes("favicon") && !e.includes("404"));
    assert.deepEqual(fatalErrors, [], `Expected zero console errors for Koordinator Seksi, got: ${fatalErrors.join("; ")}`);
    console.log("✅ Role Koordinator Seksi Headed Playwright E2E Test PASSED flawlessly!");
  });
});
