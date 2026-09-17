import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/laxcyyfa/.npm/_npx/86170c4cd1c5da32/node_modules/playwright');

const BASE_URL = 'http://localhost:3000';
const TEST_USERNAME = 'E2E-TEST-USER-BENDAHARA';
const TEST_NAMA = 'E2E-TEST Staff Bendahara';
const TEST_NAMA_UPDATED = 'E2E-TEST Staff Bendahara Updated';
const TEST_PASSWORD = 'password123';

test.describe('P9: Kelola Akun Pengguna Comprehensive Headed E2E Tests', () => {
  let browser;
  let context;
  let page;
  let dbPool;
  const consoleErrors = [];
  const pageErrors = [];

  test.before(async () => {
    // 1. Initial Teardown in MariaDB
    const { query, getPool } = await import('../../src/lib/db.ts');
    dbPool = getPool();
    try {
      await query("DELETE FROM admin_users WHERE username LIKE 'E2E-TEST-%' OR nama LIKE 'E2E-TEST-%'");
    } catch (err) {
      console.warn('Initial cleanup warning:', err.message);
    }

    // 2. Launch Browser in Headed Mode on DISPLAY=:0
    browser = await chromium.launch({
      headless: false,
      channel: 'chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: true
    });

    page = await context.newPage();

    // 3. Monitor console errors and page unhandled exceptions
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        consoleErrors.push(`[Console Error] ${text}`);
      }
    });

    page.on('pageerror', (err) => {
      pageErrors.push(`[Page Error] ${err.message}`);
    });

    // 4. Authenticate as Superadmin (admin / admin123)
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    const usernameInput = page.locator('input[autocomplete="username"], input[type="text"]').first();
    const passwordInput = page.locator('input[autocomplete="current-password"], input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]:has-text("Masuk ke Dashboard"), button[type="submit"]').first();

    await usernameInput.fill('admin');
    await passwordInput.fill('admin123');
    await submitBtn.click();

    // Wait for SPA client navigation to /dashboard
    await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 15000 });
    assert.equal(page.url().includes('/dashboard'), true, 'Should reach /dashboard after login');

    // 5. Navigate to Page 9: Kelola Akun Pengguna (/pengguna)
    await page.goto(`${BASE_URL}/pengguna`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.location.pathname === '/pengguna', { timeout: 15000 });
  });

  test.after(async () => {
    // Teardown any test users and terminate database pool
    try {
      if (dbPool) {
        await dbPool.query("DELETE FROM admin_users WHERE username LIKE 'E2E-TEST-%' OR nama LIKE 'E2E-TEST-%'");
        await dbPool.end();
      }
    } catch (err) {
      console.warn('Teardown database pool warning:', err.message);
    }

    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  });

  test('9.1 User Table Layout, Column Headers, and Pre-existing User Badges', async () => {
    // Verify table structure
    const table = page.locator('table');
    await assert.doesNotReject(table.waitFor({ state: 'visible', timeout: 10000 }));

    const tableHeaders = await table.locator('thead th').allTextContents();
    const headerText = tableHeaders.join(' ');
    assert.ok(headerText.includes('Pengguna'), "Table header must contain 'Pengguna'");
    assert.ok(headerText.includes('Peran (Role)'), "Table header must contain 'Peran (Role)'");
    assert.ok(headerText.includes('Tautan Panitia / Seksi'), "Table header must contain 'Tautan Panitia / Seksi'");
    assert.ok(headerText.includes('Status'), "Table header must contain 'Status'");
    assert.ok(headerText.includes('Aksi'), "Table header must contain 'Aksi'");

    // Verify admin row exists with role badge & status badge
    const adminRow = page.locator('tbody tr').filter({ hasText: '@admin' }).first();
    await assert.doesNotReject(adminRow.waitFor({ state: 'visible', timeout: 5000 }));
    const adminText = await adminRow.textContent();
    assert.ok(adminText.includes('Sekretariat Panitia'), 'Admin name should be rendered');
    assert.ok(adminText.includes('Ketua Panitia'), 'Admin role badge should be Ketua Panitia');
    assert.ok(adminText.includes('Aktif'), 'Admin status badge should be Aktif');

    // Verify siti row exists with role badge Sekretaris
    const sitiRow = page.locator('tbody tr').filter({ hasText: '@siti' }).first();
    await assert.doesNotReject(sitiRow.waitFor({ state: 'visible', timeout: 5000 }));
    const sitiText = await sitiRow.textContent();
    assert.ok(sitiText.includes('Siti Nurhaliza'), 'Siti name should be rendered');
    assert.ok(sitiText.includes('Sekretaris'), 'Siti role badge should be Sekretaris');
  });

  test('9.2 Current Admin Protection & Self-Deletion / Self-Status Prevention Guard', async () => {
    const adminRow = page.locator('tbody tr').filter({ hasText: '@admin' }).first();
    await adminRow.waitFor({ state: 'visible' });

    // In UI, the delete button must NOT be rendered on currently logged-in admin row
    const deleteBtn = adminRow.locator('button[aria-label="Hapus akun"]');
    const deleteCount = await deleteBtn.count();
    assert.equal(deleteCount, 0, 'Current admin row must not render delete button (self-deletion prevented in UI)');

    // Test API self-deletion prevention
    const deleteApiRes = await context.request.post(`${BASE_URL}/api/users`, {
      data: { action: 'delete', id: 'admin-1' }
    });
    assert.equal(deleteApiRes.status(), 400, 'API must reject self-deletion with 400');
    const deleteApiJson = await deleteApiRes.json();
    assert.ok(
      deleteApiJson.error?.includes('Tidak dapat menghapus akun sendiri'),
      `API must return self-deletion error, got: ${deleteApiJson.error}`
    );

    // Test API self-status toggle prevention
    const toggleApiRes = await context.request.post(`${BASE_URL}/api/users`, {
      data: { action: 'toggle_status', id: 'admin-1', status: 'nonaktif' }
    });
    assert.equal(toggleApiRes.status(), 400, 'API must reject self-status toggle with 400');
    const toggleApiJson = await toggleApiRes.json();
    assert.ok(
      toggleApiJson.error?.includes('Tidak dapat mengubah status akun sendiri'),
      `API must return self-status toggle error, got: ${toggleApiJson.error}`
    );
  });

  test('9.3 User Creation Form Validation & Genuine Creation of E2E-TEST-USER-BENDAHARA', async () => {
    // 1. Test empty form validation check
    const emptyRes = await context.request.post(`${BASE_URL}/api/users`, {
      data: { action: 'create', username: '', password: '', nama: '', role: '' }
    });
    assert.equal(emptyRes.status(), 400, 'Empty user create must return 400');
    const emptyJson = await emptyRes.json();
    assert.ok(
      emptyJson.error?.includes('Semua kolom wajib diisi'),
      `Expected 'Semua kolom wajib diisi' error, got: ${emptyJson.error}`
    );

    // 2. Test short username check (<3)
    const shortUserRes = await context.request.post(`${BASE_URL}/api/users`, {
      data: { action: 'create', username: 'ab', password: 'password123', nama: 'Staff', role: 'bendahara' }
    });
    assert.equal(shortUserRes.status(), 400, 'Short username must return 400');
    const shortUserJson = await shortUserRes.json();
    assert.ok(
      shortUserJson.error?.includes('minimal 3 karakter'),
      `Expected minimal 3 karakter error, got: ${shortUserJson.error}`
    );

    // 3. Test colon character in username
    const colonUserRes = await context.request.post(`${BASE_URL}/api/users`, {
      data: { action: 'create', username: 'bad:user', password: 'password123', nama: 'Staff', role: 'bendahara' }
    });
    assert.equal(colonUserRes.status(), 400, 'Colon in username must return 400');
    const colonUserJson = await colonUserRes.json();
    assert.ok(
      colonUserJson.error?.includes('titik dua'),
      `Expected colon prohibited error, got: ${colonUserJson.error}`
    );

    // 4. Test short password check (<5)
    const shortPassRes = await context.request.post(`${BASE_URL}/api/users`, {
      data: { action: 'create', username: 'validuser', password: '123', nama: 'Staff', role: 'bendahara' }
    });
    assert.equal(shortPassRes.status(), 400, 'Short password must return 400');
    const shortPassJson = await shortPassRes.json();
    assert.ok(
      shortPassJson.error?.includes('minimal 5 karakter'),
      `Expected minimal 5 karakter error, got: ${shortPassJson.error}`
    );

    // 5. Test invalid role check
    const invalidRoleRes = await context.request.post(`${BASE_URL}/api/users`, {
      data: { action: 'create', username: 'validuser', password: 'password123', nama: 'Staff', role: 'superadmin_role' }
    });
    assert.equal(invalidRoleRes.status(), 400, 'Invalid role must return 400');
    const invalidRoleJson = await invalidRoleRes.json();
    assert.ok(
      invalidRoleJson.error?.includes('Role pengguna tidak valid'),
      `Expected invalid role error, got: ${invalidRoleJson.error}`
    );

    // 6. Genuine creation of E2E-TEST-USER-BENDAHARA
    const createRes = await context.request.post(`${BASE_URL}/api/users`, {
      data: {
        action: 'create',
        username: TEST_USERNAME,
        nama: TEST_NAMA,
        password: TEST_PASSWORD,
        role: 'bendahara'
      }
    });
    assert.equal(createRes.status(), 200, 'User creation must succeed with 200');
    const createJson = await createRes.json();
    assert.equal(createJson.success, true, 'Response should have success: true');
    assert.ok(createJson.id, 'Response should have created user id');

    // 7. Verify persistence on page reload
    await page.reload({ waitUntil: 'networkidle' });
    const testRow = page.locator('tbody tr').filter({ hasText: `@${TEST_USERNAME}` }).first();
    await assert.doesNotReject(testRow.waitFor({ state: 'visible', timeout: 10000 }));

    const rowText = await testRow.textContent();
    assert.ok(rowText.includes(TEST_NAMA), `Row must display nama '${TEST_NAMA}'`);
    assert.ok(rowText.includes('Bendahara'), "Row must display role badge 'Bendahara'");
    assert.ok(rowText.includes('Aktif'), "Initial status badge must be 'Aktif'");
  });

  test('9.4 Search Input Live Filtering and Empty State Behavior', async () => {
    const searchInput = page.locator('input[placeholder*="Cari berdasarkan nama, username"]').first();
    await searchInput.waitFor({ state: 'visible' });

    // 1. Search by exact username
    await searchInput.fill(TEST_USERNAME);
    await page.waitForTimeout(300);

    // Verify only matching row is visible
    const visibleRows = page.locator("tbody tr:not([class*='hidden'])");
    const rowCount = await visibleRows.count();
    assert.equal(rowCount, 1, 'Only 1 row should be visible matching the exact username');
    const matchedText = await visibleRows.first().textContent();
    assert.ok(matchedText.includes(TEST_USERNAME), 'Visible row must be the test user');

    // 2. Search by display name
    await searchInput.fill('Staff Bendahara');
    await page.waitForTimeout(300);
    const matchedNameText = await page.locator("tbody tr:not([class*='hidden'])").first().textContent();
    assert.ok(matchedNameText.includes(TEST_USERNAME), 'Searching by name must match test user');

    // 3. Search with non-matching string
    await searchInput.fill('NONEXISTENT_KEYWORD_XYZ_9999');
    await page.waitForTimeout(300);

    const emptyText = await page.locator('main').textContent();
    assert.ok(
      emptyText.includes('Tidak ada akun pengguna yang cocok') ||
      emptyText.includes('Belum Ada Akun Pengguna'),
      'Empty state description must appear when no users match'
    );

    // 4. Reset search via Reset button or clearing input
    const resetBtn = page.locator('button:has-text("Reset Pencarian")');
    if (await resetBtn.isVisible()) {
      await resetBtn.click();
    } else {
      await searchInput.fill('');
    }
    await page.waitForTimeout(300);

    // Verify all rows return
    const allRowsCount = await page.locator('tbody tr').count();
    assert.ok(allRowsCount >= 3, 'Table should show all user rows after search reset');
  });

  test('9.5 Status Toggle (Aktif -> Nonaktif -> Aktif) with Modal Confirmation & Persistence', async () => {
    const testRow = page.locator('tbody tr').filter({ hasText: `@${TEST_USERNAME}` }).first();
    await testRow.waitFor({ state: 'visible' });

    const toggleBtn = testRow.locator('button[title="Klik untuk mengubah status aktif/nonaktif"]');
    await toggleBtn.waitFor({ state: 'visible' });

    // Step A: Test Cancel on ConfirmDialog
    await toggleBtn.click();
    const cancelBtn = page.locator('div[role="dialog"] button:has-text("Batal")');
    await cancelBtn.waitFor({ state: 'visible' });
    await cancelBtn.click();
    await page.waitForTimeout(300);

    // Verify status remains Aktif
    const statusText = await toggleBtn.textContent();
    assert.ok(statusText.includes('Aktif'), 'Status must remain Aktif after cancel');

    // Step B: Toggle to Nonaktif
    await toggleBtn.click();
    const confirmNonaktifBtn = page.locator('div[role="dialog"] button:has-text("Ya, Nonaktifkan")');
    await confirmNonaktifBtn.waitFor({ state: 'visible' });
    await confirmNonaktifBtn.click();

    // Wait for toast notification
    const toast = page.locator('div[role="status"], div[role="region"], div:has-text("sekarang nonaktif")');
    await assert.doesNotReject(toast.first().waitFor({ state: 'visible', timeout: 5000 }));

    // Verify visual badge updated to Nonaktif
    await page.waitForTimeout(500);
    assert.ok((await testRow.textContent()).includes('Nonaktif'), 'Row must visually display Nonaktif');

    // Reload to confirm database persistence
    await page.reload({ waitUntil: 'networkidle' });
    const testRowAfterReload1 = page.locator('tbody tr').filter({ hasText: `@${TEST_USERNAME}` }).first();
    await testRowAfterReload1.waitFor({ state: 'visible' });
    assert.ok(
      (await testRowAfterReload1.textContent()).includes('Nonaktif'),
      'Status must persist as Nonaktif after page reload'
    );

    // Step C: Toggle back to Aktif
    const toggleBtnBack = testRowAfterReload1.locator('button[title="Klik untuk mengubah status aktif/nonaktif"]');
    await toggleBtnBack.click();
    const confirmAktifBtn = page.locator('div[role="dialog"] button:has-text("Ya, Aktifkan")');
    await confirmAktifBtn.waitFor({ state: 'visible' });
    await confirmAktifBtn.click();

    // Wait for toast notification
    const toastAktif = page.locator('div[role="status"], div[role="region"], div:has-text("sekarang aktif")');
    await assert.doesNotReject(toastAktif.first().waitFor({ state: 'visible', timeout: 5000 }));

    // Verify visual badge updated to Aktif
    await page.waitForTimeout(500);
    assert.ok((await testRowAfterReload1.textContent()).includes('Aktif'), 'Row must visually display Aktif');

    // Reload to confirm database persistence
    await page.reload({ waitUntil: 'networkidle' });
    const testRowAfterReload2 = page.locator('tbody tr').filter({ hasText: `@${TEST_USERNAME}` }).first();
    await testRowAfterReload2.waitFor({ state: 'visible' });
    assert.ok(
      (await testRowAfterReload2.textContent()).includes('Aktif'),
      'Status must persist as Aktif after page reload'
    );
  });

  test('9.6 EditUserModal: Modify Role, Name, Section Linkage, and Persistence Verification', async () => {
    const testRow = page.locator('tbody tr').filter({ hasText: `@${TEST_USERNAME}` }).first();
    await testRow.waitFor({ state: 'visible' });

    const editBtn = testRow.locator('button[aria-label="Edit data login & password"]');
    await editBtn.waitFor({ state: 'visible' });

    // Step A: Open modal and test Cancel button
    await editBtn.click();
    const editModal = page.locator('div[role="dialog"]');
    await editModal.waitFor({ state: 'visible' });
    assert.ok(
      (await editModal.textContent()).includes('Edit Akun Pengguna'),
      'Modal title must be Edit Akun Pengguna'
    );

    const cancelEditBtn = editModal.locator('button:has-text("Batal")');
    await cancelEditBtn.click();
    await page.waitForTimeout(300);

    // Step B: Reopen and modify Name, Role to Sekretaris, and set New Password
    await editBtn.click();
    await editModal.waitFor({ state: 'visible' });

    const namaInput = editModal.locator('input[placeholder="Nama lengkap panitia"]');
    const roleSelect = editModal.locator('select').first();
    const passInput = editModal.locator('input[type="password"]');

    await namaInput.fill(TEST_NAMA_UPDATED);
    await roleSelect.selectOption('sekretaris');
    await passInput.fill('newpassword123');

    const saveEditBtn = editModal.locator('button[type="submit"]:has-text("Simpan Perubahan")');
    await saveEditBtn.click();

    // Wait for toast notification
    const toastEdit = page.locator('div[role="status"], div[role="region"], div:has-text("berhasil diperbarui")');
    await assert.doesNotReject(toastEdit.first().waitFor({ state: 'visible', timeout: 5000 }));

    // Step C: Verify persistence on reload
    await page.reload({ waitUntil: 'networkidle' });
    const testRowAfterEdit = page.locator('tbody tr').filter({ hasText: `@${TEST_USERNAME}` }).first();
    await testRowAfterEdit.waitFor({ state: 'visible' });

    const editedText = await testRowAfterEdit.textContent();
    assert.ok(editedText.includes(TEST_NAMA_UPDATED), `Row should show updated nama '${TEST_NAMA_UPDATED}'`);
    assert.ok(editedText.includes('Sekretaris'), "Row should show updated role badge 'Sekretaris'");

    // Step D: Test Section Linkage behavior in EditUserModal
    await testRowAfterEdit.locator('button[aria-label="Edit data login & password"]').click();
    await editModal.waitFor({ state: 'visible' });

    const modalRoleSelect = editModal.locator('select').first();
    await modalRoleSelect.selectOption('koordinator_seksi');

    // Verify Seksi dropdown is enabled when role is koordinator_seksi
    const seksiSelect = editModal.locator('select').nth(1);
    const isSeksiDisabled = await seksiSelect.isDisabled();
    assert.equal(isSeksiDisabled, false, 'Seksi dropdown must be enabled when role is koordinator_seksi');

    // Close modal
    await editModal.locator('button:has-text("Batal")').click();
  });

  test('9.7 Delete User via UI with Confirmation and Persistence Verification', async () => {
    const testRow = page.locator('tbody tr').filter({ hasText: `@${TEST_USERNAME}` }).first();
    await testRow.waitFor({ state: 'visible' });

    const deleteBtn = testRow.locator('button[aria-label="Hapus akun"]');
    await deleteBtn.waitFor({ state: 'visible' });

    // Step A: Test Cancel on delete confirmation
    await deleteBtn.click();
    const deleteDialog = page.locator('div[role="dialog"]');
    await deleteDialog.waitFor({ state: 'visible' });
    assert.ok(
      (await deleteDialog.textContent()).includes('Hapus Akun Pengguna'),
      'Confirm dialog title must be Hapus Akun Pengguna'
    );

    const cancelDeleteBtn = deleteDialog.locator('button:has-text("Batal")');
    await cancelDeleteBtn.click();
    await page.waitForTimeout(300);

    // Verify user row still exists
    assert.equal(
      await page.locator('tbody tr').filter({ hasText: `@${TEST_USERNAME}` }).count(),
      1,
      'User row must still exist after cancel'
    );

    // Step B: Confirm Deletion
    await deleteBtn.click();
    const confirmDeleteBtn = page.locator('div[role="dialog"] button:has-text("Ya, Hapus Akun")');
    await confirmDeleteBtn.waitFor({ state: 'visible' });
    await confirmDeleteBtn.click();

    // Wait for toast notification
    const toastDelete = page.locator('div[role="status"], div[role="region"], div:has-text("berhasil dihapus")');
    await assert.doesNotReject(toastDelete.first().waitFor({ state: 'visible', timeout: 5000 }));

    // Step C: Verify persistence on reload
    await page.reload({ waitUntil: 'networkidle' });
    const testRowAfterDelete = page.locator('tbody tr').filter({ hasText: `@${TEST_USERNAME}` });
    const rowCount = await testRowAfterDelete.count();
    assert.equal(rowCount, 0, 'Deleted user must not appear after page reload');

    // Direct DB verification
    const { query } = await import('../../src/lib/db.ts');
    const dbUsers = await query('SELECT id FROM admin_users WHERE username = ?', [TEST_USERNAME]);
    assert.equal(dbUsers.length, 0, 'User must be completely purged from database');
  });

  test('9.8 Teardown Cleanliness & Zero Console Errors Assertion', async () => {
    // Assert zero unhandled exceptions
    assert.deepEqual(pageErrors, [], `Page threw unhandled exceptions: ${pageErrors.join(', ')}`);

    // Assert zero console errors
    assert.deepEqual(consoleErrors, [], `Page had console errors: ${consoleErrors.join(', ')}`);
    console.log('✅ Page 9: Kelola Akun Pengguna Headed Playwright E2E Test PASSED with 0 console errors!');
  });

  test.after(async () => {
    try {
      if (dbPool) await dbPool.end();
    } catch {}
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  });
});
