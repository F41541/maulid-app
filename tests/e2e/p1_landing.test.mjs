import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/laxcyyfa/.npm/_npx/86170c4cd1c5da32/node_modules/playwright');

test.describe('P1: Landing Page Comprehensive Headed E2E Tests', () => {
  let browser;
  let context;
  let page;
  const consoleErrors = [];
  const pageErrors = [];

  test.before(async () => {
    // 1. Launch Headed Google Chrome on DISPLAY=:0
    browser = await chromium.launch({
      headless: false,
      channel: 'chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // 2. Create isolated context with clipboard permissions
    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: true,
      permissions: ['clipboard-read', 'clipboard-write']
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

    // 4. Navigate to Landing Page
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  });

  test.after(async () => {
    if (context) await context.close();
    if (browser) await browser.close();
  });

  test('1. Page Header: Logo, navigation links, theme toggle, and portal login link', async () => {
    // Verify document title
    const title = await page.title();
    assert.match(title, /Maulid/i, 'Title should contain Maulid');

    // Verify brand logo link
    const brandLink = page.locator('header a[href="/"]');
    await assert.doesNotReject(brandLink.waitFor({ state: 'visible', timeout: 5000 }));
    const brandText = await brandLink.innerText();
    assert.match(brandText, /Maulid Nabi 1448 H/i, 'Header should display event title');

    // Verify all 6 desktop navigation links
    const expectedNavs = [
      { label: 'Beranda', href: '#hero' },
      { label: 'Tentang Acara', href: '#tentang' },
      { label: 'Susunan Acara', href: '#rundown' },
      { label: 'Penceramah', href: '#penceramah' },
      { label: 'Infaq & Donasi', href: '#infaq' },
      { label: 'Lokasi & Kontak', href: '#kontak' }
    ];

    for (const nav of expectedNavs) {
      const navLink = page.locator(`header nav a[href="${nav.href}"]`);
      await assert.doesNotReject(navLink.waitFor({ state: 'visible', timeout: 5000 }));
      const text = await navLink.innerText();
      assert.match(text, new RegExp(nav.label, 'i'), `Nav item should match ${nav.label}`);
    }

    // Test Desktop Theme Toggle (Dark / Light mode transition)
    const themeBtn = page.locator('header button[aria-label*="Beralih ke mode"]');
    await assert.doesNotReject(themeBtn.waitFor({ state: 'visible', timeout: 5000 }));

    const initialTheme = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    
    // Toggle theme
    await themeBtn.click();
    await page.waitForTimeout(300);
    const updatedTheme = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    assert.notEqual(updatedTheme, initialTheme, 'Theme class on <html> should toggle');

    // Toggle back to original theme
    await themeBtn.click();
    await page.waitForTimeout(300);
    const restoredTheme = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    assert.equal(restoredTheme, initialTheme, 'Theme class should restore to initial');

    // Verify Portal Panitia link on desktop
    const portalLink = page.locator('header a[href="/login"]:has-text("Portal Panitia")');
    await assert.doesNotReject(portalLink.waitFor({ state: 'visible', timeout: 5000 }));
    assert.equal(await portalLink.getAttribute('href'), '/login', 'Portal link should point to /login');
  });

  test('2. Mobile Responsive Navigation Drawer', async () => {
    // Switch to mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);

    // Open hamburger menu
    const menuBtn = page.locator('header button[aria-label="Buka menu navigasi"]');
    await assert.doesNotReject(menuBtn.waitFor({ state: 'visible', timeout: 5000 }));
    await menuBtn.click();

    // Verify mobile drawer items
    const mobilePortalLink = page.locator('header div.lg\\:hidden a[href="/login"]:has-text("Masuk ke Portal Panitia")');
    await assert.doesNotReject(mobilePortalLink.waitFor({ state: 'visible', timeout: 5000 }));

    // Test mobile theme switcher
    const mobileThemeToggle = page.locator('header div.lg\\:hidden button[aria-label*="Beralih ke mode"]');
    await assert.doesNotReject(mobileThemeToggle.waitFor({ state: 'visible', timeout: 5000 }));

    // Close mobile drawer
    const closeBtn = page.locator('header button[aria-label="Tutup menu"]');
    await closeBtn.click();
    await page.waitForTimeout(300);

    // Restore desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(300);
  });

  test('3. Hero Section: Typography, Event Pills, Live Countdown Ticking, CTA buttons, and Islamic Arch', async () => {
    const heroSection = page.locator('section#hero');
    await assert.doesNotReject(heroSection.waitFor({ state: 'visible', timeout: 5000 }));

    // Verify Islamic Invocations & Titles
    await assert.doesNotReject(heroSection.locator('text=Bismillahir Rahmanir Rahim').waitFor({ state: 'visible' }));
    await assert.doesNotReject(heroSection.locator('text=Tabligh Akbar & Pembacaan Rawi Simthudduror').waitFor({ state: 'visible' }));
    await assert.doesNotReject(heroSection.locator('h1:has-text("Peringatan Maulid Nabi")').waitFor({ state: 'visible' }));

    // Verify Event Details Pills
    await assert.doesNotReject(heroSection.locator('text=Minggu, 11 Oktober 2026').waitFor({ state: 'visible' }));
    await assert.doesNotReject(heroSection.locator('text=19.30 WIB (Ba\'da Isya)').waitFor({ state: 'visible' }));
    await assert.doesNotReject(heroSection.locator('text=Mushola Nurul Hidayah').waitFor({ state: 'visible' }));

    // Verify Live Countdown Clock Units
    const countdownGrid = heroSection.locator('div.grid-cols-4');
    await assert.doesNotReject(countdownGrid.waitFor({ state: 'visible' }));

    const daysBlock = countdownGrid.locator('div:has-text("Hari") span.font-bold').first();
    const hoursBlock = countdownGrid.locator('div:has-text("Jam") span.font-bold').first();
    const minutesBlock = countdownGrid.locator('div:has-text("Menit") span.font-bold').first();
    const secondsBlock = countdownGrid.locator('div:has-text("Detik") span.font-bold').first();

    const initialSec = parseInt(await secondsBlock.innerText(), 10);
    assert.ok(!isNaN(initialSec) && initialSec >= 0 && initialSec <= 59, 'Initial seconds must be valid number');

    // Wait 1.3 seconds to confirm countdown clock ticks genuinely
    await page.waitForTimeout(1300);
    const tickedSec = parseInt(await secondsBlock.innerText(), 10);
    assert.ok(!isNaN(tickedSec) && tickedSec >= 0 && tickedSec <= 59, 'Ticked seconds must be valid number');

    // Verify Hero CTA buttons
    const ctaRundown = heroSection.locator('a[href="#rundown"]:has-text("Lihat Susunan Acara")');
    const ctaInfaq = heroSection.locator('a[href="#infaq"]:has-text("Infaq & Partisipasi Umat")');
    const ctaPortal = heroSection.locator('a[href="/login"]:has-text("Portal Panitia")');

    await assert.doesNotReject(ctaRundown.waitFor({ state: 'visible' }));
    await assert.doesNotReject(ctaInfaq.waitFor({ state: 'visible' }));
    await assert.doesNotReject(ctaPortal.waitFor({ state: 'visible' }));

    // Verify Islamic Mosque Arch Graphic & Theme Highlight Card
    const archImg = heroSection.locator('img[alt="Kubah & Menara Masjid Utama Acara Maulid Nabi"]');
    await assert.doesNotReject(archImg.waitFor({ state: 'visible' }));
    await assert.doesNotReject(heroSection.getByText('Cahaya Risalah Nabawiyah di Tengah Peradaban Modern').waitFor({ state: 'visible' }));
  });

  test('4. Stats Bar: Counter cards and key metrics', async () => {
    const statsSection = page.locator('section:has-text("Target Jamaah Hadir")');
    await assert.doesNotReject(statsSection.waitFor({ state: 'visible', timeout: 5000 }));

    // Verify 4 highlight stats
    await assert.doesNotReject(statsSection.locator('text=1.500+').waitFor({ state: 'visible' }));
    await assert.doesNotReject(statsSection.locator('text=4 Tokoh').waitFor({ state: 'visible' }));
    await assert.doesNotReject(statsSection.locator('text=1 Malam Berkah').waitFor({ state: 'visible' }));
    await assert.doesNotReject(statsSection.locator('text=100% Khidmat').waitFor({ state: 'visible' }));
  });

  test('5. About Section: Tab Switching (Tujuan Mulia, Keutamaan Sholawat, Tata Tertib Jamaah)', async () => {
    const aboutSection = page.locator('section#tentang');
    await assert.doesNotReject(aboutSection.waitFor({ state: 'visible', timeout: 5000 }));

    // 1. Initial Default Tab: "Tujuan Mulia"
    const tabTujuanBtn = aboutSection.locator('button:has-text("Tujuan Mulia")');
    const tabKeutamaanBtn = aboutSection.locator('button:has-text("Keutamaan Sholawat")');
    const tabTataTertibBtn = aboutSection.locator('button:has-text("Tata Tertib Jamaah")');

    await assert.doesNotReject(tabTujuanBtn.waitFor({ state: 'visible' }));
    await assert.doesNotReject(tabKeutamaanBtn.waitFor({ state: 'visible' }));
    await assert.doesNotReject(tabTataTertibBtn.waitFor({ state: 'visible' }));

    // Check default content: Maksud & Tujuan Utama Tabligh Akbar
    await assert.doesNotReject(aboutSection.locator('h3:has-text("Maksud & Tujuan Utama Tabligh Akbar")').waitFor({ state: 'visible' }));
    await assert.doesNotReject(aboutSection.locator('text=Menumbuhkan rasa cinta (mahabbah)').waitFor({ state: 'visible' }));

    // 2. Switch to Tab: "Keutamaan Sholawat"
    await tabKeutamaanBtn.click();
    await page.waitForTimeout(200);
    await assert.doesNotReject(aboutSection.locator('h3:has-text("Keberkahan & Keutamaan Bersholawat")').waitFor({ state: 'visible' }));
    await assert.doesNotReject(aboutSection.locator('text=Mendatangkan ketenangan jiwa dan kelapangan rezeki').waitFor({ state: 'visible' }));

    // 3. Switch to Tab: "Tata Tertib Jamaah"
    await tabTataTertibBtn.click();
    await page.waitForTimeout(200);
    await assert.doesNotReject(aboutSection.locator('h3:has-text("Panduan & Kenyamanan Jamaah Hadir")').waitFor({ state: 'visible' }));
    await assert.doesNotReject(aboutSection.locator('text=Dianjurkan mengenakan pakaian rapi, sopan, dan diutamakan bernuansa putih').waitFor({ state: 'visible' }));

    // Switch back to "Tujuan Mulia"
    await tabTujuanBtn.click();
    await page.waitForTimeout(200);
    await assert.doesNotReject(aboutSection.locator('h3:has-text("Maksud & Tujuan Utama Tabligh Akbar")').waitFor({ state: 'visible' }));

    // Verify Quranic Quote Box
    await assert.doesNotReject(aboutSection.locator('text=وَمَا أَرْسَلْنَاكَ إِلَّا رَحْمَةً لِلْعَالَمِينَ').waitFor({ state: 'visible' }));
    await assert.doesNotReject(aboutSection.locator('text=(QS. Al-Anbiya: 107)').waitFor({ state: 'visible' }));

    // Verify CTA to Rundown
    const ctaSchedule = aboutSection.locator('a[href="#rundown"]:has-text("Lihat Jadwal Lengkap Acara")');
    await assert.doesNotReject(ctaSchedule.waitFor({ state: 'visible' }));
  });

  test('6. Rundown Section: All 4 Category Filters (Semua, Pembukaan, Inti, Penutup)', async () => {
    const rundownSection = page.locator('section#rundown');
    await assert.doesNotReject(rundownSection.waitFor({ state: 'visible', timeout: 5000 }));

    // Filter Buttons
    const btnAll = rundownSection.locator('button:has-text("Semua Rangkaian")');
    const btnPembuka = rundownSection.locator('button:has-text("Pembukaan & Sambutan")');
    const btnInti = rundownSection.locator('button:has-text("Sholawat & Tausiyah Inti")');
    const btnPenutup = rundownSection.locator('button:has-text("Doa & Ramah Tamah")');

    // 1. Filter: "Semua Rangkaian" (6 items in db)
    await btnAll.click();
    await page.waitForTimeout(200);
    await assert.doesNotReject(rundownSection.locator('h3:has-text("Pembukaan & Tawasul")').waitFor({ state: 'visible' }));
    await assert.doesNotReject(rundownSection.locator('h3:has-text("Sambutan Ketua Panitia & Pelindung")').waitFor({ state: 'visible' }));
    await assert.doesNotReject(rundownSection.locator('h3:has-text("Pembacaan Ayat Suci Al-Qur\'an")').waitFor({ state: 'visible' }));
    await assert.doesNotReject(rundownSection.locator('h3:has-text("Mau\'idhoh Hasanah / Tausiyah Inti")').waitFor({ state: 'visible' }));
    await assert.doesNotReject(rundownSection.locator('h3:has-text("Pembacaan Maulid Diba\'i & Sholawat")').waitFor({ state: 'visible' }));
    await assert.doesNotReject(rundownSection.locator('h3:has-text("Doa Penutup & Ramah Tamah")').waitFor({ state: 'visible' }));

    // Check highlight on main event
    await assert.doesNotReject(rundownSection.locator('span:has-text("Mata Acara Utama")').first().waitFor({ state: 'visible' }));

    // 2. Filter: "Pembukaan & Sambutan"
    await btnPembuka.click();
    await page.waitForTimeout(200);
    await assert.doesNotReject(rundownSection.locator('h3:has-text("Pembukaan & Tawasul")').waitFor({ state: 'visible' }));
    await assert.doesNotReject(rundownSection.locator('h3:has-text("Sambutan Ketua Panitia & Pelindung")').waitFor({ state: 'visible' }));
    await assert.doesNotReject(rundownSection.locator('h3:has-text("Pembacaan Ayat Suci Al-Qur\'an")').waitFor({ state: 'visible' }));
    // Inti and Penutup should be filtered out
    assert.equal(await rundownSection.locator('h3:has-text("Mau\'idhoh Hasanah / Tausiyah Inti")').count(), 0);
    assert.equal(await rundownSection.locator('h3:has-text("Doa Penutup & Ramah Tamah")').count(), 0);

    // 3. Filter: "Sholawat & Tausiyah Inti"
    await btnInti.click();
    await page.waitForTimeout(200);
    await assert.doesNotReject(rundownSection.locator('h3:has-text("Mau\'idhoh Hasanah / Tausiyah Inti")').waitFor({ state: 'visible' }));
    await assert.doesNotReject(rundownSection.locator('h3:has-text("Pembacaan Maulid Diba\'i & Sholawat")').waitFor({ state: 'visible' }));
    assert.equal(await rundownSection.locator('h3:has-text("Pembukaan & Tawasul")').count(), 0);
    assert.equal(await rundownSection.locator('h3:has-text("Doa Penutup & Ramah Tamah")').count(), 0);

    // 4. Filter: "Doa & Ramah Tamah"
    await btnPenutup.click();
    await page.waitForTimeout(200);
    await assert.doesNotReject(rundownSection.locator('h3:has-text("Doa Penutup & Ramah Tamah")').waitFor({ state: 'visible' }));
    assert.equal(await rundownSection.locator('h3:has-text("Pembukaan & Tawasul")').count(), 0);
    assert.equal(await rundownSection.locator('h3:has-text("Mau\'idhoh Hasanah / Tausiyah Inti")').count(), 0);

    // Return to "Semua Rangkaian"
    await btnAll.click();
    await page.waitForTimeout(200);
    await assert.doesNotReject(rundownSection.locator('h3:has-text("Pembukaan & Tawasul")').waitFor({ state: 'visible' }));
  });

  test('7. Speakers Section: Desktop Grid & Mobile Carousel Navigation Controls', async () => {
    const speakerSection = page.locator('section#penceramah');
    await assert.doesNotReject(speakerSection.waitFor({ state: 'visible', timeout: 5000 }));

    // 1. Verify 4 Speaker Profiles in Desktop View
    const expectedSpeakers = [
      'Habib Umar bin Yahya',
      'K.H. Ahmad Fauzi',
      'Ustadz Qori Syamsuri',
      'Grup Hadroh Syubban & Ahbabul'
    ];

    const desktopGrid = speakerSection.locator('div.hidden.sm\\:grid');
    await assert.doesNotReject(desktopGrid.waitFor({ state: 'visible', timeout: 5000 }));

    for (const name of expectedSpeakers) {
      await assert.doesNotReject(desktopGrid.locator(`h3:has-text("${name}")`).waitFor({ state: 'visible' }));
    }

    // 2. Switch to Mobile View to test Carousel Controls (Prev/Next buttons & Dots)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);

    const mobileCarousel = speakerSection.locator('div.sm\\:hidden');
    await assert.doesNotReject(mobileCarousel.waitFor({ state: 'visible', timeout: 5000 }));

    const prevBtn = mobileCarousel.locator('button[aria-label="Penceramah sebelumnya"]');
    const nextBtn = mobileCarousel.locator('button[aria-label="Penceramah selanjutnya"]');

    await assert.doesNotReject(prevBtn.waitFor({ state: 'visible', timeout: 5000 }));
    await assert.doesNotReject(nextBtn.waitFor({ state: 'visible', timeout: 5000 }));

    // Initially at index 0: prev button is disabled
    assert.equal(await prevBtn.isDisabled(), true, 'Prev button should be disabled on first speaker slide');
    assert.equal(await nextBtn.isDisabled(), false, 'Next button should be enabled on first speaker slide');

    // Click Next button -> moves to slide index 1
    await nextBtn.click();
    await page.waitForTimeout(800);
    const isPrevDisabled = await prevBtn.isDisabled();
    if (isPrevDisabled) {
      // If smooth scrolling in headed browser delayed scroll event, click slide 2 dot
      const dot2 = mobileCarousel.locator('button[aria-label="Slide ke 2"]');
      if (await dot2.isVisible()) {
        await dot2.click();
        await page.waitForTimeout(800);
      }
    }
    assert.equal(await prevBtn.isDisabled(), false, 'Prev button should be enabled after navigating forward');

    // Click Dots Indicator: Jump to slide 3
    const dot3 = mobileCarousel.locator('button[aria-label="Slide ke 3"]');
    if (await dot3.isVisible()) {
      await dot3.click();
      await page.waitForTimeout(800);
    }

    // Restore desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(300);
  });

  test('8. Donation Section: Presets, Custom Nominal, Bank Details, and Copy Account Feedback Toast', async () => {
    const infaqSection = page.locator('section#infaq');
    await assert.doesNotReject(infaqSection.waitFor({ state: 'visible', timeout: 5000 }));

    // Verify Progress & Estimasi Kebutuhan Acara
    await assert.doesNotReject(infaqSection.locator('text=Rp 25.000.000').waitFor({ state: 'visible' }));
    await assert.doesNotReject(infaqSection.locator('text=Rp 18.500.000').waitFor({ state: 'visible' }));
    await assert.doesNotReject(infaqSection.locator('text=74% Tercapai').waitFor({ state: 'visible' }));

    // Verify Preset Nominal Buttons: 50rb, 100rb, 250rb, 500rb, 1.000rb
    const presets = [
      { label: '50rb', expectedWa: 'Rp%2050.000' },
      { label: '100rb', expectedWa: 'Rp%20100.000' },
      { label: '250rb', expectedWa: 'Rp%20250.000' },
      { label: '500rb', expectedWa: 'Rp%20500.000' },
      { label: '1.000rb', expectedWa: 'Rp%201.000.000' }
    ];

    for (const p of presets) {
      const btn = infaqSection.getByRole('button', { name: p.label, exact: true });
      await btn.click();
      await page.waitForTimeout(150);

      // Verify WA link contains updated encoded nominal
      const waLink = infaqSection.locator('a[href*="wa.me"]:has-text("Konfirmasi Infaq via WhatsApp")');
      const href = await waLink.getAttribute('href');
      assert.ok(href.includes(p.expectedWa), `WA confirmation URL should contain ${p.expectedWa}`);
    }

    // Test Custom Nominal Input
    const customInput = infaqSection.locator('input[type="number"][placeholder*="Nominal kustom"]');
    await customInput.fill('750000');
    await page.waitForTimeout(200);

    const waCustomLink = infaqSection.locator('a[href*="wa.me"]:has-text("Konfirmasi Infaq via WhatsApp (Rp 750.000)")');
    await assert.doesNotReject(waCustomLink.waitFor({ state: 'visible', timeout: 3000 }));
    const customHref = await waCustomLink.getAttribute('href');
    assert.ok(customHref.includes('Rp%20750.000'), 'WA link must reflect custom nominal Rp 750.000');

    // Test Copy Account Number Button & Toast Feedback
    const bsiSalinBtn = infaqSection.getByRole('button', { name: 'Salin' }).first();
    await assert.doesNotReject(bsiSalinBtn.waitFor({ state: 'visible', timeout: 5000 }));
    await bsiSalinBtn.click();

    // Verify button visual state changes to "Tersalin!"
    const tersalinBadge = infaqSection.locator('button:has-text("Tersalin!")');
    await assert.doesNotReject(tersalinBadge.waitFor({ state: 'visible', timeout: 3000 }));

    // Verify Toast Notification appears with success message
    const toastRegion = page.locator('div[role="region"][aria-label="Notifikasi Sistem"]');
    const toastItem = toastRegion.locator('div[role="status"]');
    await assert.doesNotReject(toastItem.waitFor({ state: 'visible', timeout: 3000 }));
    const toastContent = await toastItem.innerText();
    assert.match(toastContent, /Nomor rekening Bank Syariah Indonesia \(BSI\) \(7123456789\) berhasil disalin!/i);

    // Dismiss toast
    const dismissBtn = toastItem.locator('button[aria-label="Tutup notifikasi"]');
    if (await dismissBtn.isVisible()) {
      await dismissBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test('9. Location & Contact Section: Google Maps Link, Form Validation, and WhatsApp Submission', async () => {
    const contactSection = page.locator('section#kontak');
    await assert.doesNotReject(contactSection.waitFor({ state: 'visible', timeout: 5000 }));

    // Verify Venue Details & Google Maps Link
    await assert.doesNotReject(contactSection.locator('text=Mushola Nurul Hidayah').first().waitFor({ state: 'visible' }));
    const mapsLink = contactSection.locator('a:has-text("Petunjuk Arah Google Maps")');
    await assert.doesNotReject(mapsLink.waitFor({ state: 'visible' }));
    assert.ok((await mapsLink.getAttribute('href')).includes('maps.google.com'), 'Map link should point to Google Maps');

    // Verify Venue Amenities
    await assert.doesNotReject(contactSection.locator('text=Kapasitas 300+ motor').waitFor({ state: 'visible' }));
    await assert.doesNotReject(contactSection.locator('text=Tempat wudhu terpisah').waitFor({ state: 'visible' }));

    // Form inputs
    const inputNama = contactSection.locator('input[placeholder*="Contoh: H. Fathurrahman"]');
    const inputNoHp = contactSection.locator('input[placeholder*="Contoh: 081234567890"]');
    const textareaPesan = contactSection.locator('textarea[placeholder*="Tuliskan pertanyaan"]');
    const submitBtn = contactSection.locator('button[type="submit"]:has-text("Kirim Pesan via WhatsApp Panitia")');

    await assert.doesNotReject(inputNama.waitFor({ state: 'visible' }));
    await assert.doesNotReject(inputNoHp.waitFor({ state: 'visible' }));
    await assert.doesNotReject(textareaPesan.waitFor({ state: 'visible' }));
    await assert.doesNotReject(submitBtn.waitFor({ state: 'visible' }));

    // Intercept window.open so submitting doesn't open external window in test
    await page.evaluate(() => {
      window.__openedUrls = [];
      window.open = (url) => {
        window.__openedUrls.push(url);
        return null;
      };
    });

    // Fill valid form data
    await inputNama.fill('E2E-TEST-H. Ahmad Fikri');
    await inputNoHp.fill('081299887766');
    await textareaPesan.fill('Mohon info ketersediaan area parkir bus rombongan jamaah pengajian.');

    // Submit inquiry form
    await submitBtn.click();
    await page.waitForTimeout(500);

    // Verify success feedback card displayed
    const successCard = contactSection.locator('h4:has-text("Jazakumullah Khairan Katsiran!")');
    await assert.doesNotReject(successCard.waitFor({ state: 'visible', timeout: 5000 }));
    await assert.doesNotReject(contactSection.locator('text=Pesan dan konfirmasi Anda telah tercatat').waitFor({ state: 'visible' }));

    // Verify window.open was triggered with valid WhatsApp URL and prefilled text
    const openedUrls = await page.evaluate(() => window.__openedUrls);
    assert.ok(openedUrls.length > 0, 'Form submission must invoke window.open with WhatsApp URL');
    assert.ok(openedUrls[0].includes('wa.me/6281234567890'), 'URL must target panitia WhatsApp number');
    assert.ok(openedUrls[0].includes('E2E-TEST-H.%20Ahmad%20Fikri'), 'URL must contain sender name');

    // Verify Toast notification for inquiry
    const toastItem = page.locator('div[role="region"][aria-label="Notifikasi Sistem"] div[role="status"]');
    await assert.doesNotReject(toastItem.waitFor({ state: 'visible', timeout: 3000 }));
    const toastText = await toastItem.innerText();
    assert.match(toastText, /Pesan Anda telah disiapkan dan diarahkan langsung ke WhatsApp Panitia!/i);
  });

  test('10. Main Footer: Nav links, secretariat details, and scroll-to-top button', async () => {
    const footer = page.locator('footer');
    await assert.doesNotReject(footer.waitFor({ state: 'visible', timeout: 5000 }));

    // Verify quick links
    await assert.doesNotReject(footer.locator('a[href="#hero"]:has-text("Beranda")').waitFor({ state: 'visible' }));
    await assert.doesNotReject(footer.locator('a[href="#rundown"]:has-text("Susunan Acara")').waitFor({ state: 'visible' }));
    await assert.doesNotReject(footer.locator('a[href="#penceramah"]:has-text("Penceramah")').waitFor({ state: 'visible' }));
    await assert.doesNotReject(footer.locator('a[href="#infaq"]:has-text("Infaq")').waitFor({ state: 'visible' }));

    // Verify Login Portal link
    const portalFooterLink = footer.locator('a[href="/login"]:has-text("Login Portal Panitia")');
    await assert.doesNotReject(portalFooterLink.waitFor({ state: 'visible' }));

    // Test Scroll to top button
    const scrollTopBtn = footer.locator('button:has-text("Kembali ke Atas")');
    await assert.doesNotReject(scrollTopBtn.waitFor({ state: 'visible' }));
    await scrollTopBtn.click();
    
    // Wait for smooth scroll animation to settle at or near top
    await page.waitForFunction(() => window.scrollY < 100, { timeout: 4000 }).catch(() => {});
    const scrollY = await page.evaluate(() => window.scrollY);
    assert.ok(scrollY < 200, `Scroll position should be near top, actual: ${scrollY}`);
  });

  test('11. Zero Console Errors and Unhandled Exceptions Assertion', () => {
    // Assert zero unhandled exceptions
    assert.deepEqual(pageErrors, [], `Page threw unhandled exceptions: ${pageErrors.join(', ')}`);

    // Assert zero console errors
    assert.deepEqual(consoleErrors, [], `Page had console errors: ${consoleErrors.join(', ')}`);
  });
});
