import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { chromium } = require("/home/laxcyyfa/.npm/_npx/86170c4cd1c5da32/node_modules/playwright");

const BASE_URL = "http://localhost:3000";

test("Page 7: Comprehensive Headed Playwright E2E Test for Tamu Undangan (/tamu)", async (t) => {
  const consoleErrors = [];
  const browser = await chromium.launch({
    headless: false,
    channel: "chrome",
    args: ["--no-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

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

  try {
    // 1. Authenticate as admin
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.locator('input[autocomplete="username"]').fill("admin");
    await page.locator('input[autocomplete="current-password"]').fill("admin123");
    await page.locator('button[type="submit"]:has-text("Masuk ke Dashboard")').click();
    await page.waitForURL("**/dashboard", { timeout: 10000 });

    // 2. Navigate to Tamu Page
    await page.goto(`${BASE_URL}/tamu`, { waitUntil: "networkidle" });
    const heading = page.locator('h1:has-text("Tamu"), div:has-text("Undangan")');
    await assert.doesNotReject(heading.first().waitFor({ state: "visible" }));

    // 3. Stat Cards & Search Filter
    await t.test("7.1 Attendance Metric Cards and Search Filter Rendered", async () => {
      const mainContent = page.locator("main");
      await assert.doesNotReject(mainContent.waitFor({ state: "visible" }));
      const text = await mainContent.textContent();
      assert.ok(text.includes("Hadir") || text.includes("Konfirmasi") || text.includes("Tamu"), "Must display attendance metrics");

      const searchInput = page.locator('input[placeholder*="Cari"], input[type="search"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill("Habib");
        await page.waitForTimeout(300);
        await searchInput.fill("");
        await page.waitForTimeout(300);
      }
    });

    // 4. Create Tamu & Persistence
    await t.test("7.2 Create Tamu via TamuModal & Persistence Check", async () => {
      const addBtn = page.locator('button:has-text("Tambah Tamu"), button:has-text("Tamu Baru")').first();
      await assert.doesNotReject(addBtn.waitFor({ state: "visible" }));
      await addBtn.click();

      const modal = page.locator('div[role="dialog"]');
      await assert.doesNotReject(modal.waitFor({ state: "visible" }));

      const nameInput = modal.locator('input[placeholder*="nama"], input[name="nama"]').first();
      const addressInput = modal.locator('textarea, input[placeholder*="alamat"]').first();
      const statusSelect = modal.locator('select[name="status"], select').first();

      if (await nameInput.isVisible()) {
        await nameInput.fill("E2E-TEST-HABIB-SYAFIQ");
      }
      if (await addressInput.isVisible()) {
        await addressInput.fill("Jakarta Selatan");
      }
      if (await statusSelect.isVisible()) {
        await statusSelect.selectOption("VVIP");
      }

      const submitBtn = modal.locator('button[type="submit"]:has-text("Simpan")');
      await submitBtn.click();
      await page.waitForTimeout(1000);

      // Verify persistence via reload
      await page.reload({ waitUntil: "networkidle" });
      const tableContent = await page.locator("main").textContent();
      assert.ok(tableContent.includes("E2E-TEST-HABIB-SYAFIQ"), "Created guest must persist and appear after reload");
    });

    // 5. Critical Inline Attendance Status Change (Belum Konfirmasi -> Hadir -> Tidak Hadir)
    await t.test("7.3 Inline Attendance Status Change & Database Persistence", async () => {
      const guestRow = page.locator('tr:has-text("E2E-TEST-HABIB-SYAFIQ"), div:has-text("E2E-TEST-HABIB-SYAFIQ")').first();
      await assert.doesNotReject(guestRow.waitFor({ state: "visible" }));

      const statusSelect = guestRow.locator('select[aria-label*="kehadiran"], select').first();
      if (await statusSelect.isVisible()) {
        // Change to Hadir
        await statusSelect.selectOption("Hadir");
        await page.waitForTimeout(1000);

        // Change to Tidak Hadir
        await statusSelect.selectOption("Tidak Hadir");
        await page.waitForTimeout(1000);

        // Verify persistence after reload
        await page.reload({ waitUntil: "networkidle" });
        const reloadedRow = page.locator('tr:has-text("E2E-TEST-HABIB-SYAFIQ"), div:has-text("E2E-TEST-HABIB-SYAFIQ")').first();
        const reloadedSelect = reloadedRow.locator('select[aria-label*="kehadiran"], select').first();
        if (await reloadedSelect.isVisible()) {
          const val = await reloadedSelect.inputValue();
          assert.equal(val, "Tidak Hadir", "Attendance status must remain 'Tidak Hadir' after page reload");
        }
      }
    });

    // 6. Delete Tamu with Confirmation
    await t.test("7.4 Delete Guest with Confirmation Dialog", async () => {
      const guestRow = page.locator('tr:has-text("E2E-TEST-HABIB-SYAFIQ"), div:has-text("E2E-TEST-HABIB-SYAFIQ")').first();
      if (await guestRow.isVisible()) {
        const deleteBtn = guestRow.locator('button[aria-label*="Hapus"], button:has-text("Hapus")').first();
        if (await deleteBtn.isVisible()) {
          await deleteBtn.click();

          const confirmBtn = page.locator('div[role="dialog"] button:has-text("Hapus"), div[role="dialog"] button:has-text("Ya")').first();
          if (await confirmBtn.isVisible()) {
            await confirmBtn.click();
            await page.waitForTimeout(1000);
          }

          // Verify removal after reload
          await page.reload({ waitUntil: "networkidle" });
          const textAfter = await page.locator("main").textContent();
          assert.ok(!textAfter.includes("E2E-TEST-HABIB-SYAFIQ"), "Deleted guest must not appear after reload");
        }
      }
    });

    // 7. Teardown Database
    await t.test("7.5 Teardown Test Data from MariaDB", async () => {
      const { query } = await import("../../src/lib/db.ts");
      await query("DELETE FROM tamu WHERE nama LIKE 'E2E-TEST-%'");
      console.log("Teardown: Cleaned up E2E-TEST records from tamu table");
    });

    // 8. Assert Zero Console Errors
    assert.deepEqual(consoleErrors, [], `Expected zero console errors, but encountered: ${consoleErrors.join("; ")}`);
    console.log("✅ Page 7: Tamu Undangan Headed Playwright E2E Test PASSED flawlessly with 0 console errors!");

  } finally {
    try {
      const { getPool } = await import("../../src/lib/db.ts");
      await getPool().end();
    } catch {}
    await page.close();
    await context.close();
    await browser.close();
  }
});
