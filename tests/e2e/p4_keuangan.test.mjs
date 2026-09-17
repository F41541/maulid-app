/**
 * Comprehensive Headed Playwright E2E Test for Page 4: Keuangan Kas (/(portal)/keuangan)
 *
 * Requirements:
 * - Headed Google Chrome launch on DISPLAY=:0 with args ['--no-sandbox', '--disable-setuid-sandbox']
 * - Stub window.print to prevent browser blocking
 * - Verify Balance summary cards (Total, Dompet Cash, Rekening Bank)
 * - Verify 5 filters (Tipe, Kanal, Status, Date range, Reset) and Pagination
 * - Verify SpeedDial actions (Cetak / PDF, Ekspor Excel, Mutasi Antar-Kas, + Kas Masuk, + Kas Keluar)
 * - Test Kas Masuk modal with E2E-TEST-MASUK-100K, verify persistence & balance update (+100k)
 * - Test Kas Keluar modal with E2E-TEST-KELUAR-30K, verify persistence & balance update (-30k)
 * - Test Mutasi Kas internal with E2E-TEST-MUTASI-20K, verify paired transactions & canal shifts
 * - Test VOID integrity on E2E-TEST-MASUK-100K:
 *     - Required reason validation
 *     - Reason: E2E-TEST Pembatalan Uji Otomatis
 *     - Reversal record created & double-entry balance correction verified
 * - Verify reload persistence across all steps
 * - Comprehensive teardown: delete all E2E-TEST records from MariaDB
 * - Assert zero unhandled exceptions and fatal console errors
 */

import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/laxcyyfa/.npm/_npx/86170c4cd1c5da32/node_modules/playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'maulid_app',
};

function parseRupiah(str) {
  if (!str) return 0;
  const clean = str.replace(/[^0-9-]/g, '');
  return parseInt(clean, 10) || 0;
}

async function cleanTestData() {
  const conn = await mysql.createConnection(DB_CONFIG);
  try {
    const [result] = await conn.execute(
      "DELETE FROM keuangan WHERE keterangan LIKE '%E2E-TEST%' OR void_reason LIKE '%E2E-TEST%'"
    );
    console.log(`[DB Teardown] Cleaned test records, rows affected: ${result.affectedRows}`);
  } finally {
    await conn.end();
  }
}

async function countTestData() {
  const conn = await mysql.createConnection(DB_CONFIG);
  try {
    const [rows] = await conn.query(
      "SELECT COUNT(*) as count FROM keuangan WHERE keterangan LIKE '%E2E-TEST%' OR void_reason LIKE '%E2E-TEST%'"
    );
    return rows[0].count;
  } finally {
    await conn.end();
  }
}

async function getBalances(page) {
  const totalCard = page.locator('div.rounded-2xl', { has: page.locator('span:has-text("Total Semua Saldo Kas")') });
  const cashCard = page.locator('div.rounded-2xl', { has: page.locator('span:has-text("Saldo Dompet (Tunai / Cash)")') });
  const tfCard = page.locator('div.rounded-2xl', { has: page.locator('span:has-text("Saldo Rekening (Transfer Bank)")') });

  const totalText = await totalCard.locator('h2').innerText();
  const cashText = await cashCard.locator('h2').innerText();
  const tfText = await tfCard.locator('h2').innerText();

  return {
    total: parseRupiah(totalText),
    cash: parseRupiah(cashText),
    transfer: parseRupiah(tfText),
  };
}

async function changeFilterAndWait(page, selectLocator, value) {
  await Promise.all([
    page.waitForResponse((resp) => resp.url().includes('/api/keuangan') && resp.status() === 200),
    selectLocator.selectOption(value),
  ]);
  await page.waitForSelector('tbody tr td div.animate-shimmer', { state: 'detached', timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);
}

async function reloadAndWait(page) {
  await Promise.all([
    page.waitForResponse((resp) => resp.url().includes('/api/keuangan') && resp.status() === 200),
    page.reload(),
  ]);
  await page.waitForSelector('tbody tr td div.animate-shimmer', { state: 'detached', timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(400);
}

async function openSpeedDial(page) {
  const menu = page.locator('div[role="menu"][aria-label="Daftar Aksi Cepat"]');
  if (await menu.isVisible()) {
    return;
  }
  const trigger = page.locator('button[aria-label="Aksi Keuangan"], button[aria-label="Tutup menu aksi"]');
  await trigger.click();
  await menu.waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(200);
}

async function run() {
  console.log('===============================================================');
  console.log('🚀 STARTING HEADED PLAYWRIGHT E2E TEST: PAGE 4 (KEUANGAN KAS)');
  console.log('===============================================================');

  // Pre-test cleanup
  await cleanTestData();

  const consoleErrors = [];
  const pageErrors = [];

  console.log('🌐 Launching Chrome in Headed mode on DISPLAY=:0 ...');
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  // Stub window.print
  await page.addInitScript(() => {
    window.__printCalled = false;
    window.print = () => {
      window.__printCalled = true;
      console.log('[STUB] window.print() invoked successfully');
    };
  });

  // Track console errors & unhandled exceptions
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon.ico')) {
        consoleErrors.push(text);
        console.error(`[Browser Console Error]: ${text}`);
      }
    }
  });

  page.on('pageerror', (err) => {
    const text = err.message || String(err);
    pageErrors.push(text);
    console.error(`[Browser Page Error]: ${text}`);
  });

  try {
    // -------------------------------------------------------------
    // STEP 1: AUTHENTICATION & PORTAL NAVIGATION
    // -------------------------------------------------------------
    console.log('\n🔑 STEP 1: Logging in as Admin ...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[autocomplete="username"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]:has-text("Masuk ke Dashboard")');

    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('✅ Successfully authenticated and reached /dashboard');

    console.log('🧭 Navigating to Keuangan Kas via Sidebar ...');
    const keuanganLink = page.locator('aside[aria-label="Sidebar Panitia"] a[href="/keuangan"]');
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/api/keuangan') && resp.status() === 200),
      keuanganLink.click(),
    ]);
    await page.waitForURL('**/keuangan', { timeout: 10000 });
    await page.waitForSelector('main', { timeout: 10000 });
    await page.waitForSelector('table', { timeout: 10000 });
    await page.waitForSelector('tbody tr td div.animate-shimmer', { state: 'detached', timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400);
    console.log('✅ Successfully navigated to /keuangan');

    // -------------------------------------------------------------
    // STEP 2: SUMMARY & BALANCE CARDS VERIFICATION
    // -------------------------------------------------------------
    console.log('\n📊 STEP 2: Verifying Summary & Balance Cards ...');
    const initialBalances = await getBalances(page);

    console.log(`- Initial Saldo Total: Rp ${initialBalances.total.toLocaleString('id-ID')}`);
    console.log(`- Initial Saldo Cash:  Rp ${initialBalances.cash.toLocaleString('id-ID')}`);
    console.log(`- Initial Saldo Bank:  Rp ${initialBalances.transfer.toLocaleString('id-ID')}`);

    assert.equal(
      initialBalances.total,
      initialBalances.cash + initialBalances.transfer,
      'Saldo Total must equal Saldo Cash + Saldo Bank'
    );
    console.log('✅ Balance Card aggregation math verified');

    // -------------------------------------------------------------
    // STEP 3: FILTER BAR & PAGINATION CONTROLS
    // -------------------------------------------------------------
    console.log('\n🔍 STEP 3: Testing 5 Filters & Pagination Controls ...');

    // 3.1 Filter Tipe
    console.log('Testing Filter Tipe (masuk / keluar / all) ...');
    const tipeSelect = page.locator('select[aria-label="Filter Tipe Transaksi"]');
    await changeFilterAndWait(page, tipeSelect, 'masuk');
    let tipeColumnBadges = await page.locator('tbody tr td:first-child').allInnerTexts();
    for (const badgeText of tipeColumnBadges) {
      if (badgeText.trim()) {
        assert.ok(badgeText.includes('Masuk'), `Tipe column must show Masuk badge, got: ${badgeText}`);
      }
    }

    await changeFilterAndWait(page, tipeSelect, 'keluar');
    tipeColumnBadges = await page.locator('tbody tr td:first-child').allInnerTexts();
    for (const badgeText of tipeColumnBadges) {
      if (badgeText.trim()) {
        assert.ok(badgeText.includes('Keluar'), `Tipe column must show Keluar badge, got: ${badgeText}`);
      }
    }
    await changeFilterAndWait(page, tipeSelect, 'all');
    console.log('✅ Filter Tipe passed');

    // 3.2 Filter Kanal Saldo
    console.log('Testing Filter Kanal Saldo (cash / transfer / all) ...');
    const kanalSelect = page.locator('select[aria-label="Filter Kanal Saldo"]');
    await changeFilterAndWait(page, kanalSelect, 'cash');
    let kanalColumnBadges = await page.locator('tbody tr td:nth-child(2)').allInnerTexts();
    for (const badgeText of kanalColumnBadges) {
      if (badgeText.trim()) {
        assert.ok(badgeText.includes('Dompet Cash'), `Kanal column must show Dompet Cash, got: ${badgeText}`);
      }
    }

    await changeFilterAndWait(page, kanalSelect, 'transfer');
    kanalColumnBadges = await page.locator('tbody tr td:nth-child(2)').allInnerTexts();
    for (const badgeText of kanalColumnBadges) {
      if (badgeText.trim()) {
        assert.ok(badgeText.includes('Rekening Bank'), `Kanal column must show Rekening Bank, got: ${badgeText}`);
      }
    }
    await changeFilterAndWait(page, kanalSelect, 'all');
    console.log('✅ Filter Kanal Saldo passed');

    // 3.3 Filter Status
    console.log('Testing Filter Status (aktif / void / all) ...');
    const statusSelect = page.locator('select[aria-label="Filter Status Transaksi"]');
    await changeFilterAndWait(page, statusSelect, 'void');
    await changeFilterAndWait(page, statusSelect, 'all');
    await changeFilterAndWait(page, statusSelect, 'aktif');
    console.log('✅ Filter Status passed');

    // 3.4 Filter Date Range & Reset
    console.log('Testing Date Range Filter & Reset Button ...');
    const fromDateInput = page.locator('input[type="date"][aria-label="Filter Dari Tanggal"]');
    const toDateInput = page.locator('input[type="date"][aria-label="Filter Sampai Tanggal"]');

    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/api/keuangan') && resp.status() === 200),
      fromDateInput.fill('2026-01-01'),
    ]);
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/api/keuangan') && resp.status() === 200),
      toDateInput.fill('2026-12-31'),
    ]);
    await page.waitForTimeout(300);

    const resetDateBtn = page.locator('button:has-text("Reset Tanggal")');
    await assert.ok(await resetDateBtn.isVisible(), 'Reset Tanggal button must appear when date filter is set');

    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/api/keuangan') && resp.status() === 200),
      resetDateBtn.click(),
    ]);
    await page.waitForTimeout(300);

    assert.equal(await fromDateInput.inputValue(), '', 'From date input must be empty after reset');
    assert.equal(await toDateInput.inputValue(), '', 'To date input must be empty after reset');
    console.log('✅ Date Range Filter and Reset Tanggal passed');

    // 3.5 Pagination
    console.log('Testing Pagination Controls ...');
    const paginationText = page.locator('text=Menampilkan');
    if (await paginationText.isVisible()) {
      const prevBtn = page.locator('button[aria-label="Halaman Sebelumnya"]');
      const nextBtn = page.locator('button[aria-label="Halaman Selanjutnya"]');
      await assert.ok(await prevBtn.isVisible(), 'Previous page button must exist');
      await assert.ok(await nextBtn.isVisible(), 'Next page button must exist');
      console.log('✅ Pagination controls verified');
    } else {
      console.log('ℹ️ Table has <= 20 rows, pagination info correctly hidden or compact');
    }

    // -------------------------------------------------------------
    // STEP 4: SPEED DIAL CONTROLS (Print, Export, Mutasi, Masuk, Keluar)
    // -------------------------------------------------------------
    console.log('\n⚡ STEP 4: Testing Speed Dial Actions ...');
    await openSpeedDial(page);

    const printItem = page.locator('button[role="menuitem"]:has-text("Cetak / PDF")');
    const exportItem = page.locator('button[role="menuitem"]:has-text("Ekspor Excel (.xlsx)")');
    const mutasiItem = page.locator('button[role="menuitem"]:has-text("Mutasi Antar-Kas")');
    const masukItem = page.locator('button[role="menuitem"]:has-text("+ Kas Masuk")');
    const keluarItem = page.locator('button[role="menuitem"]:has-text("+ Kas Keluar")');

    await assert.ok(await printItem.isVisible(), 'SpeedDial Cetak must be visible');
    await assert.ok(await exportItem.isVisible(), 'SpeedDial Ekspor Excel must be visible');
    await assert.ok(await mutasiItem.isVisible(), 'SpeedDial Mutasi must be visible');
    await assert.ok(await masukItem.isVisible(), 'SpeedDial + Kas Masuk must be visible');
    await assert.ok(await keluarItem.isVisible(), 'SpeedDial + Kas Keluar must be visible');

    // Test Print Trigger
    console.log('Testing SpeedDial Print Action ...');
    await printItem.click();
    await page.locator('div[role="menu"][aria-label="Daftar Aksi Cepat"]').waitFor({ state: 'hidden', timeout: 5000 });
    const printWasCalled = await page.evaluate(() => window.__printCalled);
    assert.equal(printWasCalled, true, 'window.print must have been invoked');
    console.log('✅ Print trigger verified successfully');

    // Test Export Excel Trigger
    console.log('Testing SpeedDial Export Excel Action ...');
    await openSpeedDial(page);
    await page.locator('button[role="menuitem"]:has-text("Ekspor Excel (.xlsx)")').click();
    const toastExport = page.locator('div[role="status"]:has-text("Berhasil mengekspor")');
    await toastExport.waitFor({ state: 'visible', timeout: 8000 });
    console.log('✅ Excel export trigger and toast feedback verified');

    // -------------------------------------------------------------
    // STEP 5: KAS MASUK FORM (Create Transaction) & PERSISTENCE
    // -------------------------------------------------------------
    console.log('\n📥 STEP 5: Testing Kas Masuk Form (E2E-TEST-MASUK-100K) ...');
    await openSpeedDial(page);
    await page.locator('button[role="menuitem"]:has-text("+ Kas Masuk")').click();

    const masukModal = page.locator('div[role="dialog"]');
    await masukModal.waitFor({ state: 'visible', timeout: 5000 });
    await assert.ok(await masukModal.locator('h3:has-text("Catat Kas Masuk")').isVisible(), 'Kas Masuk modal title must appear');

    // Test HTML5 Required Validation
    console.log('Checking required validation on empty submission ...');
    const submitBtn = masukModal.locator('button[type="submit"]:has-text("Simpan Transaksi")');
    const ketInput = masukModal.locator('input[placeholder*="Infaq Hamba Allah"]');
    const isRequired = await ketInput.getAttribute('required');
    assert.ok(isRequired !== null, 'Keterangan field must be marked as required');

    // Fill form
    console.log('Filling form with E2E-TEST-MASUK-100K, nominal 100000, metode cash ...');
    await ketInput.fill('E2E-TEST-MASUK-100K');
    const nominalInput = masukModal.locator('input[type="number"][placeholder="Contoh: 1500000"]');
    await nominalInput.fill('100000');

    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/api/keuangan') && resp.request().method() === 'POST'),
      submitBtn.click(),
    ]);

    const toastMasuk = page.locator('div[role="status"]:has-text("Transaksi berhasil dicatat")');
    await toastMasuk.waitFor({ state: 'visible', timeout: 8000 });
    await masukModal.waitFor({ state: 'hidden', timeout: 5000 });
    console.log('✅ Kas Masuk submitted and toast received');

    // Persistence Check: Reload browser
    console.log('Verifying persistence after page reload ...');
    await reloadAndWait(page);

    const rowMasuk = page.locator('tbody tr').filter({ hasText: 'E2E-TEST-MASUK-100K' });
    await assert.ok(await rowMasuk.isVisible(), 'E2E-TEST-MASUK-100K must persist in table after reload');
    await assert.ok((await rowMasuk.innerText()).includes('100.000'), 'Row must display nominal 100.000');

    // Verify Balances increased by 100,000
    const afterMasukBalances = await getBalances(page);
    assert.equal(afterMasukBalances.total, initialBalances.total + 100000, 'Total Saldo must increase by 100,000');
    assert.equal(afterMasukBalances.cash, initialBalances.cash + 100000, 'Cash Saldo must increase by 100,000');
    console.log('✅ Kas Masuk balance update and database persistence verified');

    // -------------------------------------------------------------
    // STEP 6: KAS KELUAR FORM (Create Transaction) & PERSISTENCE
    // -------------------------------------------------------------
    console.log('\n📤 STEP 6: Testing Kas Keluar Form (E2E-TEST-KELUAR-30K) ...');
    await openSpeedDial(page);
    await page.locator('button[role="menuitem"]:has-text("+ Kas Keluar")').click();

    const keluarModal = page.locator('div[role="dialog"]');
    await keluarModal.waitFor({ state: 'visible', timeout: 5000 });
    await assert.ok(await keluarModal.locator('h3:has-text("Catat Kas Keluar")').isVisible(), 'Kas Keluar modal title must appear');

    const ketKeluarInput = keluarModal.locator('input[placeholder*="Pembelian konsumsi"]');
    await ketKeluarInput.fill('E2E-TEST-KELUAR-30K');
    const nominalKeluarInput = keluarModal.locator('input[type="number"][placeholder="Contoh: 1500000"]');
    await nominalKeluarInput.fill('30000');

    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/api/keuangan') && resp.request().method() === 'POST'),
      keluarModal.locator('button[type="submit"]:has-text("Simpan Transaksi")').click(),
    ]);

    const toastKeluar = page.locator('div[role="status"]:has-text("Transaksi berhasil dicatat")');
    await toastKeluar.waitFor({ state: 'visible', timeout: 8000 });
    await keluarModal.waitFor({ state: 'hidden', timeout: 5000 });
    console.log('✅ Kas Keluar submitted and toast received');

    // Persistence Check: Reload browser
    console.log('Verifying persistence after page reload ...');
    await reloadAndWait(page);

    const rowKeluar = page.locator('tbody tr').filter({ hasText: 'E2E-TEST-KELUAR-30K' });
    await assert.ok(await rowKeluar.isVisible(), 'E2E-TEST-KELUAR-30K must persist in table after reload');
    await assert.ok((await rowKeluar.innerText()).includes('30.000'), 'Row must display nominal 30.000');

    // Verify Balances decreased by 30,000 (net +70,000 from initial)
    const afterKeluarBalances = await getBalances(page);
    assert.equal(afterKeluarBalances.total, initialBalances.total + 70000, 'Total Saldo must equal initial + 70,000');
    assert.equal(afterKeluarBalances.cash, initialBalances.cash + 70000, 'Cash Saldo must equal initial + 70,000');
    console.log('✅ Kas Keluar balance update and database persistence verified');

    // -------------------------------------------------------------
    // STEP 7: MUTASI KAS INTERNAL (Cash ⇋ Rekening)
    // -------------------------------------------------------------
    console.log('\n🔄 STEP 7: Testing Mutasi Kas Internal (E2E-TEST-MUTASI-20K) ...');
    await openSpeedDial(page);
    await page.locator('button[role="menuitem"]:has-text("Mutasi Antar-Kas")').click();

    const mutasiModal = page.locator('div[role="dialog"]');
    await mutasiModal.waitFor({ state: 'visible', timeout: 5000 });
    await assert.ok(await mutasiModal.locator('h3:has-text("Mutasi Kas Internal")').isVisible(), 'Mutasi modal title must appear');

    // Fill mutasi form (Transfer 20,000 from cash to transfer)
    const nominalMutasiInput = mutasiModal.locator('input[type="number"][placeholder="Contoh: 1000000"]');
    await nominalMutasiInput.fill('20000');
    const catatanMutasiInput = mutasiModal.locator('input[placeholder*="Tarik tunai ATM"]');
    await catatanMutasiInput.fill('E2E-TEST-MUTASI-20K');

    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/api/keuangan') && resp.request().method() === 'POST'),
      mutasiModal.locator('button[type="submit"]:has-text("Proses Mutasi Saldo")').click(),
    ]);

    const toastMutasi = page.locator('div[role="status"]:has-text("Mutasi kas berhasil dicatat!")');
    await toastMutasi.waitFor({ state: 'visible', timeout: 8000 });
    await mutasiModal.waitFor({ state: 'hidden', timeout: 5000 });
    console.log('✅ Mutasi Kas submitted and toast received');

    // Persistence Check: Reload browser
    console.log('Verifying persistence after page reload ...');
    await reloadAndWait(page);

    // Verify both mutation legs exist
    const mutasiLeg1 = page.locator('tbody tr').filter({ hasText: 'Mutasi Pindah Dana ke Rekening Bank - E2E-TEST-MUTASI-20K' });
    const mutasiLeg2 = page.locator('tbody tr').filter({ hasText: 'Mutasi Terima Dana dari Dompet (Cash) - E2E-TEST-MUTASI-20K' });
    await assert.ok(await mutasiLeg1.isVisible(), 'Outgoing leg of mutasi must appear in table');
    await assert.ok(await mutasiLeg2.isVisible(), 'Incoming leg of mutasi must appear in table');

    // Verify badges
    await assert.ok((await mutasiLeg1.innerText()).includes('⇄ Mutasi Internal'), 'Leg 1 must have mutasi internal badge');
    await assert.ok((await mutasiLeg2.innerText()).includes('⇄ Mutasi Internal'), 'Leg 2 must have mutasi internal badge');

    // Verify Balances:
    // Total Saldo must NOT change (net 0)
    // Cash Saldo must drop by 20,000 (now initial + 50,000)
    // Bank Saldo must increase by 20,000 (now initial + 20,000)
    const afterMutasiBalances = await getBalances(page);
    assert.equal(afterMutasiBalances.total, initialBalances.total + 70000, 'Total Saldo unchanged by internal mutation');
    assert.equal(afterMutasiBalances.cash, initialBalances.cash + 50000, 'Cash Saldo decreased by 20,000');
    assert.equal(afterMutasiBalances.transfer, initialBalances.transfer + 20000, 'Bank Saldo increased by 20,000');
    console.log('✅ Mutasi Kas internal double-entry integrity and balances verified');

    // -------------------------------------------------------------
    // STEP 8: VOID TRANSAKSI (Audit Trail & Double-Entry Reversal)
    // -------------------------------------------------------------
    console.log('\n❌ STEP 8: Testing VOID Transaksi on E2E-TEST-MASUK-100K ...');
    const targetRow = page.locator('tbody tr').filter({ hasText: 'E2E-TEST-MASUK-100K' });
    await assert.ok(await targetRow.isVisible(), 'Target transaction row must be present');

    const voidBtn = targetRow.locator('button[aria-label="Batalkan (Void Transaksi)"]');
    await voidBtn.click();

    const voidModal = page.locator('div[role="dialog"]');
    await voidModal.waitFor({ state: 'visible', timeout: 5000 });
    await assert.ok(await voidModal.locator('h3:has-text("Void / Batalkan Catatan Transaksi")').isVisible(), 'Void modal title must appear');

    // Verify Required Reason Validation
    console.log('Checking required validation on empty void reason ...');
    const reasonTextarea = voidModal.locator('textarea[placeholder*="Salah input nominal"]');
    assert.ok((await reasonTextarea.getAttribute('required')) !== null, 'Reason textarea must be required');

    // Fill valid reason
    console.log('Filling reason: E2E-TEST Pembatalan Uji Otomatis ...');
    await reasonTextarea.fill('E2E-TEST Pembatalan Uji Otomatis');

    const submitVoidBtn = voidModal.locator('button[type="submit"]:has-text("Proses Void & Reversal")');
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/api/keuangan') && resp.request().method() === 'POST'),
      submitVoidBtn.click(),
    ]);

    const toastVoid = page.locator('div[role="status"]:has-text("Transaksi berhasil di-void")');
    await toastVoid.waitFor({ state: 'visible', timeout: 8000 });
    await voidModal.waitFor({ state: 'hidden', timeout: 5000 });
    console.log('✅ Void action submitted and toast received');

    // Switch status filter to 'all' to inspect voided row and reversal row
    console.log('Switching Status Filter to "all" to inspect VOID and PEMBALIK rows ...');
    const statusSelectVoid = page.locator('select[aria-label="Filter Status Transaksi"]');
    await changeFilterAndWait(page, statusSelectVoid, 'all');

    const voidedRow = page.locator('tbody tr').filter({ hasText: 'E2E-TEST-MASUK-100K' }).first();
    await assert.ok(await voidedRow.isVisible(), 'Voided row must appear under status "all"');
    await assert.ok((await voidedRow.innerText()).includes('VOID'), 'Voided row must show VOID badge');
    await assert.ok((await voidedRow.innerText()).includes('E2E-TEST Pembatalan Uji Otomatis'), 'Void reason must appear in row details');
    await assert.ok((await voidedRow.innerText()).includes('Dibatalkan'), 'Void action button must be replaced by Dibatalkan');

    const reversalRow = page.locator('tbody tr').filter({ hasText: 'PEMBALIK' }).filter({ hasText: 'E2E-TEST-MASUK-100K' });
    await assert.ok(await reversalRow.isVisible(), 'Reversal record must be created and visible');
    console.log('✅ VOID audit trail & PEMBALIK counter entry verified in UI');

    // Verify Balance Recalculation after Void
    console.log('Verifying balance recalculation after void (100k income voided) ...');
    await reloadAndWait(page);

    const afterVoidBalances = await getBalances(page);

    // 100,000 income was voided:
    // Total Saldo drops from initial + 70,000 to initial - 30,000
    // Cash Saldo drops from initial + 50,000 to initial - 50,000
    // Bank Saldo remains initial + 20,000
    assert.equal(afterVoidBalances.total, initialBalances.total - 30000, 'Total Saldo must correct by -100,000');
    assert.equal(afterVoidBalances.cash, initialBalances.cash - 50000, 'Cash Saldo must correct by -100,000');
    assert.equal(afterVoidBalances.transfer, initialBalances.transfer + 20000, 'Bank Saldo accurately preserved');
    console.log('✅ Balance Recalculation accurately corrected after Void');

    // -------------------------------------------------------------
    // STEP 9: TEARDOWN & DATABASE CLEANUP
    // -------------------------------------------------------------
    console.log('\n🧹 STEP 9: Teardown & Database Verification ...');
    await cleanTestData();

    const remainingCount = await countTestData();
    assert.equal(remainingCount, 0, 'Zero test records should remain in the database after teardown');
    console.log('✅ Database cleaned up: 0 E2E-TEST records remain in table keuangan');

    // Reload page to confirm clean UI
    await reloadAndWait(page);

    const finalBalances = await getBalances(page);
    assert.equal(finalBalances.total, initialBalances.total, 'Total Saldo must be restored to initial state');
    assert.equal(finalBalances.cash, initialBalances.cash, 'Cash Saldo must be restored to initial state');
    assert.equal(finalBalances.transfer, initialBalances.transfer, 'Bank Saldo must be restored to initial state');
    console.log('✅ Clean UI state verified: Balances restored to initial pristine values');

    // -------------------------------------------------------------
    // STEP 10: ZERO CONSOLE ERRORS ASSERTION
    // -------------------------------------------------------------
    console.log('\n🛡️ STEP 10: Asserting Zero Fatal Console Errors & Unhandled Exceptions ...');
    console.log(`Captured Console Errors: ${consoleErrors.length}`);
    console.log(`Captured Page Errors: ${pageErrors.length}`);

    assert.equal(pageErrors.length, 0, `Must have zero unhandled exceptions. Found: ${JSON.stringify(pageErrors)}`);
    assert.equal(consoleErrors.length, 0, `Must have zero console errors. Found: ${JSON.stringify(consoleErrors)}`);
    console.log('✅ Zero console errors & unhandled exceptions verified');

    console.log('\n===============================================================');
    console.log('🎉 ALL TESTS FOR PAGE 4: KEUANGAN KAS PASSED WITH FLYING COLORS!');
    console.log('===============================================================');
  } catch (err) {
    console.error('\n❌ TEST FAILED WITH ERROR:', err);
    throw err;
  } finally {
    // Teardown again in finally to ensure pristine DB even on error
    await cleanTestData().catch(() => {});
    await browser.close();
  }
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
