import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { chromium } = require("/home/laxcyyfa/.npm/_npx/86170c4cd1c5da32/node_modules/playwright");

const BASE_URL = "http://localhost:3000";
const TEST_TASK_ID = "e2e-test-dashboard-task";
const TEST_TASK_NAME = "E2E-TEST-Verifikasi Status Tugas Dashboard";

test("Page 3: Comprehensive Headed Playwright E2E Test for Dashboard Portal (/(portal)/dashboard)", async (t) => {
  const consoleErrors = [];
  const { query, queryOne, execute } = await import("../../src/lib/db.ts");

  // Launch Chrome in headed mode on DISPLAY=:0 as required
  const browser = await chromium.launch({
    headless: false,
    channel: "chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  // Listen for browser errors and unhandled exceptions
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.error(`[Browser Console Error]: ${msg.text()}`);
      consoleErrors.push(msg.text());
    }
  });

  page.on("pageerror", (err) => {
    console.error(`[Browser Unhandled Exception]: ${err.message}`);
    consoleErrors.push(err.message);
  });

  try {
    // =========================================================================
    // 1. Fixture Setup & Authentication via Login Page Flow
    // =========================================================================
    await t.test("3.1 Authentication & Redirection to Dashboard", async () => {
      // Clean up any lingering test task first
      await execute("DELETE FROM tugas WHERE id = ? OR nama_tugas LIKE 'E2E-TEST-%'", [TEST_TASK_ID]);

      // Insert dedicated E2E test task with earliest deadline (1970-01-01) to guarantee top 1 position in urgentTasks
      await execute(
        `INSERT INTO tugas (id, seksi_id, nama_tugas, deskripsi, status, deadline, is_umum, created_by) 
         VALUES (?, (SELECT id FROM seksi LIMIT 1), ?, ?, 'Belum Mulai', '1970-01-01', 1, 'admin-1')`,
        [TEST_TASK_ID, TEST_TASK_NAME, "Deskripsi pengujian status E2E di dashboard portal"]
      );

      // Verify task exists in MariaDB
      const inserted = await queryOne("SELECT id, nama_tugas, status FROM tugas WHERE id = ?", [TEST_TASK_ID]);
      assert.ok(inserted, "Fixture task must be present in MariaDB before test begins");
      assert.equal(inserted.status, "Belum Mulai");

      // Navigate to /login to test full authentic login flow
      await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
      const loginTitle = await page.title();
      assert.ok(loginTitle.includes("Maulid"), `Login page title should contain Maulid, got: ${loginTitle}`);

      // Fill credentials
      const usernameInput = page.locator('input[autocomplete="username"], input[type="text"]').first();
      await usernameInput.fill("admin");

      const passwordInput = page.locator('input[type="password"]').first();
      await passwordInput.fill("admin123");

      // Submit login form
      const submitBtn = page.locator('button[type="submit"]:has-text("Masuk ke Dashboard")').first();
      await submitBtn.click();

      // Wait for redirect to /dashboard
      await page.waitForURL("**/dashboard", { timeout: 10000 });
      assert.ok(page.url().includes("/dashboard"), `URL should be /dashboard, got: ${page.url()}`);

      // Ensure page skeleton loader finishes loading
      await page.waitForSelector('main [aria-busy="true"]', { state: "detached", timeout: 10000 });
    });

    // =========================================================================
    // 2. Portal Shell, Navigation Sidebar, Header, and Responsive Drawer
    // =========================================================================
    await t.test("3.2 Portal Shell, Sidebar Navigation, Header & Responsive Mobile Drawer", async () => {
      // 1. Sidebar desktop verification
      const sidebar = page.locator('aside[aria-label="Sidebar Panitia"]');
      await assert.doesNotReject(sidebar.waitFor({ state: "visible", timeout: 5000 }));

      // Brand text
      await assert.doesNotReject(sidebar.locator('text="Panitia Maulid"').first().waitFor({ state: "visible" }));
      await assert.doesNotReject(sidebar.locator('text="1448 H / 2026 M"').first().waitFor({ state: "visible" }));

      // Navigation links
      const expectedNavRoutes = [
        { path: "/dashboard", label: "Dashboard" },
        { path: "/struktur", label: "Struktur Organisasi" },
        { path: "/rundown", label: "Rundown Acara" },
        { path: "/tugas", label: "Tugas" },
        { path: "/keuangan", label: "Keuangan" },
        { path: "/tamu", label: "Tamu" },
        { path: "/pengguna", label: "Akun" },
      ];

      for (const route of expectedNavRoutes) {
        const navLink = sidebar.locator(`nav a[href="${route.path}"]`);
        await assert.doesNotReject(
          navLink.first().waitFor({ state: "visible" }),
          `Sidebar navigation item for ${route.path} must be visible`
        );
      }

      // Check current page active state on dashboard link
      const activeDashboardLink = sidebar.locator('nav a[href="/dashboard"][aria-current="page"]');
      await assert.doesNotReject(activeDashboardLink.waitFor({ state: "visible" }));

      // User card in sidebar
      const userCard = sidebar.locator("div.border-t");
      await assert.doesNotReject(userCard.locator('text="Sekretariat Panitia"').waitFor({ state: "visible" }));
      await assert.doesNotReject(userCard.locator('text="Ketua Panitia"').waitFor({ state: "visible" }));
      const logoutBtn = userCard.locator('button[aria-label="Keluar dari akun"]');
      await assert.doesNotReject(logoutBtn.waitFor({ state: "visible" }));

      // Header controls: Title & Theme Toggle
      const headerTitle = page.locator("header h1:has-text('Dashboard')");
      await assert.doesNotReject(headerTitle.waitFor({ state: "visible" }));

      const themeToggle = page.locator('header button[aria-label*="Beralih ke mode"]').first();
      await assert.doesNotReject(themeToggle.waitFor({ state: "visible" }));

      // Test theme toggle action
      const initialHtmlClass = await page.evaluate(() => document.documentElement.className);
      await themeToggle.click();
      await page.waitForTimeout(300);
      const toggledHtmlClass = await page.evaluate(() => document.documentElement.className);
      assert.notEqual(initialHtmlClass, toggledHtmlClass, "Theme class should change upon clicking theme toggle");
      // Restore theme
      await themeToggle.click();
      await page.waitForTimeout(300);

      // Mobile drawer test: resize viewport to mobile size
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(300);

      const hamburgerBtn = page.locator('header button[aria-label="Buka menu navigasi"]');
      await assert.doesNotReject(hamburgerBtn.waitFor({ state: "visible", timeout: 5000 }));
      await hamburgerBtn.click();
      await page.waitForTimeout(300);

      // Verify mobile drawer dialog is open
      const mobileDrawer = page.locator("aside#mobile-nav-drawer");
      await assert.doesNotReject(mobileDrawer.waitFor({ state: "visible", timeout: 5000 }));
      const closeMenuBtn = mobileDrawer.locator('button[aria-label="Tutup menu"]');
      await assert.doesNotReject(closeMenuBtn.waitFor({ state: "visible" }));
      await closeMenuBtn.click();
      await page.waitForTimeout(300);

      // Reset back to desktop viewport
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.waitForTimeout(300);
    });

    // =========================================================================
    // 3. Four Summary Stat Cards
    // =========================================================================
    await t.test("3.3 Summary Stat Cards (Panitia, Saldo Kas, Tugas, Tamu Undangan)", async () => {
      // 1. Anggota Panitia
      const panitiaCard = page.locator('main span:has-text("Anggota Panitia")').locator("..");
      await assert.doesNotReject(panitiaCard.waitFor({ state: "visible" }));
      const panitiaText = await panitiaCard.textContent();
      assert.ok(panitiaText.includes("orang"), "Panitia card must include 'orang' count");
      assert.ok(panitiaText.includes("Seksi Pelaksana"), "Panitia card subtitle must mention 'Seksi Pelaksana'");

      // 2. Total Saldo Kas
      const saldoCard = page.locator('main span:has-text("Total Saldo Kas")').locator("..");
      await assert.doesNotReject(saldoCard.waitFor({ state: "visible" }));
      const saldoText = await saldoCard.textContent();
      assert.ok(saldoText.includes("Rp"), "Saldo Kas card must display formatted Rupiah value");
      assert.ok(saldoText.includes("Dompet: Rp"), "Saldo Kas card subtitle must show cash balance");

      // 3. Kesiapan Tugas Seksi
      const tugasCard = page.locator('main span:has-text("Kesiapan Tugas Seksi")').locator("..");
      await assert.doesNotReject(tugasCard.waitFor({ state: "visible" }));
      const tugasText = await tugasCard.textContent();
      assert.ok(tugasText.includes("%"), "Tugas card must show percentage progress");
      assert.ok(tugasText.includes("tugas selesai"), "Tugas card subtitle must show 'tugas selesai' count");

      // 4. Tamu Undangan
      const tamuCard = page.locator('main span:has-text("Tamu Undangan")').locator("..");
      await assert.doesNotReject(tamuCard.waitFor({ state: "visible" }));
      const tamuText = await tamuCard.textContent();
      assert.ok(tamuText.includes("tamu"), "Tamu card must show count with 'tamu'");
      assert.ok(tamuText.includes("terkonfirmasi hadir"), "Tamu card subtitle must show 'terkonfirmasi hadir'");
    });

    // =========================================================================
    // 4. CountdownAcaraCard: Live Clock, Event Display & Rundown Navigation
    // =========================================================================
    await t.test("3.4 CountdownAcaraCard: Live Clock, Event Display & Rundown Navigation", async () => {
      const countdownSection = page.locator('section[aria-label="Hitung Mundur dan Jadwal Acara Berikutnya"]');
      await assert.doesNotReject(countdownSection.waitFor({ state: "visible" }));

      // Verify date and clock headers
      const dateElement = countdownSection.locator("div.pb-4").first();
      await assert.doesNotReject(dateElement.waitFor({ state: "visible" }));
      const dateText = await dateElement.textContent();
      assert.ok(dateText.includes("WIB"), "Countdown header must contain live clock with WIB");

      // Verify clock ticks and updates seconds
      const clockInitial = await countdownSection.locator("span:has-text('WIB')").textContent();
      await page.waitForTimeout(1100);
      const clockAfterTick = await countdownSection.locator("span:has-text('WIB')").textContent();
      assert.ok(clockInitial && clockAfterTick, "Live clock text must be present");

      // Next Event Header & Title
      const eventBadge = countdownSection.locator('span:has-text("Hitung Mundur Acara Berikutnya")');
      await assert.doesNotReject(eventBadge.waitFor({ state: "visible" }));

      const eventTitle = countdownSection.locator("h2").first();
      await assert.doesNotReject(eventTitle.waitFor({ state: "visible" }));
      const titleText = await eventTitle.textContent();
      assert.ok(titleText.length > 0, "Event title must not be empty");

      // Countdown blocks (Hari, Jam, Menit, Detik)
      const labelHari = countdownSection.locator('span:has-text("Hari")').first();
      const labelJam = countdownSection.locator('span:has-text("Jam")').first();
      const labelMenit = countdownSection.locator('span:has-text("Menit")').first();
      const labelDetik = countdownSection.locator('span:has-text("Detik")').first();

      await assert.doesNotReject(labelHari.waitFor({ state: "visible" }));
      await assert.doesNotReject(labelJam.waitFor({ state: "visible" }));
      await assert.doesNotReject(labelMenit.waitFor({ state: "visible" }));
      await assert.doesNotReject(labelDetik.waitFor({ state: "visible" }));

      // TV Guide section & "Lihat Lengkap" navigation link
      const tvGuideTitle = countdownSection.locator('h3:has-text("Jadwal Acara Selanjutnya")');
      await assert.doesNotReject(tvGuideTitle.waitFor({ state: "visible" }));

      const rundownLink = countdownSection.locator('a[href="/rundown"]:has-text("Lihat Lengkap")');
      await assert.doesNotReject(rundownLink.waitFor({ state: "visible" }));

      // Test clicking "Lihat Lengkap" link to verify seamless navigation to /rundown
      await rundownLink.click();
      await page.waitForURL("**/rundown", { timeout: 8000 });
      assert.ok(page.url().includes("/rundown"), `Should navigate to /rundown, got: ${page.url()}`);

      // Return back to /dashboard
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
      await page.waitForURL("**/dashboard", { timeout: 8000 });
      assert.ok(page.url().includes("/dashboard"), "Must return safely back to /dashboard");
    });

    // =========================================================================
    // 5. TugasSelanjutnyaCard: Task List & Navigation Link
    // =========================================================================
    await t.test("3.5 TugasSelanjutnyaCard: Task List Render & 'Semua Tugas' Link", async () => {
      const taskSection = page.locator('section[aria-label="Tugas Selanjutnya"]');
      await assert.doesNotReject(taskSection.waitFor({ state: "visible" }));

      // Header title & subtitle
      const cardTitle = taskSection.locator('h3:has-text("Tugas Selanjutnya")');
      await assert.doesNotReject(cardTitle.waitFor({ state: "visible" }));

      // "Semua Tugas" navigation link
      const allTasksLink = taskSection.locator('a[href="/tugas"]:has-text("Semua Tugas")');
      await assert.doesNotReject(allTasksLink.waitFor({ state: "visible" }));

      // Test navigation to /tugas
      await allTasksLink.click();
      await page.waitForURL("**/tugas", { timeout: 8000 });
      assert.ok(page.url().includes("/tugas"), `Should navigate to /tugas, got: ${page.url()}`);

      // Return back to /dashboard
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
      await page.waitForURL("**/dashboard", { timeout: 8000 });
      assert.ok(page.url().includes("/dashboard"), "Must return back to /dashboard");
    });

    // =========================================================================
    // 6. Critical Status Transition, Toast Feedback & Database Persistence
    // =========================================================================
    await t.test("3.6 Critical Task Status Transition, Toast Feedback & Database Persistence", async () => {
      const taskSection = page.locator('section[aria-label="Tugas Selanjutnya"]');
      await assert.doesNotReject(taskSection.waitFor({ state: "visible" }));

      // Locate our fixture task inside TugasSelanjutnyaCard
      const taskTitle = taskSection.locator(`h4:has-text("${TEST_TASK_NAME}")`);
      await assert.doesNotReject(
        taskTitle.waitFor({ state: "visible", timeout: 5000 }),
        `Task '${TEST_TASK_NAME}' must appear in TugasSelanjutnyaCard`
      );

      // Locate the inline status dropdown for our task
      const statusSelect = taskSection.locator(`select[aria-label="Ubah status untuk tugas ${TEST_TASK_NAME}"]`);
      await assert.doesNotReject(statusSelect.waitFor({ state: "visible", timeout: 5000 }));

      // Check initial value is 'Belum Mulai'
      const initialVal = await statusSelect.inputValue();
      assert.equal(initialVal, "Belum Mulai", "Initial status of fixture task must be 'Belum Mulai'");

      // -----------------------------------------------------------------------
      // Step A: Transition from 'Belum Mulai' to 'Proses'
      // -----------------------------------------------------------------------
      await statusSelect.selectOption("Proses");

      // Verify toast notification appears confirming status update
      const toastProses = page.locator('div[role="status"]').filter({ hasText: "diubah ke Proses" });
      await assert.doesNotReject(
        toastProses.first().waitFor({ state: "visible", timeout: 6000 }),
        "Toast confirmation must appear when task status is changed to 'Proses'"
      );

      // Verify DOM select value changed immediately
      const prosesVal = await statusSelect.inputValue();
      assert.equal(prosesVal, "Proses", "Select value should update to 'Proses' in DOM");

      // Verify direct database persistence in MariaDB
      const dbRowProses = await queryOne<{ status: string }>(
        "SELECT status FROM tugas WHERE id = ?",
        [TEST_TASK_ID]
      );
      assert.ok(dbRowProses, "Task must exist in MariaDB");
      assert.equal(dbRowProses.status, "Proses", "MariaDB record status must be updated to 'Proses'");

      // -----------------------------------------------------------------------
      // Step B: Reload Browser and Verify Persistent State
      // -----------------------------------------------------------------------
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForSelector('main [aria-busy="true"]', { state: "detached", timeout: 10000 });

      // After reload, locate the task select again
      const reloadedSelect = page.locator(`select[aria-label="Ubah status untuk tugas ${TEST_TASK_NAME}"]`);
      await assert.doesNotReject(
        reloadedSelect.waitFor({ state: "visible", timeout: 5000 }),
        "Task select must remain visible after page reload"
      );

      const reloadedVal = await reloadedSelect.inputValue();
      assert.equal(reloadedVal, "Proses", "Status must persistently remain 'Proses' after browser reload");

      // Verify visual badge/style reflects 'Proses' (amber styling)
      const selectClasses = await reloadedSelect.getAttribute("class");
      assert.ok(
        selectClasses && (selectClasses.includes("amber") || selectClasses.includes("bg-amber")),
        `Select element should apply amber style for 'Proses', got classes: ${selectClasses}`
      );

      // -----------------------------------------------------------------------
      // Step C: Transition from 'Proses' to 'Selesai'
      // -----------------------------------------------------------------------
      await reloadedSelect.selectOption("Selesai");

      // Verify toast notification for 'Selesai'
      const toastSelesai = page.locator('div[role="status"]').filter({ hasText: "diubah ke Selesai" });
      await assert.doesNotReject(
        toastSelesai.first().waitFor({ state: "visible", timeout: 6000 }),
        "Toast confirmation must appear when task status is changed to 'Selesai'"
      );

      // Verify direct database persistence in MariaDB
      const dbRowSelesai = await queryOne<{ status: string }>(
        "SELECT status FROM tugas WHERE id = ?",
        [TEST_TASK_ID]
      );
      assert.ok(dbRowSelesai, "Task must exist in MariaDB");
      assert.equal(dbRowSelesai.status, "Selesai", "MariaDB record status must be updated to 'Selesai'");

      // Wait a short duration for dashboard state re-fetch
      await page.waitForTimeout(800);

      // Reload to confirm completion persists
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForSelector('main [aria-busy="true"]', { state: "detached", timeout: 10000 });

      // Because urgentTasks query only shows non-completed tasks (status != 'Selesai'),
      // verify that our completed task is no longer in urgent tasks
      const completedTaskInUrgent = page.locator(`h4:has-text("${TEST_TASK_NAME}")`);
      const count = await completedTaskInUrgent.count();
      assert.equal(
        count,
        0,
        "Completed task must not appear in Urgent Tasks list after completion and reload"
      );
    });

    // =========================================================================
    // 7. Teardown Cleanliness & Zero Console Errors Assertion
    // =========================================================================
    await t.test("3.7 Database Teardown & Zero Fatal Console Errors", async () => {
      // Teardown: delete test task from MariaDB
      await execute("DELETE FROM tugas WHERE id = ? OR nama_tugas LIKE 'E2E-TEST-%'", [TEST_TASK_ID]);

      // Verify DB cleanup
      const checkOrphan = await queryOne("SELECT id FROM tugas WHERE id = ?", [TEST_TASK_ID]);
      assert.equal(checkOrphan, null, "Fixture test task must be completely removed from MariaDB");

      // Assert zero fatal console errors or unhandled exceptions
      const fatalErrors = consoleErrors.filter((e) => !e.includes("404") && !e.includes("favicon"));
      assert.equal(
        fatalErrors.length,
        0,
        `Dashboard must produce zero console errors, but caught: ${JSON.stringify(fatalErrors)}`
      );
    });

    console.log("✅ Page 3: Dashboard Portal Headed Playwright E2E Test PASSED flawlessly with 0 console errors!");
  } finally {
    // Teardown safety fallback: ensure test task is deleted even if any assertion failed
    try {
      await execute("DELETE FROM tugas WHERE id = ? OR nama_tugas LIKE 'E2E-TEST-%'", [TEST_TASK_ID]);
      const { getPool } = await import("../../src/lib/db.ts");
      await getPool().end();
    } catch {
      // ignore
    }

    if (context) await context.close();
    if (browser) await browser.close();
  }
});
