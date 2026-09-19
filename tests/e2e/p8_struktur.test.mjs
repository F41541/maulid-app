import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "module";
import mysql from "mysql2/promise";

const require = createRequire(import.meta.url);
const { chromium } = require("/home/laxcyyfa/.npm/_npx/86170c4cd1c5da32/node_modules/playwright");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
process.env.DISPLAY = process.env.DISPLAY || ":0";

// Database helper for teardown and verification
const dbConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "maulid_app",
};

async function cleanDatabaseTestRecords() {
  const conn = await mysql.createConnection(dbConfig);
  try {
    // 1. Detach test panitia from test seksi
    await conn.execute("UPDATE panitia SET seksi_id = NULL WHERE seksi_id IN (SELECT id FROM seksi WHERE nama_seksi LIKE 'E2E-TEST%')");
    // 2. Delete test tasks if any
    await conn.execute("DELETE FROM tugas WHERE nama_tugas LIKE 'E2E-TEST%'");
    // 3. Delete test seksi
    await conn.execute("DELETE FROM seksi WHERE nama_seksi LIKE 'E2E-TEST%'");
    // 4. Detach users from test panitia
    await conn.execute("UPDATE panitia SET user_id = NULL WHERE nama LIKE 'E2E-TEST%'");
    // 5. Delete test panitia
    await conn.execute("DELETE FROM panitia WHERE nama LIKE 'E2E-TEST%'");
    // 6. Delete test admin_users
    await conn.execute("DELETE FROM admin_users WHERE username LIKE 'E2E-TEST%' OR nama LIKE 'E2E-TEST%'");
  } finally {
    await conn.end();
  }
}

test("Page 8: Comprehensive Headed Playwright E2E Test for Struktur Organisasi (/(portal)/struktur)", async (t) => {
  // Pre-cleanup in case previous run was interrupted
  await cleanDatabaseTestRecords();

  const consoleErrors = [];
  const browser = await chromium.launch({
    channel: "chrome",
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  // Stub window.print and track invocations
  await page.addInitScript(() => {
    window.__printed = false;
    window.print = () => {
      window.__printed = true;
      console.log("[STUB] window.print() called successfully");
    };
  });

  // Track console errors and unhandled exceptions
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      // Ignore non-fatal React dev warnings or favicon 404 if any
      if (!text.includes("favicon.ico") && !text.includes("warning")) {
        consoleErrors.push(text);
      }
    }
  });

  page.on("pageerror", (err) => {
    consoleErrors.push(err.message);
  });

  try {
    // ----------------------------------------------------
    // Step 1: Authentication & Navigation to /struktur
    // ----------------------------------------------------
    await t.test("8.1 Authentication and Navigation to /(portal)/struktur", async () => {
      await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });

      const usernameInput = page.locator('input[autocomplete="username"], input[type="text"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const submitBtn = page.locator('button[type="submit"]:has-text("Masuk ke Dashboard")');

      await usernameInput.waitFor({ state: "visible" });
      await usernameInput.fill("admin");
      await passwordInput.fill("admin123");

      // Wait for login API response to complete
      await Promise.all([
        page.waitForResponse((res) => res.url().includes("/api/auth") && res.status() === 200),
        submitBtn.click(),
      ]);

      // Navigate to /struktur
      await page.goto(`${BASE_URL}/struktur`, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForSelector("main", { state: "visible" });

      // Verify page title / heading
      const pageHeading = page.locator('h2:has-text("Bagan Struktur Panitia Maulid Nabi Muhammad SAW")');
      await pageHeading.waitFor({ state: "visible", timeout: 10000 });
      assert.ok(await pageHeading.isVisible(), "Page heading for Struktur must be visible");
    });

    // ----------------------------------------------------
    // Step 2: View Switcher Tabs (Bagan Visual vs Tabel / Daftar)
    // ----------------------------------------------------
    await t.test("8.2 View Switcher Tabs: Bagan Visual vs Tabel / Daftar", async () => {
      const chartTab = page.locator('button[role="tab"]:has-text("Bagan Visual")');
      const tableTab = page.locator('button[role="tab"]:has-text("Tabel / Daftar")');

      await chartTab.waitFor({ state: "visible" });
      await tableTab.waitFor({ state: "visible" });

      // Initially chart tab is active
      assert.equal(await chartTab.getAttribute("aria-selected"), "true", "Bagan Visual tab should be active by default");

      // Verify organogram elements exist
      const orgChart = page.locator('div:has(> div > h2:has-text("Bagan Struktur Panitia"))');
      assert.ok(await orgChart.isVisible(), "Organogram container must be visible in chart view");

      // Switch to Table view
      await tableTab.click();
      await page.waitForTimeout(300);
      assert.equal(await tableTab.getAttribute("aria-selected"), "true", "Tabel / Daftar tab should be active after click");

      // Verify table layout and headers
      const table = page.locator("table");
      await table.waitFor({ state: "visible" });
      const tableText = await table.textContent();
      assert.ok(tableText.includes("Nama Lengkap"), "Table must include Nama Lengkap column");
      assert.ok(tableText.includes("Jabatan"), "Table must include Jabatan column");
      assert.ok(tableText.includes("Seksi"), "Table must include Seksi column");
      assert.ok(tableText.includes("Kontak / No HP"), "Table must include Kontak / No HP column");
      assert.ok(tableText.includes("Akun Pengguna"), "Table must include Akun Pengguna column");
      assert.ok(tableText.includes("Aksi"), "Table must include Aksi column");

      // Switch back to Bagan Visual tab
      await chartTab.click();
      await page.waitForTimeout(300);
      assert.equal(await chartTab.getAttribute("aria-selected"), "true", "Bagan Visual tab should be active again");
    });

    // Helper to safely expand speed dial
    const ensureSpeedDialOpen = async () => {
      const menu = page.locator('div[role="menu"][aria-label="Daftar Aksi Cepat"]');
      if (!(await menu.isVisible())) {
        const trigger = page.locator('button[aria-label="Aksi Struktur"], button[aria-label="Tutup menu aksi"]').first();
        await trigger.click();
        await menu.waitFor({ state: "visible", timeout: 8000 });
      }
    };

    // ----------------------------------------------------
    // Step 3: SpeedDial Controls (Print Stub, Seksi Baru, Tambah Anggota)
    // ----------------------------------------------------
    await t.test("8.3 SpeedDial Controls and Cetak / PDF Print Trigger", async () => {
      await ensureSpeedDialOpen();

      const printAction = page.locator('button[role="menuitem"]:has-text("Cetak / PDF")');
      const seksiAction = page.locator('button[role="menuitem"]:has-text("Seksi Baru")');
      const anggotaAction = page.locator('button[role="menuitem"]:has-text("Tambah Anggota")');

      await printAction.waitFor({ state: "visible" });
      await seksiAction.waitFor({ state: "visible" });
      await anggotaAction.waitFor({ state: "visible" });

      // Click Cetak / PDF action to test window.print stub
      await printAction.click();
      await page.waitForTimeout(500);

      const isPrinted = await page.evaluate(() => window.__printed);
      assert.equal(isPrinted, true, "window.print stub should have been called when Cetak / PDF was clicked");

      // SpeedDial menu should close automatically after item click
      const menu = page.locator('div[role="menu"][aria-label="Daftar Aksi Cepat"]');
      await menu.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
    });

    // ----------------------------------------------------
    // Step 4: SeksiModal - Validation, Create E2E-TEST-SEKSI-MULTIMEDIA & Persistence
    // ----------------------------------------------------
    await t.test("8.4 SeksiModal: Validation, Create E2E-TEST-SEKSI-MULTIMEDIA, and Persistence", async () => {
      await ensureSpeedDialOpen();

      const seksiAction = page.locator('button[role="menuitem"]:has-text("Seksi Baru")');
      await seksiAction.click();

      // Verify SeksiModal opened
      const seksiModal = page.locator('div[role="dialog"]:has-text("Tambah Seksi Baru")');
      await seksiModal.waitFor({ state: "visible" });

      const namaSeksiInput = seksiModal.locator('input[placeholder*="Seksi Ubudiyah"]');
      const submitSeksiBtn = seksiModal.locator('button[type="submit"]:has-text("Simpan Seksi")');

      // 1. Test empty form validation (HTML5 required check)
      await namaSeksiInput.fill("");
      await submitSeksiBtn.click();
      const isNamaValid = await namaSeksiInput.evaluate((el) => el.checkValidity());
      assert.equal(isNamaValid, false, "Empty nama seksi should fail HTML5 validation");
      assert.ok(await seksiModal.isVisible(), "Modal should remain open on invalid submit");

      // 2. Fill valid data
      await namaSeksiInput.fill("E2E-TEST-SEKSI-MULTIMEDIA");

      // Submit form
      await submitSeksiBtn.click();

      // Verify toast notification
      const successToast = page.locator('div[role="status"]:has-text("Seksi baru berhasil ditambahkan")');
      await successToast.waitFor({ state: "visible", timeout: 8000 });

      // Wait for modal to disappear
      await seksiModal.waitFor({ state: "hidden" });

      // Verify seksi card appears in organogram with unassigned coordinator badge
      const newSeksiCard = page.locator("div.rounded-2xl", {
        has: page.locator('h4:has-text("E2E-TEST-SEKSI-MULTIMEDIA")'),
      });
      await newSeksiCard.waitFor({ state: "visible", timeout: 8000 });
      assert.ok(await newSeksiCard.isVisible(), "New seksi E2E-TEST-SEKSI-MULTIMEDIA must be rendered in organogram");

      // Verify "Belum Ditentukan" placeholder
      const unassignedBadge = newSeksiCard.locator('span:has-text("Belum Ditentukan")');
      await unassignedBadge.waitFor({ state: "visible" });
      assert.ok(await unassignedBadge.isVisible(), "Seksi without coordinator must show 'Belum Ditentukan' badge");

      // 3. Verify Persistence on reload
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForSelector("main", { state: "visible" });

      const persistedSeksiCard = page.locator("div.rounded-2xl", {
        has: page.locator('h4:has-text("E2E-TEST-SEKSI-MULTIMEDIA")'),
      });
      await persistedSeksiCard.waitFor({ state: "visible", timeout: 8000 });
      assert.ok(await persistedSeksiCard.isVisible(), "E2E-TEST-SEKSI-MULTIMEDIA must persist after page reload");
    });

    // ----------------------------------------------------
    // Step 5: PanitiaModal - Create Members, Multiple Members in 1 Jabatan Card & Persistence
    // ----------------------------------------------------
    await t.test("8.5 PanitiaModal: Create Members & Multiple Members in 1 Organogram Card", async () => {
      // Ensure we are in Bagan Visual view
      const chartTab = page.locator('button[role="tab"]:has-text("Bagan Visual")');
      if (await chartTab.isVisible()) {
        await chartTab.click();
        await page.waitForTimeout(300);
      }

      // Helper to add panitia
      const addPanitia = async (nama, jabatan, seksiLabel = "", noHp = "") => {
        await ensureSpeedDialOpen();
        const anggotaAction = page.locator('button[role="menuitem"]:has-text("Tambah Anggota")');
        await anggotaAction.click();

        const panitiaModal = page.locator('div[role="dialog"]:has-text("Tambah Anggota Panitia")');
        await panitiaModal.waitFor({ state: "visible" });

        const namaInput = panitiaModal.locator('input[placeholder*="Muhammad Rizky"]');
        await namaInput.fill(nama);

        const selects = panitiaModal.locator("select");
        await selects.nth(0).selectOption({ value: jabatan });

        if (seksiLabel) {
          await selects.nth(1).selectOption({ label: seksiLabel });
        }

        if (noHp) {
          const noHpInput = panitiaModal.locator('input[placeholder="081234567890"]');
          await noHpInput.fill(noHp);
        }

        const submitPanitiaBtn = panitiaModal.locator('button[type="submit"]:has-text("Simpan Anggota")');
        await submitPanitiaBtn.click();

        const successToast = page.locator('div[role="status"]:has-text("Panitia baru berhasil ditambahkan")');
        await successToast.waitFor({ state: "visible", timeout: 8000 });
        await panitiaModal.waitFor({ state: "hidden" });
      };

      // 1. Create E2E-TEST-ANGGOTA-KAMERA in E2E-TEST-SEKSI-MULTIMEDIA
      await addPanitia("E2E-TEST-ANGGOTA-KAMERA", "Anggota Seksi", "E2E-TEST-SEKSI-MULTIMEDIA", "08123456789");

      // 2. Create 2 members with the same jabatan (Pelindung) to test card grouping
      await addPanitia("E2E-TEST-PELINDUNG-1", "Pelindung", "", "08111111111");
      await addPanitia("E2E-TEST-PELINDUNG-2", "Pelindung", "", "08222222222");

      // Verify in Bagan Visual: Only 1 card for "Pelindung" exists, containing both names
      const pelindungCards = page.locator('div:has(> span:has-text("PELINDUNG"))');
      assert.equal(await pelindungCards.count(), 1, "There must be exactly 1 card for Pelindung even with multiple members");
      const pelindungCardText = await pelindungCards.first().textContent();
      assert.ok(pelindungCardText.includes("E2E-TEST-PELINDUNG-1"), "Card must include E2E-TEST-PELINDUNG-1");
      assert.ok(pelindungCardText.includes("E2E-TEST-PELINDUNG-2"), "Card must include E2E-TEST-PELINDUNG-2");

      // 3. Verify member appears in organogram under E2E-TEST-SEKSI-MULTIMEDIA
      const seksiCard = page.locator("div.rounded-2xl", {
        has: page.locator('h4:has-text("E2E-TEST-SEKSI-MULTIMEDIA")'),
      });
      const memberItem = seksiCard.locator("ul li", {
        hasText: "E2E-TEST-ANGGOTA-KAMERA",
      });
      await memberItem.waitFor({ state: "visible", timeout: 8000 });
      assert.ok(await memberItem.isVisible(), "Member E2E-TEST-ANGGOTA-KAMERA must appear under E2E-TEST-SEKSI-MULTIMEDIA");
    });

    // ----------------------------------------------------
    // Step 6: Search & Filter on Table View & BuatAkunModal Integration
    // ----------------------------------------------------
    await t.test("8.6 Table Search & Filter and BuatAkunModal Integration", async () => {
      // Switch to Table view
      const tableTab = page.locator('button[role="tab"]:has-text("Tabel / Daftar")');
      await tableTab.click();
      await page.waitForTimeout(300);

      // 1. Test Search by name
      const searchInput = page.locator('input[aria-label="Cari panitia"]');
      await searchInput.waitFor({ state: "visible" });
      await searchInput.fill("KAMERA");
      await page.waitForTimeout(300);

      const searchFilteredRows = page.locator("table tbody tr");
      assert.equal(await searchFilteredRows.count(), 1, "Search for KAMERA should return exactly 1 row");
      assert.ok((await searchFilteredRows.first().textContent()).includes("E2E-TEST-ANGGOTA-KAMERA"));

      // Test Clear Search button
      const clearSearchBtn = page.locator('button[aria-label="Hapus pencarian"]');
      await clearSearchBtn.click();
      await page.waitForTimeout(300);
      assert.ok((await page.locator("table tbody tr").count()) > 1, "Clearing search should restore table rows");

      // 2. Test Filter by Seksi
      const seksiFilter = page.locator('select[aria-label="Filter seksi"]');
      await seksiFilter.selectOption({ label: "E2E-TEST-SEKSI-MULTIMEDIA" });
      await page.waitForTimeout(300);

      const seksiFilteredRows = page.locator("table tbody tr");
      for (let i = 0; i < await seksiFilteredRows.count(); i++) {
        const text = await seksiFilteredRows.nth(i).textContent();
        assert.ok(text.includes("E2E-TEST-SEKSI-MULTIMEDIA"), "All filtered rows must belong to E2E-TEST-SEKSI-MULTIMEDIA");
      }

      // 3. Test Filter by Jabatan
      const jabatanFilter = page.locator('select[aria-label="Filter jabatan"]');
      await jabatanFilter.selectOption({ label: "Pelindung" });
      await page.waitForTimeout(300);

      // Should show 0 rows because no Pelindung is in E2E-TEST-SEKSI-MULTIMEDIA
      assert.ok((await page.locator("table tbody tr").textContent()).includes("Tidak ada panitia yang sesuai"));

      // 4. Test Reset button
      const resetBtn = page.locator('button:has-text("Reset")').first();
      await resetBtn.click();
      await page.waitForTimeout(300);

      // Verify row for E2E-TEST-ANGGOTA-KAMERA is present again
      const tableRow = page.locator("table tbody tr", {
        hasText: "E2E-TEST-ANGGOTA-KAMERA",
      });
      await tableRow.waitFor({ state: "visible" });

      // Locate "Buat Akun" button
      const buatAkunBtn = tableRow.locator('button:has-text("Buat Akun")');
      await buatAkunBtn.waitFor({ state: "visible" });
      await buatAkunBtn.click();

      // Verify BuatAkunModal opens
      const buatAkunModal = page.locator('div[role="dialog"]:has-text("Buat Akun Pengguna Panitia")');
      await buatAkunModal.waitFor({ state: "visible" });

      // Verify prefilled name and details
      const modalText = await buatAkunModal.textContent();
      assert.ok(modalText.includes("E2E-TEST-ANGGOTA-KAMERA"), "Modal must show panitia name");
      assert.ok(modalText.includes("E2E-TEST-SEKSI-MULTIMEDIA"), "Modal must show linked section");

      // Verify suggested username input is prefilled
      const usernameInput = buatAkunModal.locator('input[placeholder="contoh: ahmadfauzi"]');
      const suggestedUsername = await usernameInput.inputValue();
      assert.ok(suggestedUsername.length > 0, `Username should be prefilled, got: ${suggestedUsername}`);

      const passwordInput = buatAkunModal.locator('input[type="password"]');
      const submitBtn = buatAkunModal.locator('button[type="submit"]:has-text("Buat Akun Sekarang")');

      // Test validation: Empty username check (HTML5 required validation prevents submit)
      await usernameInput.fill("");
      await passwordInput.fill("password123");
      await submitBtn.click();
      const isUsernameValid = await usernameInput.evaluate((el) => el.checkValidity());
      assert.equal(isUsernameValid, false, "Empty username input should fail HTML5 required validation");

      // Test validation: Short password check (< 5 characters) triggers JavaScript validation toast
      await usernameInput.fill("e2etestuser");
      await passwordInput.fill("123"); // < 5 characters
      await submitBtn.click();
      const passwordErrorToast = page.locator('div[role="status"]:has-text("Password minimal 5 karakter")');
      await passwordErrorToast.waitFor({ state: "visible", timeout: 8000 });
      assert.ok(await passwordErrorToast.isVisible(), "Password < 5 characters should trigger error toast");

      // Close modal using Batal button
      const cancelBtn = buatAkunModal.locator('button:has-text("Batal")');
      await cancelBtn.click();
      await buatAkunModal.waitFor({ state: "hidden" });
      assert.equal(await buatAkunModal.isVisible(), false, "BuatAkunModal should close after clicking Batal");
    });

    // ----------------------------------------------------
    // Step 7: Edit & Delete Following Reverse Foreign Key Order
    // ----------------------------------------------------
    await t.test("8.7 Edit & Delete Following Reverse Foreign Key Order (Panitia then Seksi)", async () => {
      // 1. Edit Panitia
      const tableRow = page.locator("table tbody tr", {
        hasText: "E2E-TEST-ANGGOTA-KAMERA",
      });
      const editPanitiaBtn = tableRow.locator('button[title="Edit data panitia"], button[aria-label="Edit data panitia"]');
      await editPanitiaBtn.click();

      const editPanitiaModal = page.locator('div[role="dialog"]:has-text("Edit Anggota Panitia")');
      await editPanitiaModal.waitFor({ state: "visible" });

      const catatanInput = editPanitiaModal.locator('textarea[placeholder*="sound system"]');
      await catatanInput.fill("Staff Multimedia - Kamera dan Dokumentasi (Updated)");

      const savePanitiaBtn = editPanitiaModal.locator('button[type="submit"]:has-text("Simpan Anggota")');
      await savePanitiaBtn.click();

      const updateToast = page.locator('div[role="status"]:has-text("Data panitia berhasil diperbarui")');
      await updateToast.waitFor({ state: "visible", timeout: 8000 });
      await editPanitiaModal.waitFor({ state: "hidden" });

      // 2. Delete Panitia members
      const deletePanitiaByName = async (nama) => {
        const row = page.locator("table tbody tr", { hasText: nama });
        if (await row.count() > 0) {
          const deleteBtn = row.locator('button[title="Hapus data panitia"], button[aria-label="Hapus data panitia"]').first();
          await deleteBtn.click();

          const confirmDialog = page.locator('div[role="dialog"]:has-text("Hapus Panitia")');
          await confirmDialog.waitFor({ state: "visible" });
          const confirmBtn = confirmDialog.locator('button:has-text("Ya, Lanjutkan")');
          await confirmBtn.click();

          const deleteToast = page.locator('div[role="status"]:has-text("Panitia berhasil dihapus")');
          await deleteToast.waitFor({ state: "visible", timeout: 8000 });
          await confirmDialog.waitFor({ state: "hidden" });
          await page.waitForTimeout(300);
        }
      };

      await deletePanitiaByName("E2E-TEST-ANGGOTA-KAMERA");
      await deletePanitiaByName("E2E-TEST-PELINDUNG-1");
      await deletePanitiaByName("E2E-TEST-PELINDUNG-2");

      // 3. Switch to Bagan Visual to test Edit and Delete Seksi
      const chartTab = page.locator('button[role="tab"]:has-text("Bagan Visual")');
      await chartTab.click();
      await page.waitForTimeout(300);

      const seksiCard = page.locator("div.rounded-2xl", {
        has: page.locator('h4:has-text("E2E-TEST-SEKSI-MULTIMEDIA")'),
      });
      await seksiCard.waitFor({ state: "visible" });

      // Edit Seksi modal check
      const editSeksiBtn = seksiCard.locator('button[title="Edit data"], button[aria-label="Edit data"]');
      await editSeksiBtn.click();

      const editSeksiModal = page.locator('div[role="dialog"]:has-text("Edit Seksi Pelaksana")');
      await editSeksiModal.waitFor({ state: "visible" });
      const cancelSeksiBtn = editSeksiModal.locator('button:has-text("Batal")');
      await cancelSeksiBtn.click();
      await editSeksiModal.waitFor({ state: "hidden" });

      // Delete Seksi (Second in reverse FK teardown)
      const deleteSeksiBtn = seksiCard.locator('button[title="Hapus data"], button[aria-label="Hapus data"]');
      await deleteSeksiBtn.click();

      // Confirm dialog for seksi
      const confirmSeksiDialog = page.locator('div[role="dialog"]:has-text("Hapus Seksi")');
      await confirmSeksiDialog.waitFor({ state: "visible" });
      const confirmSeksiBtn = confirmSeksiDialog.locator('button:has-text("Ya, Lanjutkan")');
      await confirmSeksiBtn.click();

      const deleteSeksiToast = page.locator('div[role="status"]:has-text("Seksi berhasil dihapus")');
      await deleteSeksiToast.waitFor({ state: "visible", timeout: 8000 });
      await confirmSeksiDialog.waitFor({ state: "hidden" });

      // Verify seksi is gone from view
      await page.waitForTimeout(500);
      assert.equal(await seksiCard.count(), 0, "Seksi card must be removed from organogram view");

      // 4. Reload page to verify persistence of deletion
      await page.reload({ waitUntil: "networkidle" });
      const seksiAfterReload = page.locator("div.rounded-2xl", {
        has: page.locator('h4:has-text("E2E-TEST-SEKSI-MULTIMEDIA")'),
      });
      assert.equal(await seksiAfterReload.count(), 0, "Seksi must remain deleted after page reload");
    });

    // ----------------------------------------------------
    // Step 8: Teardown Verification & Assert Zero Console Errors
    // ----------------------------------------------------
    await t.test("8.8 Database Cleanliness & Zero Fatal Console Errors", async () => {
      // Connect to DB and assert no lingering test records
      const conn = await mysql.createConnection(dbConfig);
      try {
        const [panitiaRows] = await conn.execute("SELECT id, nama FROM panitia WHERE nama LIKE 'E2E-TEST%'");
        assert.equal(panitiaRows.length, 0, `Database must have 0 test panitia records, found: ${JSON.stringify(panitiaRows)}`);

        const [seksiRows] = await conn.execute("SELECT id, nama_seksi FROM seksi WHERE nama_seksi LIKE 'E2E-TEST%'");
        assert.equal(seksiRows.length, 0, `Database must have 0 test seksi records, found: ${JSON.stringify(seksiRows)}`);
      } finally {
        await conn.end();
      }

      // Assert zero console errors
      assert.deepEqual(
        consoleErrors,
        [],
        `Expected zero fatal console errors or unhandled exceptions, but got: ${consoleErrors.join("; ")}`
      );
      console.log("✅ Page 8: Struktur Organisasi Headed Playwright E2E Test PASSED with 0 errors!");
    });
  } finally {
    // Final DB hygiene guarantee
    await cleanDatabaseTestRecords();

    await page.close();
    await context.close();
    await browser.close();
  }
});
