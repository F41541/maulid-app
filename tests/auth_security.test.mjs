import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  createSessionToken,
  verifySessionToken,
  signToken,
  ROLES,
} from "../src/lib/auth-tokens.ts";
import { proxy } from "../src/proxy.ts";
import { NextRequest } from "next/server.js";

test("1. verifySessionToken accepts valid signed tokens", () => {
  const token = createSessionToken({
    id: "admin-1",
    username: "mfaisalfahri02@gmail.com",
    nama: "Faisal Fahri",
    role: ROLES.KETUA_PANITIA,
    seksi_id: null,
  });

  assert.ok(token);
  const session = verifySessionToken(token);
  assert.ok(session);
  assert.equal(session.userId, "admin-1");
  assert.equal(session.username, "mfaisalfahri02@gmail.com");
  assert.equal(session.role, ROLES.KETUA_PANITIA);
});

test("2. verifySessionToken strictly rejects forged or altered tokens", () => {
  // Altered signature
  const validToken = createSessionToken({
    id: "admin-1",
    username: "mfaisalfahri02@gmail.com",
    nama: "Faisal Fahri",
    role: ROLES.KETUA_PANITIA,
  });

  const decoded = Buffer.from(validToken, "base64").toString("utf-8");
  const parts = decoded.split(":");
  parts[5] = "0000000000000000000000000000000000000000000000000000000000000000"; // Fake sig
  const forgedToken = Buffer.from(parts.join(":")).toString("base64");

  assert.equal(verifySessionToken(forgedToken), null, "Altered signature must be rejected");

  // Tampered payload with original signature
  const tamperedPayload = Buffer.from(
    `admin-1:attacker@evil.com:ketua_panitia::${parts[4]}:${parts[5]}`
  ).toString("base64");
  assert.equal(verifySessionToken(tamperedPayload), null, "Tampered payload must be rejected");
});

test("3. verifySessionToken strictly rejects legacy 2-part bypass tokens", () => {
  const backdoorToken = Buffer.from("admin-1:mfaisalfahri02@gmail.com").toString("base64");
  const result = verifySessionToken(backdoorToken);
  assert.equal(result, null, "2-part legacy backdoor token MUST return null");
});

test("4. verifySessionToken strictly rejects expired tokens", () => {
  const expiredTime = Date.now() - 10000;
  const payload = `admin-1:user@example.com:ketua_panitia::${expiredTime}`;
  const sig = signToken(payload);
  const expiredToken = Buffer.from(`${payload}:${sig}`).toString("base64");

  const result = verifySessionToken(expiredToken);
  assert.equal(result, null, "Expired token must be rejected");
});

test("5. LoginPage does NOT contain hardcoded prefilled credentials", () => {
  const loginPagePath = path.join(process.cwd(), "src/app/login/page.tsx");
  const content = fs.readFileSync(loginPagePath, "utf-8");

  assert.match(
    content,
    /const\s*\[username,\s*setUsername\]\s*=\s*useState\(["']["']\)/,
    "Username initial state must be empty string"
  );
  assert.match(
    content,
    /const\s*\[password,\s*setPassword\]\s*=\s*useState\(["']["']\)/,
    "Password initial state must be empty string"
  );
  assert.doesNotMatch(
    content,
    /Akun Ketua:/,
    "Leaked credential info box must not exist in login page"
  );
});

test("6. Proxy route guards enforce strict authentication and roles", () => {
  // A. Access protected route without token -> redirects to /login
  const reqNoSession = new NextRequest("http://localhost:3000/dashboard");
  const resNoSession = proxy(reqNoSession);
  assert.equal(resNoSession.status, 307);
  assert.ok(resNoSession.headers.get("location")?.includes("/login"));

  // B. Access protected API without token -> 401 Unauthorized
  const reqApiNoSession = new NextRequest("http://localhost:3000/api/keuangan");
  const resApiNoSession = proxy(reqApiNoSession);
  assert.equal(resApiNoSession.status, 401);

  // C. Access /login with invalid/expired session cookie -> stays on /login and clears cookie
  const reqInvalidSession = new NextRequest("http://localhost:3000/login", {
    headers: {
      cookie: "maulid_session=invalid-garbage-token",
    },
  });
  const resInvalidSession = proxy(reqInvalidSession);
  assert.equal(resInvalidSession.status, 200, "Should stay on /login");
  const setCookie = resInvalidSession.headers.get("set-cookie") || "";
  assert.ok(setCookie.includes("maulid_session="), "Stale cookie must be deleted");

  // D. Access /login with valid session -> redirects to /dashboard
  const validToken = createSessionToken({
    id: "admin-1",
    username: "user@test.com",
    nama: "Ketua",
    role: "ketua_panitia",
  });
  const reqValidLogin = new NextRequest("http://localhost:3000/login", {
    headers: {
      cookie: `maulid_session=${validToken}`,
    },
  });
  const resValidLogin = proxy(reqValidLogin);
  assert.equal(resValidLogin.status, 307);
  assert.ok(resValidLogin.headers.get("location")?.includes("/dashboard"));

  // E. Access /pengguna as bendahara -> redirects to /dashboard (forbidden role guard)
  const bendaharaToken = createSessionToken({
    id: "user-bendahara",
    username: "bendahara@test.com",
    nama: "Bendahara",
    role: "bendahara",
  });
  const reqBendaharaPengguna = new NextRequest("http://localhost:3000/pengguna", {
    headers: {
      cookie: `maulid_session=${bendaharaToken}`,
    },
  });
  const resBendaharaPengguna = proxy(reqBendaharaPengguna);
  assert.equal(resBendaharaPengguna.status, 307);
  assert.ok(resBendaharaPengguna.headers.get("location")?.includes("/dashboard"));
});

test("7. Session duration is 1 day and failed login threshold is 5 attempts", () => {
  const rootDir = process.cwd();

  // Verify token expiry is 1 day (within 5 seconds tolerance of 24h)
  const before = Date.now() + 24 * 60 * 60 * 1000;
  const token = createSessionToken({
    id: "admin-1",
    username: "user@test.com",
    nama: "Ketua",
    role: ROLES.KETUA_PANITIA,
  });
  const session = verifySessionToken(token);
  assert.ok(session);
  assert.ok(session.expiresAt >= before - 1000 && session.expiresAt <= before + 5000, "Token expiresAt must be ~24 hours from creation");

  // Verify cookie maxAge in auth.ts is 1 day
  const authPath = path.join(rootDir, "src", "lib", "auth.ts");
  const authContent = fs.readFileSync(authPath, "utf-8");
  assert.match(authContent, /maxAge:\s*60\s*\*\s*60\s*\*\s*24(?!\s*\*)/, "Cookie maxAge must be 1 day (86400 seconds)");

  // Verify failed login lock threshold in route.ts is 5
  const authRoutePath = path.join(rootDir, "src", "app", "api", "auth", "route.ts");
  const routeContent = fs.readFileSync(authRoutePath, "utf-8");
  assert.match(routeContent, /count\s*>=\s*5/, "Failed login attempts threshold must be 5");
});
