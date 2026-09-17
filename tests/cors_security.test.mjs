import test from "node:test";
import assert from "node:assert/strict";
import { isAllowedOrigin, isForbiddenCrossSite, getCorsHeaders } from "../src/lib/cors.ts";
import nextConfig from "../next.config.ts";

test("1. CORS - isAllowedOrigin verifies trusted origins and rejects external hosts", () => {
  const host = "panitia-maulid.id";

  // Same origin match
  assert.equal(
    isAllowedOrigin("https://panitia-maulid.id", host),
    true,
    "Matching host must be allowed"
  );

  // Cross origin malicious domain
  assert.equal(
    isAllowedOrigin("https://evil-hacker.com", host),
    false,
    "External malicious domain must be rejected"
  );

  // Subdomain mismatch
  assert.equal(
    isAllowedOrigin("https://sub.otherdomain.com", host),
    false,
    "Unregistered external subdomain must be rejected"
  );

  // Null/empty origin (direct client, internal server-side, curl)
  assert.equal(
    isAllowedOrigin(null, host),
    true,
    "Empty origin should not be flagged as cross-origin"
  );
  assert.equal(
    isAllowedOrigin(undefined, host),
    true,
    "Undefined origin should not be flagged as cross-origin"
  );

  // Custom allowed origins
  assert.equal(
    isAllowedOrigin("https://staging.panitia-maulid.id", host, ["https://staging.panitia-maulid.id"]),
    true,
    "Explicitly whitelisted origin must be allowed"
  );
});

test("2. CORS - isForbiddenCrossSite detects cross-origin and CSRF vectors", () => {
  const host = "panitia-maulid.id";

  // Case 1: Sec-Fetch-Site is explicit cross-site
  assert.equal(
    isForbiddenCrossSite({
      host,
      origin: "https://panitia-maulid.id",
      secFetchSite: "cross-site",
    }),
    true,
    "Sec-Fetch-Site: cross-site must be rejected immediately"
  );

  // Case 2: Origin is external domain
  assert.equal(
    isForbiddenCrossSite({
      host,
      origin: "https://attacker.site",
      secFetchSite: "cross-site",
    }),
    true,
    "Malicious origin must be rejected"
  );

  // Case 3: Legitimate same-origin request
  assert.equal(
    isForbiddenCrossSite({
      host,
      origin: "https://panitia-maulid.id",
      secFetchSite: "same-origin",
      referer: "https://panitia-maulid.id/dashboard",
    }),
    false,
    "Legitimate same-origin request must be accepted"
  );

  // Case 4: No origin, but external Referer present
  assert.equal(
    isForbiddenCrossSite({
      host,
      origin: null,
      referer: "https://evil.org/phishing-page",
    }),
    true,
    "External referer without origin must be rejected"
  );

  // Case 5: Direct request without browser origin/referer (e.g. mobile app or test)
  assert.equal(
    isForbiddenCrossSite({
      host,
      origin: null,
      referer: null,
      secFetchSite: "none",
    }),
    false,
    "Direct request without cross-site indicators should not be blocked by CORS"
  );
});

test("3. CORS - getCorsHeaders returns correct headers for allowed origins", () => {
  const allowedOrigin = "https://panitia-maulid.id";
  const headers = getCorsHeaders(allowedOrigin, true);

  assert.equal(headers["Access-Control-Allow-Origin"], allowedOrigin);
  assert.equal(headers["Access-Control-Allow-Credentials"], "true");
  assert.ok(headers["Access-Control-Allow-Methods"].includes("POST"));
  assert.ok(headers["Access-Control-Allow-Methods"].includes("DELETE"));
  assert.equal(headers["Vary"], "Origin");

  // Disallowed origin should return empty headers
  const blockedHeaders = getCorsHeaders("https://evil.com", false);
  assert.deepEqual(blockedHeaders, {});
});

test("4. Security Headers - next.config.ts configures comprehensive HTTP defense headers", async () => {
  assert.ok(typeof nextConfig.headers === "function", "nextConfig must define headers() function");

  const headerRules = await nextConfig.headers();
  assert.ok(Array.isArray(headerRules), "headers() must return an array of route rules");

  const globalRule = headerRules.find((rule) => rule.source === "/:path*");
  assert.ok(globalRule, "Must have a global /:path* security header rule");

  const headersMap = new Map();
  for (const h of globalRule.headers) {
    headersMap.set(h.key.toLowerCase(), h.value);
  }

  // 1. Clickjacking defense
  assert.equal(headersMap.get("x-frame-options"), "DENY");

  // 2. MIME sniffing defense
  assert.equal(headersMap.get("x-content-type-options"), "nosniff");

  // 3. Referrer leakage defense
  assert.equal(headersMap.get("referrer-policy"), "strict-origin-when-cross-origin");

  // 4. Legacy XSS filter defense
  assert.equal(headersMap.get("x-xss-protection"), "1; mode=block");

  // 5. Sensitive hardware permissions lockdown
  const permissions = headersMap.get("permissions-policy");
  assert.ok(permissions, "Permissions-Policy must be configured");
  assert.ok(permissions.includes("microphone=()"));
  assert.ok(permissions.includes("geolocation=()"));
});
