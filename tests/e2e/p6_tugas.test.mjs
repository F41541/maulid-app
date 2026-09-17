import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "module";
import mysql from "mysql2/promise";

const require = createRequire(import.meta.url);
const { chromium } = require("/home/laxcyyfa/.npm/_npx/86170c4cd1c5da32/node_modules/playwright");

const BASE_URL = "http://localhost:3000";
const TASK_NAME_DEKORASI = "E2E-TEST-TUGAS-DEKORASI";
const TASK_NAME_BERSAMA = "E2E-TEST-TUGAS-BERSAMA";

// Minimal valid 1x1 PNG transparent buffer with valid PNG magic bytes (0x89, 0x50, 0x4E, 0x47)
const SAMPLE_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const samplePngBuffer = Buffer.from(SAMPLE_PNG_BASE64, "base64");

// Database connection helper
async function getDbConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "maulid_app",
  });
}

// Cleanup helper for test tasks and uploaded files
async function cleanupTestData() {
  let conn;
  try {
    conn = await getDbConnection();
    await conn.execute("DELETE FROM tugas WHERE nama_tugas LIKE 'E2E-TEST-%'");
  } catch (err) {
    console.error("[Cleanup DB Error]:", err);
  } finally {
    if (conn) await conn.end();
  }

  // Cleanup filesystem
  try {
    const uploadDir = path.join(process.cwd(), "public", "uploads", "dokumentasi");
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      for (const f of files) {
        if (f.startsWith("dok-") && (f.endsWith(".png") || f.endsWith(".jpg") || f.endsWith(".webp"))) {
          try {
            fs.unlinkSync(path.join(uploadDir, f));
          } catch (_) {}
        }
      }
    }
  } catch (err) {
    console.error("[Cleanup Filesystem Error]:", err);
  }
}

test("Page 6: Comprehensive Headed Playwright E2E Test for Tugas per Seksi (/tugas)", async (t) => {
  const consoleErrors = [];

  // 1. Initial cleanup to guarantee fresh testing conditions
  await cleanupTestData();

  // 2. Import session auth helper to create isolated authenticated session
  const { createSessionToken, ROLES } = await import("../../src/lib/auth-tokens.ts");
  const sessionToken = createSessionToken({
    id: "admin-1",
    username: "admin",
    nama: "Sekretariat Panitia",
    role: ROLES.KETUA_PANITIA,
    seksi_id: null,
  });

  // 3. Launch Browser in Headed Mode with Chrome channel on DISPLAY=:0
  const browser = await chromium.launch({
    headless: false,
    channel: "chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  // Inject session cookie into browser context for isolated authenticated access
  await context.addCookies([
    {
      name: "maulid_session",
      value: sessionToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();

  // Populate client sessionStorage with user object to ensure full client hydration
  await page.addInitScript((user) => {
    sessionStorage.setItem("maulid_user_session", JSON.stringify(user));
  }, {
    id: "admin-1",
    username: "admin",
    nama: "Sekretariat Panitia",
    role: "ketua_panitia",
    seksi_id: null,
    jabatan: null,
  });

  // 4. Capture and record browser console errors and unhandled exceptions
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(`[Console Error]: ${msg.text()}`);
    }
  });

  page.on("pageerror", (err) => {
    consoleErrors.push(`[Unhandled Page Error]: ${err.message}`);
  });

  try {
    // -------------------------------------------------------------------------
    // Subtest 6.1: Authentication & Navigation to Tugas per Seksi
    // -------------------------------------------------------------------------
    await t.test("6.1 Authentication as Ketua Panitia and Navigation to /tugas", async () => {
      // Navigate to /tugas with active authenticated session
      await page.goto(`${BASE_URL}/tugas`, { waitUntil: "networkidle" });
      assert.ok(page.url().includes("/tugas"), `Expected URL to contain /tugas, got: ${page.url()}`);

      // Verify page top header in Navbar
      const pageHeading = page.locator('header h1:has-text("Tugas per Seksi")');
      await assert.doesNotReject(pageHeading.first().waitFor({ state: "visible", timeout: 8000 }));

      // Verify filter bar
      const filterSeksi = page.locator('select[aria-label="Filter seksi tugas"]');
      const filterStatus = page.locator('select[aria-label="Filter status tugas"]');
      await assert.doesNotReject(filterSeksi.waitFor({ state: "visible" }));
      await assert.doesNotReject(filterStatus.waitFor({ state: "visible" }));

      // Verify floating speed dial
      const speedDialBtn = page.locator('button[aria-label="Aksi Tugas"]');
      await assert.doesNotReject(speedDialBtn.waitFor({ state: "visible" }));
    });

    // -------------------------------------------------------------------------
    // Subtest 6.2: Division Progress Bars & Filter Toolbar Interactivity
    // -------------------------------------------------------------------------
    await t.test("6.2 Division Progress Bars and Interactive Filters", async () => {
      // 1. Verify Progress Grid per Seksi
      const progressGrid = page.locator("main > div.flex.flex-wrap.gap-3").first();
      await assert.doesNotReject(progressGrid.waitFor({ state: "visible" }));

      const progressCards = progressGrid.locator("> div");
      const cardCount = await progressCards.count();
      assert.ok(cardCount >= 3, `Expected at least 3 seksi progress bars, found ${cardCount}`);

      // Verify each progress card has section title, percentage, progress bar, and counters
      const firstCardText = await progressCards.first().textContent();
      assert.ok(firstCardText.includes("%"), "Progress card must display percentage");
      assert.ok(firstCardText.includes("selesai") && firstCardText.includes("total"), "Progress card must show selesai/total counters");

      // 2. Test Seksi Filter Dropdown
      const seksiSelect = page.locator('select[aria-label="Filter seksi tugas"]');
      // Filter by Seksi Acara (s-1)
      await seksiSelect.selectOption("s-1");
      await page.waitForTimeout(400);

      // Verify all rendered cards are Seksi Acara
      const seksiBadgesAfter = page.locator("main section div.animate-stagger-item span.uppercase");
      const badgeCount = await seksiBadgesAfter.count();
      assert.ok(badgeCount > 0, "Must display filtered tasks for Seksi Acara");
      for (let i = 0; i < badgeCount; i++) {
        const text = await seksiBadgesAfter.nth(i).textContent();
        assert.ok(text.includes("Seksi Acara"), `Expected Seksi Acara badge, got: ${text}`);
      }

      // Reset filter back to "all"
      await seksiSelect.selectOption("all");
      await page.waitForTimeout(400);

      // 3. Test Status Filter Dropdown
      const statusSelect = page.locator('select[aria-label="Filter status tugas"]');

      // Filter by "Belum Mulai"
      await statusSelect.selectOption("Belum Mulai");
      await page.waitForTimeout(400);
      const statusesBelumMulai = page.locator('main select[aria-label^="Ubah status "]');
      const countBelumMulai = await statusesBelumMulai.count();
      assert.ok(countBelumMulai > 0, "Should display tasks with status Belum Mulai");
      for (let i = 0; i < countBelumMulai; i++) {
        const val = await statusesBelumMulai.nth(i).inputValue();
        assert.equal(val, "Belum Mulai", "Every item must have status Belum Mulai");
      }

      // Filter by "Selesai"
      await statusSelect.selectOption("Selesai");
      await page.waitForTimeout(400);
      const statusesSelesai = page.locator('main select[aria-label^="Ubah status "]');
      const countSelesai = await statusesSelesai.count();
      assert.ok(countSelesai > 0, "Should display tasks with status Selesai");
      for (let i = 0; i < countSelesai; i++) {
        const val = await statusesSelesai.nth(i).inputValue();
        assert.equal(val, "Selesai", "Every item must have status Selesai");
      }

      // Reset filter back to "all"
      await statusSelect.selectOption("all");
      await page.waitForTimeout(400);
    });

    // -------------------------------------------------------------------------
    // Subtest 6.3: Form Validation & Task Creation (Shared & Division Tasks)
    // -------------------------------------------------------------------------
    await t.test("6.3 TugasModal Validation, Shared & Division Task Creation, Persistence", async () => {
      // 1. Open SpeedDial -> Tambah Tugas
      const speedDialTrigger = page.locator('button[aria-label="Aksi Tugas"]');
      await speedDialTrigger.click();
      await page.waitForTimeout(200);

      const tambahTugasMenuItem = page.locator('button[role="menuitem"]:has-text("Tambah Tugas")');
      await assert.doesNotReject(tambahTugasMenuItem.waitFor({ state: "visible" }));
      await tambahTugasMenuItem.click();

      // Verify Modal opens
      const modal = page.locator('div[role="dialog"]:has-text("Tambah Tugas Baru")');
      await assert.doesNotReject(modal.waitFor({ state: "visible" }));

      // 2. Empty Form Validation Check
      const submitBtn = modal.locator('button[type="submit"]:has-text("Simpan Tugas")');
      await submitBtn.click();

      // HTML5 required validation prevents submission; modal remains open
      await page.waitForTimeout(300);
      assert.ok(await modal.isVisible(), "Modal must remain open when submitting empty required fields");

      const taskNameInput = modal.locator('input[placeholder*="Sewa tenda"]');
      const isInputInvalid = await taskNameInput.evaluate((el) => !el.checkValidity());
      assert.equal(isInputInvalid, true, "Task name input must trigger HTML5 validation when empty");

      // 3. Create Shared Task: E2E-TEST-TUGAS-BERSAMA (Seluruh Divisi + PJ)
      const seksiModalSelect = modal.locator('select:has(option[value="ALL"])');
      await seksiModalSelect.selectOption("ALL");
      await page.waitForTimeout(200);

      // Verify PJ dropdown appears conditionally below Seksi Pelaksana
      const pjDropdown = modal.locator('select:has(option:has-text("Pilih Penanggung Jawab"))');
      await assert.doesNotReject(pjDropdown.waitFor({ state: "visible" }));

      // Select PJ (option 1: e.g. first panitia member)
      const pjOptions = await pjDropdown.locator("option").all();
      assert.ok(pjOptions.length > 1, "PJ dropdown must contain panitia members");
      const pjValue = await pjOptions[1].getAttribute("value");
      if (pjValue) await pjDropdown.selectOption(pjValue);

      await taskNameInput.fill(TASK_NAME_BERSAMA);
      await modal.locator('textarea[placeholder*="Rincian teknis"]').fill("Koordinasi perlengkapan dan gladi bersih seluruh divisi panitia.");
      await modal.locator('input[type="date"]').fill("2026-10-10");

      // Submit Shared Task
      await submitBtn.click();

      // Verify Success Toast
      const toastSuccess1 = page.locator('div[role="status"]:has-text("Tugas baru berhasil ditambahkan")').first();
      await assert.doesNotReject(toastSuccess1.waitFor({ state: "visible", timeout: 5000 }));
      await modal.waitFor({ state: "hidden" });

      // Verify "Tugas Bersama (Semua Divisi)" section is rendered
      const sharedSectionHeading = page.locator('h2#tugas-bersama-heading:has-text("Tugas Bersama (Semua Divisi)")');
      await assert.doesNotReject(sharedSectionHeading.waitFor({ state: "visible" }));

      const bersamaCard = page.locator(`div.animate-stagger-item:has(h3:has-text("${TASK_NAME_BERSAMA}"))`).first();
      await assert.doesNotReject(bersamaCard.waitFor({ state: "visible" }));
      const bersamaText = await bersamaCard.textContent();
      assert.ok(bersamaText.includes("Tugas Bersama (Semua Divisi)"), "Card must display Tugas Bersama badge");
      assert.ok(bersamaText.includes("PJ:"), "Card must display assigned PJ");

      // 4. Create Division-Specific Task: E2E-TEST-TUGAS-DEKORASI (Seksi Perlengkapan)
      await speedDialTrigger.click();
      await page.waitForTimeout(200);
      await tambahTugasMenuItem.click();
      await modal.waitFor({ state: "visible" });

      // Select Seksi Perlengkapan (s-2)
      await modal.locator('select:has(option[value="ALL"])').selectOption("s-2");
      await page.waitForTimeout(200);

      // Verify PJ dropdown is hidden for specific seksi
      const isPjVisible = await modal.locator('select:has(option:has-text("Pilih Penanggung Jawab"))').isVisible();
      assert.equal(isPjVisible, false, "PJ dropdown must not be shown for division-specific task");

      await modal.locator('input[placeholder*="Sewa tenda"]').fill(TASK_NAME_DEKORASI);
      await modal.locator('textarea[placeholder*="Rincian teknis"]').fill("Pemasangan tenda sarnafil, panggung kehormatan, dan backdrop utama.");
      await modal.locator('select:has(option[value="Belum Mulai"])').last().selectOption("Belum Mulai");
      await modal.locator('input[type="date"]').fill("2026-10-09");

      // Submit Division Task
      await submitBtn.click();
      const toastSuccess2 = page.locator('div[role="status"]:has-text("Tugas baru berhasil ditambahkan")').first();
      await assert.doesNotReject(toastSuccess2.waitFor({ state: "visible", timeout: 5000 }));
      await modal.waitFor({ state: "hidden" });

      // Verify "Tugas Khusus Seksi" section contains TASK_NAME_DEKORASI
      const seksiSectionHeading = page.locator('h2#tugas-seksi-heading:has-text("Tugas Khusus Seksi")');
      await assert.doesNotReject(seksiSectionHeading.waitFor({ state: "visible" }));

      const dekorasiCard = page.locator(`div.animate-stagger-item:has(h3:has-text("${TASK_NAME_DEKORASI}"))`).first();
      await assert.doesNotReject(dekorasiCard.waitFor({ state: "visible" }));

      // 5. Database Persistence Check via page.reload() and direct SQL
      await page.reload({ waitUntil: "networkidle" });
      await assert.doesNotReject(page.locator(`div.animate-stagger-item:has(h3:has-text("${TASK_NAME_BERSAMA}"))`).first().waitFor({ state: "visible" }));
      await assert.doesNotReject(page.locator(`div.animate-stagger-item:has(h3:has-text("${TASK_NAME_DEKORASI}"))`).first().waitFor({ state: "visible" }));

      // Direct SQL check
      const conn = await getDbConnection();
      try {
        const [rows] = await conn.execute("SELECT id, nama_tugas, status, is_umum, seksi_id FROM tugas WHERE nama_tugas = ?", [TASK_NAME_DEKORASI]);
        assert.equal(rows.length, 1, "Task E2E-TEST-TUGAS-DEKORASI must exist in database");
        assert.equal(rows[0].status, "Belum Mulai", "Initial status in DB must be 'Belum Mulai'");
        assert.equal(rows[0].seksi_id, "s-2", "Task seksi_id must match Seksi Perlengkapan (s-2)");
      } finally {
        await conn.end();
      }
    });

    // -------------------------------------------------------------------------
    // Subtest 6.4: Status Change Transition (Belum Mulai -> Proses -> Selesai)
    // -------------------------------------------------------------------------
    await t.test("6.4 Inline Status Transition (Belum Mulai -> Proses -> Selesai), Toast & Recalculation", async () => {
      const dekorasiCard = page.locator(`div.animate-stagger-item:has(h3:has-text("${TASK_NAME_DEKORASI}"))`).first();
      await assert.doesNotReject(dekorasiCard.waitFor({ state: "visible" }));

      const statusSelect = dekorasiCard.locator(`select[aria-label="Ubah status ${TASK_NAME_DEKORASI}"]`);
      await assert.doesNotReject(statusSelect.waitFor({ state: "visible" }));
      assert.equal(await statusSelect.inputValue(), "Belum Mulai");

      // 1. Transition to "Proses"
      await statusSelect.selectOption("Proses");

      // Verify Toast notification
      const toastProses = page.locator('div[role="status"]:has-text("Status tugas diubah ke \\"Proses\\"")').first();
      await assert.doesNotReject(toastProses.waitFor({ state: "visible", timeout: 5000 }));

      // Verify visual style changes to amber
      await page.waitForTimeout(300);
      const classProses = await statusSelect.getAttribute("class");
      assert.ok(classProses.includes("bg-amber-50") || classProses.includes("text-amber-700"), "Status select must apply amber styling for Proses");

      // 2. Transition to "Selesai"
      await statusSelect.selectOption("Selesai");

      // Verify Toast notification
      const toastSelesai = page.locator('div[role="status"]:has-text("Status tugas diubah ke \\"Selesai\\"")').first();
      await assert.doesNotReject(toastSelesai.waitFor({ state: "visible", timeout: 5000 }));

      // Verify visual style changes to emerald
      await page.waitForTimeout(300);
      const classSelesai = await statusSelect.getAttribute("class");
      assert.ok(classSelesai.includes("bg-emerald-50") || classSelesai.includes("text-emerald-700"), "Status select must apply emerald styling for Selesai");

      // 3. Reload and Confirm Database Persistence
      await page.reload({ waitUntil: "networkidle" });
      const reloadedCard = page.locator(`div.animate-stagger-item:has(h3:has-text("${TASK_NAME_DEKORASI}"))`).first();
      await assert.doesNotReject(reloadedCard.waitFor({ state: "visible" }));
      const reloadedSelect = reloadedCard.locator(`select[aria-label="Ubah status ${TASK_NAME_DEKORASI}"]`);
      assert.equal(await reloadedSelect.inputValue(), "Selesai", "Status must persist as 'Selesai' after page reload");

      // Direct SQL check
      const conn = await getDbConnection();
      try {
        const [rows] = await conn.execute("SELECT status FROM tugas WHERE nama_tugas = ?", [TASK_NAME_DEKORASI]);
        assert.equal(rows[0].status, "Selesai", "Status in database must be 'Selesai'");
      } finally {
        await conn.end();
      }
    });

    // -------------------------------------------------------------------------
    // Subtest 6.5: Documentation File Upload, Preview Modal & Proof Deletion
    // -------------------------------------------------------------------------
    await t.test("6.5 Documentation Image Upload, Preview Modal Popup and Photo Deletion", async () => {
      const dekorasiCard = page.locator(`div.animate-stagger-item:has(h3:has-text("${TASK_NAME_DEKORASI}"))`).first();
      await assert.doesNotReject(dekorasiCard.waitFor({ state: "visible" }));

      // 1. Open Edit Modal on Card
      const editBtn = dekorasiCard.locator('button[aria-label="Edit tugas"]').first();
      await editBtn.click();

      const modal = page.locator('div[role="dialog"]:has-text("Edit Tugas")').first();
      await assert.doesNotReject(modal.waitFor({ state: "visible" }));

      // 2. Upload Sample PNG File
      const fileInput = modal.locator('input[type="file"][accept*="image"]');
      await fileInput.setInputFiles({
        name: "e2e-bukti-dekorasi.png",
        mimeType: "image/png",
        buffer: samplePngBuffer,
      });

      // Verify upload success toast
      const toastUpload = page.locator('div[role="status"]:has-text("Foto dokumentasi berhasil diunggah")').first();
      await assert.doesNotReject(toastUpload.waitFor({ state: "visible", timeout: 8000 }));

      // Verify thumbnail preview in modal
      const previewThumbnail = modal.locator('img[alt="Dokumentasi Tugas"]').first();
      await assert.doesNotReject(previewThumbnail.waitFor({ state: "visible" }));
      const thumbSrc = await previewThumbnail.getAttribute("src");
      assert.ok(thumbSrc && thumbSrc.startsWith("/uploads/dokumentasi/"), `Uploaded image src should start with /uploads/dokumentasi/, got: ${thumbSrc}`);

      // Save task with documentation photo
      await modal.locator('button[type="submit"]:has-text("Simpan Tugas")').click();
      const toastSaved = page.locator('div[role="status"]:has-text("Tugas berhasil diperbarui")').first();
      await assert.doesNotReject(toastSaved.waitFor({ state: "visible", timeout: 5000 }));
      await modal.waitFor({ state: "hidden" });

      // 3. Verify "Lihat Bukti Foto" button appears on Card
      const lihatFotoBtn = dekorasiCard.locator('button:has-text("Lihat Bukti Foto")').first();
      await assert.doesNotReject(lihatFotoBtn.waitFor({ state: "visible" }));

      // 4. Click "Lihat Bukti Foto" to open Image Preview Modal
      await lihatFotoBtn.click();

      const previewModal = page.locator('div[role="dialog"]:has-text("Dokumentasi / Bukti Tugas")').first();
      await assert.doesNotReject(previewModal.waitFor({ state: "visible" }));

      // Verify modal image and download link
      const previewImg = previewModal.locator('img[alt="Foto Dokumentasi"]').first();
      await assert.doesNotReject(previewImg.waitFor({ state: "visible" }));

      const openOriginalLink = previewModal.locator('a:has-text("Buka Gambar Asli ↗")').first();
      await assert.doesNotReject(openOriginalLink.waitFor({ state: "visible" }));
      const linkHref = await openOriginalLink.getAttribute("href");
      assert.ok(linkHref && linkHref.startsWith("/uploads/dokumentasi/"), `Link href must lead to uploaded file, got: ${linkHref}`);

      // Close Preview Modal
      const tutupBtn = previewModal.locator('button:has-text("Tutup")').first();
      await tutupBtn.click();
      await previewModal.waitFor({ state: "hidden" });

      // 5. Test Photo Proof Deletion via Edit Modal
      await editBtn.click();
      await modal.waitFor({ state: "visible" });

      const removePhotoBtn = modal.locator('button[aria-label="Hapus Foto Dokumentasi"]').first();
      await assert.doesNotReject(removePhotoBtn.waitFor({ state: "visible" }));
      await removePhotoBtn.click();

      // Verify thumbnail is removed from modal
      await assert.doesNotReject(previewThumbnail.waitFor({ state: "hidden" }));

      // Save updated task without photo
      await modal.locator('button[type="submit"]:has-text("Simpan Tugas")').click();
      await assert.doesNotReject(toastSaved.first().waitFor({ state: "visible", timeout: 5000 }));
      await modal.waitFor({ state: "hidden" });

      // Verify "Lihat Bukti Foto" button is no longer displayed on Card
      await assert.doesNotReject(lihatFotoBtn.waitFor({ state: "hidden" }));

      // Reload page and verify persistence of removed photo
      await page.reload({ waitUntil: "networkidle" });
      const reloadedCard = page.locator(`div.animate-stagger-item:has(h3:has-text("${TASK_NAME_DEKORASI}"))`).first();
      const reloadedLihatFoto = reloadedCard.locator('button:has-text("Lihat Bukti Foto")');
      assert.equal(await reloadedLihatFoto.isVisible(), false, "Lihat Bukti Foto must not be visible after photo proof deletion");
    });

    // -------------------------------------------------------------------------
    // Subtest 6.6: Delete Tasks with Confirmation Dialog
    // -------------------------------------------------------------------------
    await t.test("6.6 Delete Tasks with Confirmation Dialog and Verification", async () => {
      // 1. Delete TASK_NAME_DEKORASI
      const dekorasiCard = page.locator(`div.animate-stagger-item:has(h3:has-text("${TASK_NAME_DEKORASI}"))`).first();
      const deleteDekorasiBtn = dekorasiCard.locator('button[aria-label="Hapus tugas"]').first();
      await deleteDekorasiBtn.click();

      // Confirm dialog appears
      const confirmDialog = page.locator('div[role="dialog"]:has-text("Hapus Tugas")').first();
      await assert.doesNotReject(confirmDialog.waitFor({ state: "visible" }));

      // Confirm deletion
      const confirmActionBtn = confirmDialog.locator('button:has-text("Ya, Lanjutkan")').first();
      await confirmActionBtn.click();

      const toastDeleted1 = page.locator('div[role="status"]:has-text("Tugas berhasil dihapus")').first();
      await assert.doesNotReject(toastDeleted1.waitFor({ state: "visible", timeout: 5000 }));
      await confirmDialog.waitFor({ state: "hidden" });
      await assert.doesNotReject(dekorasiCard.waitFor({ state: "hidden" }));

      // 2. Delete TASK_NAME_BERSAMA
      const bersamaCard = page.locator(`div.animate-stagger-item:has(h3:has-text("${TASK_NAME_BERSAMA}"))`).first();
      if (await bersamaCard.isVisible()) {
        const deleteBersamaBtn = bersamaCard.locator('button[aria-label="Hapus tugas"]').first();
        await deleteBersamaBtn.click();
        await confirmDialog.waitFor({ state: "visible" });
        await confirmActionBtn.click();
        await assert.doesNotReject(toastDeleted1.first().waitFor({ state: "visible", timeout: 5000 }));
        await confirmDialog.waitFor({ state: "hidden" });
        await assert.doesNotReject(bersamaCard.waitFor({ state: "hidden" }));
      }

      // 3. Confirm Persistence of Deletion via Page Reload
      await page.reload({ waitUntil: "networkidle" });
      const mainTextAfter = await page.locator("main").textContent();
      assert.ok(!mainTextAfter.includes(TASK_NAME_DEKORASI), "Deleted task TASK_NAME_DEKORASI must not exist after reload");
      assert.ok(!mainTextAfter.includes(TASK_NAME_BERSAMA), "Deleted task TASK_NAME_BERSAMA must not exist after reload");
    });

    // -------------------------------------------------------------------------
    // Subtest 6.7: Direct Database & Storage Teardown Verification
    // -------------------------------------------------------------------------
    await t.test("6.7 Direct MariaDB & Storage Teardown Verification", async () => {
      await cleanupTestData();

      const conn = await getDbConnection();
      try {
        const [rows] = await conn.execute("SELECT count(*) as count FROM tugas WHERE nama_tugas LIKE 'E2E-TEST-%'");
        assert.equal(Number(rows[0].count), 0, "No residual E2E-TEST records should exist in tugas table");
      } finally {
        await conn.end();
      }
    });

    // -------------------------------------------------------------------------
    // Subtest 6.8: Zero Console Errors Assertion
    // -------------------------------------------------------------------------
    await t.test("6.8 Zero Console Errors or Unhandled Exceptions", async () => {
      assert.deepEqual(consoleErrors, [], `Expected 0 console errors, encountered ${consoleErrors.length}:\n${consoleErrors.join("\n")}`);
      console.log("✅ Page 6: Tugas per Seksi Headed Playwright E2E Test PASSED with ZERO console errors!");
    });

  } finally {
    // Teardown and close browser
    await cleanupTestData();
    await page.close();
    await context.close();
    await browser.close();
  }
});

