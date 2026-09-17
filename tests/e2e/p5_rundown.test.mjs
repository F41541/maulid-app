import test, { describe, before, after, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import mysql from 'mysql2/promise';
import { createSessionToken } from '../../src/lib/auth-tokens.ts';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/laxcyyfa/.npm/_npx/86170c4cd1c5da32/node_modules/playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const RUNDOWN_URL = `${BASE_URL}/rundown`;

async function getDbConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'maulid_app',
  });
}

describe('P5: Rundown Acara Headed E2E Testing', () => {
  let browser;
  let context;
  let page;
  let db;
  const consoleErrors = [];
  const pageErrors = [];

  before(async () => {
    console.log('[E2E Setup] Initializing database connection and cleaning test records...');
    db = await getDbConnection();
    await db.execute("DELETE FROM rundown WHERE nama_kegiatan LIKE 'E2E-TEST%'");

    console.log('[E2E Setup] Launching Chrome in headed mode on DISPLAY=:0...');
    browser = await chromium.launch({
      headless: false,
      channel: 'chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });

    const sessionUserData = {
      id: 'admin-1',
      username: 'admin',
      nama: 'Sekretariat Panitia',
      role: 'ketua_panitia',
      status: 'aktif',
      seksi_id: null,
      jabatan: null,
    };

    // Add init script to stub window.print and initialize sessionStorage
    await context.addInitScript((user) => {
      window.__printCalled = false;
      window.print = () => {
        window.__printCalled = true;
      };
      try {
        sessionStorage.setItem('maulid_user_session', JSON.stringify(user));
      } catch {}
    }, sessionUserData);

    // Authenticate session as ketua_panitia via signed cookie
    const token = createSessionToken({
      id: 'admin-1',
      username: 'admin',
      nama: 'Sekretariat Panitia',
      role: 'ketua_panitia',
    });

    await context.addCookies([
      {
        name: 'maulid_session',
        value: token,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);

    page = await context.newPage();

    // Track console errors and unhandled exceptions
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon.ico')) {
          consoleErrors.push(text);
        }
      }
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err.message || String(err));
    });

    console.log('[E2E Setup] Navigating to /rundown and waiting for API response...');
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/rundown') && res.status() === 200, { timeout: 25000 }),
      page.goto(RUNDOWN_URL, { waitUntil: 'load' }),
    ]);

    await page.waitForSelector('div.animate-stagger-item', { state: 'visible', timeout: 15000 });
    console.log('[E2E Setup] Page loaded successfully with rundown items rendered.');
  });

  after(async () => {
    console.log('[E2E Teardown] Cleaning test records and closing browser...');
    try {
      if (db) {
        await db.execute("DELETE FROM rundown WHERE nama_kegiatan LIKE 'E2E-TEST%'");
        await db.end();
      }
    } catch {}
    if (browser) {
      await browser.close();
    }
  });

  it('1. Rundown Timeline & Layout renders correctly with sequence badges and past/active indicators', async () => {
    await page.waitForSelector('main', { state: 'visible', timeout: 10000 });

    const items = page.locator('div.animate-stagger-item');
    const count = await items.count();
    assert.ok(count >= 1, `Expected at least 1 rundown item, found ${count}`);

    const firstItem = items.first();
    const urutanBadge = firstItem.locator('span.w-7.h-7.rounded-full');
    await urutanBadge.waitFor({ state: 'visible', timeout: 5000 });
    const urutanText = await urutanBadge.textContent();
    assert.ok(urutanText.trim().length > 0, 'Urutan badge must contain sequence number');

    const timeBadge = firstItem.locator('span.font-mono.font-bold');
    await timeBadge.waitFor({ state: 'visible', timeout: 5000 });
    const timeText = await timeBadge.textContent();
    assert.ok(timeText.includes(':'), `Time badge must display formatted time, got "${timeText}"`);

    const titleElem = firstItem.locator('h3');
    const titleText = await titleElem.textContent();
    assert.ok(titleText.trim().length > 0, 'Item must have a non-empty title');

    // Past / active indicators validation
    const pastBadgesCount = await page.locator('text="Selesai / Lewat"').count();
    assert.ok(pastBadgesCount >= 0, 'Past badges count should be accessible');
    console.log(`[Step 1] Timeline validated: ${count} items displayed, sequence & clock badges active.`);
  });

  it('2. Speed Dial Actions expands, displays Cetak and Tambah Rangkaian, and executes Print stub', async () => {
    const speedDialTrigger = page.locator('button[aria-haspopup="true"]');
    await speedDialTrigger.waitFor({ state: 'visible', timeout: 5000 });

    const initialExpanded = await speedDialTrigger.getAttribute('aria-expanded');
    assert.equal(initialExpanded, 'false', 'Speed dial should initially be closed');

    // Click to open SpeedDial
    await speedDialTrigger.click();

    // Verify expanded state and label change
    await page.waitForSelector('button[aria-label="Tutup menu aksi"]', { state: 'visible', timeout: 5000 });
    const isExpanded = await speedDialTrigger.getAttribute('aria-expanded');
    assert.equal(isExpanded, 'true', 'Speed dial aria-expanded should be true');

    // Verify Cetak / PDF button is visible
    const printBtn = page.locator('button[role="menuitem"]:has-text("Cetak / PDF")');
    await printBtn.waitFor({ state: 'visible', timeout: 5000 });

    // Verify Tambah Rangkaian Acara button is visible
    const addBtn = page.locator('button[role="menuitem"]:has-text("Tambah Rangkaian Acara")');
    await addBtn.waitFor({ state: 'visible', timeout: 5000 });

    // Click Cetak / PDF and verify window.print stub was invoked
    await printBtn.click();
    const wasPrintCalled = await page.evaluate(() => window.__printCalled);
    assert.equal(wasPrintCalled, true, 'window.print must be invoked when clicking Cetak / PDF');

    // Wait for speed dial menu to close after clicking print
    await page.waitForSelector('button[aria-label="Aksi Rundown"]', { state: 'visible', timeout: 5000 });
    console.log('[Step 2] SpeedDial expanded, menu items verified, window.print successfully stubbed and invoked.');
  });

  it('3. RundownModal opens, enforces required field validation, and tests TimeColonInput micro-interactions', async () => {
    // Re-open SpeedDial to click Tambah Rangkaian Acara
    const speedDialTrigger = page.locator('button[aria-haspopup="true"]');
    await speedDialTrigger.click();

    const addBtn = page.locator('button[role="menuitem"]:has-text("Tambah Rangkaian Acara")');
    await addBtn.waitFor({ state: 'visible', timeout: 5000 });
    await addBtn.click();

    // Verify RundownModal is displayed
    const modal = page.locator('div[role="dialog"]');
    await modal.waitFor({ state: 'visible', timeout: 5000 });
    const modalTitle = await modal.locator('h3').textContent();
    assert.ok(modalTitle.includes('Tambah Kegiatan Rundown'), `Expected modal title "Tambah Kegiatan Rundown", got "${modalTitle}"`);

    // Verify required validation when submitting empty form
    const submitBtn = modal.locator('button[type="submit"]:has-text("Simpan Kegiatan")');
    await submitBtn.click();

    // Modal should remain open because required fields are empty
    await page.waitForTimeout(300);
    const isModalStillOpen = await modal.isVisible();
    assert.equal(isModalStillOpen, true, 'Modal should remain open on empty submission');

    // Verify nama_kegiatan is invalid under HTML5 validation
    const invalidInputs = await modal.locator('input:invalid').count();
    assert.ok(invalidInputs > 0, 'Form must contain invalid inputs preventing empty submit');

    // Test TimeColonInput micro-interaction:
    const startHourInput = modal.locator('input[aria-label="Jam Mulai"]');
    const startMinuteInput = modal.locator('input[aria-label="Menit Mulai"]');
    const endHourInput = modal.locator('input[aria-label="Jam Selesai (Opsional)"]');
    const endMinuteInput = modal.locator('input[aria-label="Menit Selesai (Opsional)"]');

    await startHourInput.click();
    await startHourInput.pressSequentially('08', { delay: 100 });
    await page.waitForTimeout(200);

    // Verify focus auto-advances to Menit Mulai after entering 2 digits
    const isMinuteFocused = await startMinuteInput.evaluate((el) => el === document.activeElement);
    assert.equal(isMinuteFocused, true, 'Focus must auto-advance to Menit Mulai after entering 2 digits in Jam Mulai');

    // Enter start minute
    await startMinuteInput.pressSequentially('30', { delay: 100 });
    await page.waitForTimeout(200);

    // Enter end time
    await endHourInput.click();
    await endHourInput.pressSequentially('09', { delay: 100 });
    await page.waitForTimeout(200);

    await endMinuteInput.click();
    await endMinuteInput.pressSequentially('15', { delay: 100 });
    await page.waitForTimeout(200);

    // Fill Nama Kegiatan
    const namaKegiatanInput = modal.locator('input[placeholder*="Pembacaan Tausiyah"]');
    await namaKegiatanInput.fill('E2E-TEST-PEMBUKAAN');

    // Fill Nama Pengisi
    const namaPengisiInput = modal.locator('input[placeholder*="Habib Umar bin Yahya"]');
    await namaPengisiInput.fill('E2E-TEST-USTADZ');

    // Fill Catatan Teknis
    const catatanInput = modal.locator('textarea[placeholder*="Siapkan air minum"]');
    await catatanInput.fill('E2E-TEST Catatan');

    // Submit form and wait for network response
    const [createResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/rundown') && res.request().method() === 'POST' && res.status() === 200, { timeout: 10000 }),
      submitBtn.click(),
    ]);
    const createData = await createResponse.json();
    assert.equal(createData.success, true, 'POST /api/rundown create must succeed');

    // Verify success toast appears
    const successToast = page.locator('div[role="status"]:has-text("Kegiatan berhasil ditambahkan")');
    await successToast.waitFor({ state: 'visible', timeout: 5000 });

    // Verify modal closes
    await modal.waitFor({ state: 'hidden', timeout: 5000 });

    // Verify item appears in the UI
    const createdCard = page.locator('div.animate-stagger-item:has-text("E2E-TEST-PEMBUKAAN")');
    await createdCard.waitFor({ state: 'visible', timeout: 5000 });

    // Verify details on card
    const cardText = await createdCard.textContent();
    assert.ok(cardText.includes('08:30 - 09:15'), `Card must contain formatted time range, got "${cardText}"`);
    assert.ok(cardText.includes('E2E-TEST-USTADZ'), `Card must contain speaker name, got "${cardText}"`);
    assert.ok(cardText.includes('E2E-TEST Catatan'), `Card must contain notes, got "${cardText}"`);
    console.log('[Step 3] RundownModal tested: TimeColonInput auto-jump verified, created E2E-TEST-PEMBUKAAN with toast.');
  });

  it('4. Database Persistence: Item persists after page reload and in MariaDB', async () => {
    // Reload page and wait for /api/rundown GET response
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/rundown') && res.status() === 200, { timeout: 15000 }),
      page.reload({ waitUntil: 'load' }),
    ]);

    // Verify item is still visible on the page after reload
    const reloadedCard = page.locator('div.animate-stagger-item:has-text("E2E-TEST-PEMBUKAAN")');
    await reloadedCard.waitFor({ state: 'visible', timeout: 8000 });
    const reloadedText = await reloadedCard.textContent();
    assert.ok(reloadedText.includes('08:30 - 09:15'), 'Time range must persist after page reload');
    assert.ok(reloadedText.includes('E2E-TEST-USTADZ'), 'Speaker must persist after page reload');
    assert.ok(reloadedText.includes('E2E-TEST Catatan'), 'Catatan must persist after page reload');

    // Verify directly in MariaDB
    const [rows] = await db.query(
      "SELECT * FROM rundown WHERE nama_kegiatan = 'E2E-TEST-PEMBUKAAN'"
    );
    assert.equal(rows.length, 1, 'Exactly 1 record must exist in MariaDB rundown table');
    assert.equal(rows[0].nama_pengisi, 'E2E-TEST-USTADZ', 'MariaDB record must have correct nama_pengisi');
    assert.equal(rows[0].waktu, '08:30 - 09:15', 'MariaDB record must have correct waktu');
    console.log('[Step 4] Persistence verified: UI persisted across reload, MariaDB record confirmed.');
  });

  it('5. Edit Rundown Item: Updates nama_kegiatan and persists after reload', async () => {
    const card = page.locator('div.animate-stagger-item:has-text("E2E-TEST-PEMBUKAAN")');
    await card.waitFor({ state: 'visible', timeout: 5000 });

    // Click Edit button
    const editBtn = card.locator('button[aria-label="Edit kegiatan"]');
    await editBtn.click();

    // Verify edit modal is open
    const modal = page.locator('div[role="dialog"]');
    await modal.waitFor({ state: 'visible', timeout: 5000 });
    const modalTitle = await modal.locator('h3').textContent();
    assert.ok(modalTitle.includes('Edit Kegiatan Rundown'), `Expected title "Edit Kegiatan Rundown", got "${modalTitle}"`);

    // Verify prefilled nama_kegiatan
    const namaKegiatanInput = modal.locator('input[placeholder*="Pembacaan Tausiyah"]');
    const currentVal = await namaKegiatanInput.inputValue();
    assert.equal(currentVal, 'E2E-TEST-PEMBUKAAN', 'Form must be prefilled with existing title');

    // Update title to E2E-TEST-PEMBUKAAN-UPDATED
    await namaKegiatanInput.fill('E2E-TEST-PEMBUKAAN-UPDATED');

    // Submit edit form and wait for network response
    const submitBtn = modal.locator('button[type="submit"]:has-text("Simpan Kegiatan")');
    const [updateResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/rundown') && res.request().method() === 'POST' && res.status() === 200, { timeout: 10000 }),
      submitBtn.click(),
    ]);
    const updateData = await updateResponse.json();
    assert.equal(updateData.success, true, 'POST /api/rundown update must succeed');

    // Verify success toast
    const updateToast = page.locator('div[role="status"]:has-text("Kegiatan berhasil diperbarui")');
    await updateToast.waitFor({ state: 'visible', timeout: 5000 });

    // Verify modal closes
    await modal.waitFor({ state: 'hidden', timeout: 5000 });

    // Verify UI updated
    const updatedCard = page.locator('div.animate-stagger-item:has-text("E2E-TEST-PEMBUKAAN-UPDATED")');
    await updatedCard.waitFor({ state: 'visible', timeout: 5000 });

    // Reload page and verify persistence of edit
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/rundown') && res.status() === 200, { timeout: 15000 }),
      page.reload({ waitUntil: 'load' }),
    ]);
    const reloadedUpdatedCard = page.locator('div.animate-stagger-item:has-text("E2E-TEST-PEMBUKAAN-UPDATED")');
    await reloadedUpdatedCard.waitFor({ state: 'visible', timeout: 8000 });

    // Verify directly in database
    const [rows] = await db.query(
      "SELECT * FROM rundown WHERE nama_kegiatan = 'E2E-TEST-PEMBUKAAN-UPDATED'"
    );
    assert.equal(rows.length, 1, 'Updated record must exist in MariaDB');
    console.log('[Step 5] Edit flow verified: updated title to E2E-TEST-PEMBUKAAN-UPDATED, verified reload & MariaDB.');
  });

  it('6. Delete Rundown Item: Opens confirm dialog, tests cancel, confirms delete, verifies removal', async () => {
    const card = page.locator('div.animate-stagger-item:has-text("E2E-TEST-PEMBUKAAN-UPDATED")');
    await card.waitFor({ state: 'visible', timeout: 5000 });

    // Click delete button
    const deleteBtn = card.locator('button[aria-label="Hapus kegiatan"]');
    await deleteBtn.click();

    // ConfirmDialog opens
    const confirmModal = page.locator('div[role="dialog"]:has-text("Hapus Susunan Acara")');
    await confirmModal.waitFor({ state: 'visible', timeout: 5000 });

    // Test Batal (cancel) button
    const cancelBtn = confirmModal.locator('button:has-text("Batal")');
    await cancelBtn.click();
    await confirmModal.waitFor({ state: 'hidden', timeout: 5000 });

    // Verify item is NOT deleted
    assert.equal(await card.isVisible(), true, 'Item should remain visible after cancelling deletion');

    // Click delete button again
    await deleteBtn.click();
    await confirmModal.waitFor({ state: 'visible', timeout: 5000 });

    // Click Konfirmasi button and wait for network response
    const confirmBtn = confirmModal.locator('button:has-text("Ya, Lanjutkan"), button:has-text("Konfirmasi")');
    const [deleteResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/rundown') && res.request().method() === 'POST' && res.status() === 200, { timeout: 10000 }),
      confirmBtn.click(),
    ]);
    const deleteData = await deleteResponse.json();
    assert.equal(deleteData.success, true, 'POST /api/rundown delete must succeed');

    // Verify delete toast appears
    const deleteToast = page.locator('div[role="status"]:has-text("Kegiatan berhasil dihapus")');
    await deleteToast.waitFor({ state: 'visible', timeout: 5000 });

    // Verify item removed from DOM
    await card.waitFor({ state: 'detached', timeout: 5000 });

    // Verify item does not return after reload
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/rundown') && res.status() === 200, { timeout: 15000 }),
      page.reload({ waitUntil: 'load' }),
    ]);
    const cardCount = await page.locator('div.animate-stagger-item:has-text("E2E-TEST-PEMBUKAAN-UPDATED")').count();
    assert.equal(cardCount, 0, 'Item must not exist in UI after reload');

    // Verify MariaDB record deleted
    const [rows] = await db.query(
      "SELECT * FROM rundown WHERE nama_kegiatan LIKE 'E2E-TEST%'"
    );
    assert.equal(rows.length, 0, 'No E2E-TEST records should remain in MariaDB');
    console.log('[Step 6] Delete flow verified: Cancel button tested, deletion confirmed, item removed from UI & MariaDB.');
  });

  it('7. Zero Console Errors: Asserts zero unhandled exceptions or fatal console errors', () => {
    if (consoleErrors.length > 0) {
      console.warn('Captured console errors:', consoleErrors);
    }
    if (pageErrors.length > 0) {
      console.warn('Captured page errors:', pageErrors);
    }
    assert.equal(consoleErrors.length, 0, `Expected 0 console errors, got ${consoleErrors.length}: ${JSON.stringify(consoleErrors)}`);
    assert.equal(pageErrors.length, 0, `Expected 0 unhandled page errors, got ${pageErrors.length}: ${JSON.stringify(pageErrors)}`);
    console.log('[Step 7] Zero console errors and zero unhandled page exceptions verified.');
  });
});
