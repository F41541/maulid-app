import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { chromium } = require("/home/laxcyyfa/.npm/_npx/86170c4cd1c5da32/node_modules/playwright");

const BASE_URL = "http://localhost:3000";

test("Page 2: Comprehensive Headed Playwright E2E Test for Login & Authentication Flow (/login)", async (t) => {
  const consoleErrors = [];

  // Launch Headed Chromium (Google Chrome) on DISPLAY=:0
  const browser = await chromium.launch({
    headless: false,
    channel: "chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      // Filter out browser network status logs for intentional 401 Unauthorized responses during negative auth testing
      if (text.includes("status of 401") || text.includes("Unauthorized")) {
        return;
      }
      consoleErrors.push(`[Console Error]: ${text}`);
    }
  });

  page.on("pageerror", (err) => {
    consoleErrors.push(`[Unhandled Page Error]: ${err.message}`);
  });

  try {
    // -------------------------------------------------------------------------
    // Subtest 2.1: Form Elements & Visual Structure
    // -------------------------------------------------------------------------
    await t.test("2.1 Form Elements & Visual Structure Verification", async () => {
      await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });

      // Page Title
      const title = await page.title();
      assert.ok(title.includes("Maulid"), `Page title should contain 'Maulid', got: '${title}'`);

      // Heading and description
      const heading = page.locator("h1:has-text('Masuk ke Portal')");
      await assert.doesNotReject(heading.waitFor({ state: "visible" }));

      const subtitle = page.locator("text=Gunakan akun panitia untuk mengelola kegiatan.");
      await assert.doesNotReject(subtitle.waitFor({ state: "visible" }));

      // Form input fields
      const usernameInput = page.locator('input[autocomplete="username"]');
      await assert.doesNotReject(usernameInput.waitFor({ state: "visible" }));
      const placeholderUser = await usernameInput.getAttribute("placeholder");
      assert.ok(
        placeholderUser?.includes("mfaisalfahri02@gmail.com"),
        `Username placeholder expected 'mfaisalfahri02@gmail.com', got '${placeholderUser}'`
      );

      const passwordInput = page.locator('input[type="password"]');
      await assert.doesNotReject(passwordInput.waitFor({ state: "visible" }));
      const placeholderPass = await passwordInput.getAttribute("placeholder");
      assert.ok(
        placeholderPass?.includes("Masukkan password Anda"),
        `Password placeholder expected 'Masukkan password Anda', got '${placeholderPass}'`
      );

      // Submit button
      const submitBtn = page.locator('button[type="submit"]:has-text("Masuk ke Dashboard")');
      await assert.doesNotReject(submitBtn.waitFor({ state: "visible" }));

      await page.waitForTimeout(300);
    });

    // -------------------------------------------------------------------------
    // Subtest 2.2: Form Validation (Required & HTML5 Constraints)
    // -------------------------------------------------------------------------
    await t.test("2.2 Form Validation (Empty / Required Fields)", async () => {
      const usernameInput = page.locator('input[autocomplete="username"]');
      const passwordInput = page.locator('input[type="password"]');
      const submitBtn = page.locator('button[type="submit"]');

      // Clear both inputs
      await usernameInput.fill("");
      await passwordInput.fill("");

      // Check HTML5 validity when both empty
      const isUserValidEmpty = await usernameInput.evaluate((el) => el.checkValidity());
      assert.equal(isUserValidEmpty, false, "Empty username input must be invalid under HTML5 required constraint");

      // Click submit on empty form: submission should be prevented by browser validation
      await submitBtn.click();
      await page.waitForTimeout(400);
      assert.ok(page.url().includes("/login"), "User must remain on /login when submitting empty fields");

      // Fill username only, password remains empty
      await usernameInput.fill("admin");
      const isPassValidEmpty = await passwordInput.evaluate((el) => el.checkValidity());
      assert.equal(isPassValidEmpty, false, "Empty password input must be invalid under HTML5 required constraint");

      // Try submitting again
      await submitBtn.click();
      await page.waitForTimeout(400);
      assert.ok(page.url().includes("/login"), "User must remain on /login when password is missing");

      // Clean up inputs
      await usernameInput.fill("");
      await passwordInput.fill("");
    });

    // -------------------------------------------------------------------------
    // Subtest 2.3: Invalid Credentials Rejection & Alert Banner
    // -------------------------------------------------------------------------
    await t.test("2.3 Invalid Credentials Error Feedback Banner", async () => {
      const usernameInput = page.locator('input[autocomplete="username"]');
      const passwordInput = page.locator('input[type="password"]');
      const submitBtn = page.locator('button[type="submit"]');

      // Enter invalid credentials
      await usernameInput.fill("admin");
      await passwordInput.fill("wrongpassword999");

      // Submit form
      await submitBtn.click();

      // Wait for error banner to appear
      const errorBanner = page.locator("div.text-rose-600.bg-rose-50, div.border-rose-200");
      await errorBanner.waitFor({ state: "visible", timeout: 5000 });

      const errorText = await errorBanner.textContent();
      assert.ok(
        errorText?.includes("Username atau password salah"),
        `Error banner should display 'Username atau password salah', got: '${errorText}'`
      );

      // Verify user remains on /login
      assert.ok(page.url().includes("/login"), "User must remain on /login after failed authentication");

      // Verify no session cookie was set
      const cookies = await context.cookies();
      const sessionCookie = cookies.find((c) => c.name === "maulid_session");
      assert.equal(sessionCookie, undefined, "maulid_session cookie must not be set on invalid login");

      await page.waitForTimeout(300);
    });

    // -------------------------------------------------------------------------
    // Subtest 2.4: Valid Authentication & Dashboard Redirection
    // -------------------------------------------------------------------------
    await t.test("2.4 Valid Login & Redirect to /dashboard", async () => {
      const usernameInput = page.locator('input[autocomplete="username"]');
      const passwordInput = page.locator('input[type="password"]');
      const submitBtn = page.locator('button[type="submit"]');

      // Enter valid administrator credentials
      await usernameInput.fill("admin");
      await passwordInput.fill("admin123");

      // Submit form
      await submitBtn.click();

      // Wait for navigation to /dashboard
      await page.waitForURL("**/dashboard", { timeout: 10000 });
      assert.ok(page.url().includes("/dashboard"), `URL should be /dashboard, got: ${page.url()}`);

      // Verify session cookie was issued
      const cookies = await context.cookies();
      const sessionCookie = cookies.find((c) => c.name === "maulid_session");
      assert.ok(sessionCookie, "maulid_session cookie must exist after successful login");
      assert.ok(sessionCookie.value.length > 20, "Session token must be a signed non-empty string");
      assert.equal(sessionCookie.httpOnly, true, "Session cookie must be httpOnly");

      // Verify sessionStorage has cached user
      const cachedUser = await page.evaluate(() => {
        const raw = sessionStorage.getItem("maulid_user_session");
        return raw ? JSON.parse(raw) : null;
      });
      assert.ok(cachedUser, "sessionStorage maulid_user_session must be populated");
      assert.equal(cachedUser.username, "admin");

      // Verify Dashboard Portal Shell & Elements
      const sidebar = page.locator('aside[aria-label="Sidebar Panitia"]');
      await sidebar.waitFor({ state: "visible", timeout: 5000 });

      // Verify User info in Sidebar
      const userNameDisplay = sidebar.locator("text=Sekretariat Panitia");
      await userNameDisplay.waitFor({ state: "visible" });

      const roleBadge = sidebar.locator("text=Ketua Panitia");
      await roleBadge.waitFor({ state: "visible" });

      // Verify Navigation Links in Sidebar
      const navDashboard = sidebar.locator('a[href="/dashboard"]');
      const navKeuangan = sidebar.locator('a[href="/keuangan"]');
      const navRundown = sidebar.locator('a[href="/rundown"]');
      await assert.doesNotReject(navDashboard.waitFor({ state: "visible" }));
      await assert.doesNotReject(navKeuangan.waitFor({ state: "visible" }));
      await assert.doesNotReject(navRundown.waitFor({ state: "visible" }));

      await page.waitForTimeout(500);
    });

    // -------------------------------------------------------------------------
    // Subtest 2.5: Session Continuity & Login Page Auto-Redirect
    // -------------------------------------------------------------------------
    await t.test("2.5 Session Continuity & Login Page Auto-Redirect", async () => {
      // Direct navigation to protected route /keuangan
      await page.goto(`${BASE_URL}/keuangan`, { waitUntil: "networkidle" });
      assert.ok(page.url().includes("/keuangan"), `Should access /keuangan seamlessly, got: ${page.url()}`);

      // When already logged in, visiting /login must auto-redirect back to /dashboard
      await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
      await page.waitForURL("**/dashboard", { timeout: 10000 });
      assert.ok(
        page.url().includes("/dashboard"),
        `Authenticated user visiting /login must be redirected to /dashboard, got: ${page.url()}`
      );

      await page.waitForTimeout(300);
    });

    // -------------------------------------------------------------------------
    // Subtest 2.6: Unauthenticated Route Guards
    // -------------------------------------------------------------------------
    await t.test("2.6 Unauthenticated Route Guard Blocks Protected Pages", async () => {
      // Create a fresh isolated context with NO cookies/session
      const cleanContext = await browser.newContext({
        viewport: { width: 1280, height: 800 },
      });
      const cleanPage = await cleanContext.newPage();

      cleanPage.on("pageerror", (err) => {
        consoleErrors.push(`[CleanPage Unhandled Error]: ${err.message}`);
      });

      try {
        const protectedRoutes = ["/dashboard", "/keuangan", "/pengguna", "/rundown", "/tugas", "/tamu", "/struktur"];

        for (const route of protectedRoutes) {
          await cleanPage.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle" });
          assert.ok(
            cleanPage.url().includes("/login"),
            `Unauthenticated visit to ${route} must redirect to /login, got: ${cleanPage.url()}`
          );
        }
      } finally {
        await cleanPage.close();
        await cleanContext.close();
      }
    });

    // -------------------------------------------------------------------------
    // Subtest 2.7: Logout Flow & Session Revocation
    // -------------------------------------------------------------------------
    await t.test("2.7 Logout Flow & Session Invalidation", async () => {
      // Return to authenticated dashboard page
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });

      const logoutBtn = page.locator('aside[aria-label="Sidebar Panitia"] button[aria-label="Keluar dari akun"]');
      await logoutBtn.waitFor({ state: "visible" });

      // Click logout
      await logoutBtn.click();

      // Wait for redirect to /login
      await page.waitForURL("**/login", { timeout: 10000 });
      assert.ok(page.url().includes("/login"), `After logout, must redirect to /login, got: ${page.url()}`);

      // Verify cookie maulid_session is cleared / deleted
      const cookiesAfterLogout = await context.cookies();
      const sessionCookieAfter = cookiesAfterLogout.find((c) => c.name === "maulid_session");
      assert.equal(
        sessionCookieAfter,
        undefined,
        "maulid_session cookie must be deleted/cleared upon logout"
      );

      // Verify cached user in sessionStorage is cleared
      const cachedUserAfter = await page.evaluate(() => sessionStorage.getItem("maulid_user_session"));
      assert.equal(cachedUserAfter, null, "sessionStorage maulid_user_session must be null after logout");

      // Verify route guard now blocks accessing /dashboard
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
      assert.ok(
        page.url().includes("/login"),
        `Attempting to access /dashboard after logout must redirect to /login, got: ${page.url()}`
      );

      await page.waitForTimeout(300);
    });

    // -------------------------------------------------------------------------
    // Subtest 2.8: Zero Console Errors Verification
    // -------------------------------------------------------------------------
    await t.test("2.8 Zero Console Errors and Unhandled Exceptions Verification", async () => {
      assert.deepEqual(
        consoleErrors,
        [],
        `Expected zero console errors and unhandled exceptions, encountered: ${consoleErrors.join("; ")}`
      );
    });

    console.log("\n==================================================================");
    console.log("🎉 ALL PAGE 2 (LOGIN & AUTH FLOW) E2E HEADED TESTS PASSED CLEANLY!");
    console.log("==================================================================\n");

  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
});
