import test from "node:test";
import assert from "node:assert/strict";
import {
  isSidebarRole,
  isKetuaRole,
  isWakilRole,
  getNavRoutes,
  ROLES,
} from "../src/lib/auth-tokens.ts";

test("1. isSidebarRole accurately identifies Ketua and Wakil Panitia roles and jabatans", () => {
  // Roles for Ketua Panitia
  assert.equal(isSidebarRole("ketua_panitia"), true, "Role 'ketua_panitia' must use sidebar");
  assert.equal(isSidebarRole("admin"), true, "Legacy role 'admin' must use sidebar");
  assert.equal(isSidebarRole("ketua"), true, "Role 'ketua' must use sidebar");
  assert.equal(isSidebarRole(ROLES.KETUA_PANITIA), true, "ROLES.KETUA_PANITIA must use sidebar");

  // Jabatans for Ketua Panitia
  assert.equal(isSidebarRole(undefined, "Ketua Panitia"), true, "Jabatan 'Ketua Panitia' must use sidebar");
  assert.equal(isSidebarRole("", "Ketua Panitia"), true, "Jabatan 'Ketua Panitia' with empty role must use sidebar");
  assert.equal(isSidebarRole(null, "Ketua"), true, "Jabatan 'Ketua' must use sidebar");
  assert.equal(isSidebarRole("user", "Ketua Panitia"), true, "Jabatan 'Ketua Panitia' overrides generic role");
  assert.equal(isSidebarRole(undefined, "Ketua Pelaksana"), true, "Jabatan 'Ketua Pelaksana' must use sidebar");
  assert.equal(isSidebarRole(undefined, "Ketua Panitia Maulid"), true, "Jabatan 'Ketua Panitia Maulid' must use sidebar");

  // Roles for Wakil Panitia
  assert.equal(isSidebarRole("wakil_ketua"), true, "Role 'wakil_ketua' must use sidebar");
  assert.equal(isSidebarRole("wakil_panitia"), true, "Role 'wakil_panitia' must use sidebar");
  assert.equal(isSidebarRole("wakil_ketua_panitia"), true, "Role 'wakil_ketua_panitia' must use sidebar");
  assert.equal(isSidebarRole(ROLES.WAKIL_KETUA), true, "ROLES.WAKIL_KETUA must use sidebar");

  // Jabatans for Wakil Panitia
  assert.equal(isSidebarRole(undefined, "Wakil Ketua"), true, "Jabatan 'Wakil Ketua' must use sidebar");
  assert.equal(isSidebarRole(undefined, "Wakil Panitia"), true, "Jabatan 'Wakil Panitia' must use sidebar");
  assert.equal(isSidebarRole(undefined, "Wakil Ketua Panitia"), true, "Jabatan 'Wakil Ketua Panitia' must use sidebar");
  assert.equal(isSidebarRole(undefined, "Wakil Ketua Pelaksana"), true, "Jabatan 'Wakil Ketua Pelaksana' must use sidebar");
  assert.equal(isSidebarRole(undefined, "Wakil"), true, "Jabatan 'Wakil' must use sidebar");
  assert.equal(isSidebarRole(undefined, "Wakil Ketua 1"), true, "Jabatan 'Wakil Ketua 1' must use sidebar");
  assert.equal(isSidebarRole(undefined, "Wakil Ketua 2"), true, "Jabatan 'Wakil Ketua 2' must use sidebar");
  assert.equal(isSidebarRole(undefined, "Wakil Ketua I"), true, "Jabatan 'Wakil Ketua I' (Roman) must use sidebar");
  assert.equal(isSidebarRole(undefined, "Wakil Ketua II"), true, "Jabatan 'Wakil Ketua II' (Roman) must use sidebar");
  assert.equal(isSidebarRole(undefined, "Wakil 1"), true, "Jabatan 'Wakil 1' must use sidebar");

  // Case-insensitivity and formatting tolerance
  assert.equal(isSidebarRole("KETUA_PANITIA"), true, "Uppercase role must work");
  assert.equal(isSidebarRole(undefined, "ketua panitia"), true, "Lowercase jabatan must work");
  assert.equal(isSidebarRole(undefined, "  Wakil Panitia  "), true, "Trimmed jabatan must work");
  assert.equal(isSidebarRole("WAKIL_KETUA"), true, "Uppercase wakil role must work");
});

test("2. isSidebarRole correctly rejects non-Ketua/Wakil roles to use Bottom Bar", () => {
  // Sekretaris
  assert.equal(isSidebarRole("sekretaris"), false, "Role 'sekretaris' must use bottom bar");
  assert.equal(isSidebarRole(ROLES.SEKRETARIS), false, "ROLES.SEKRETARIS must use bottom bar");
  assert.equal(isSidebarRole(undefined, "Sekretaris"), false, "Jabatan 'Sekretaris' must use bottom bar");
  assert.equal(isSidebarRole(undefined, "Wakil Sekretaris"), false, "Jabatan 'Wakil Sekretaris' must use bottom bar");

  // Bendahara
  assert.equal(isSidebarRole("bendahara"), false, "Role 'bendahara' must use bottom bar");
  assert.equal(isSidebarRole(ROLES.BENDAHARA), false, "ROLES.BENDAHARA must use bottom bar");
  assert.equal(isSidebarRole(undefined, "Bendahara"), false, "Jabatan 'Bendahara' must use bottom bar");
  assert.equal(isSidebarRole(undefined, "Wakil Bendahara"), false, "Jabatan 'Wakil Bendahara' must use bottom bar");

  // Koordinator Seksi & Seksi Heads
  assert.equal(isSidebarRole("koordinator_seksi"), false, "Role 'koordinator_seksi' must use bottom bar");
  assert.equal(isSidebarRole(ROLES.KOORDINATOR_SEKSI), false, "ROLES.KOORDINATOR_SEKSI must use bottom bar");
  assert.equal(isSidebarRole(undefined, "Koordinator Seksi"), false, "Jabatan 'Koordinator Seksi' must use bottom bar");
  assert.equal(isSidebarRole(undefined, "Ketua Seksi Acara"), false, "Jabatan 'Ketua Seksi Acara' must use bottom bar");
  assert.equal(isSidebarRole(undefined, "Ketua Bidang Logistik"), false, "Jabatan 'Ketua Bidang Logistik' must use bottom bar");
  assert.equal(isSidebarRole(undefined, "Wakil Koordinator Seksi"), false, "Jabatan 'Wakil Koordinator Seksi' must use bottom bar");

  // Pelindung & Penasihat
  assert.equal(isSidebarRole("pelindung"), false, "Role 'pelindung' must use bottom bar");
  assert.equal(isSidebarRole("penasihat"), false, "Role 'penasihat' must use bottom bar");
  assert.equal(isSidebarRole(undefined, "Pelindung"), false, "Jabatan 'Pelindung' must use bottom bar");
  assert.equal(isSidebarRole(undefined, "Penasihat"), false, "Jabatan 'Penasihat' must use bottom bar");

  // Anggota Seksi & Panitia Lain
  assert.equal(isSidebarRole("anggota"), false, "Role 'anggota' must use bottom bar");
  assert.equal(isSidebarRole(undefined, "Anggota Seksi"), false, "Jabatan 'Anggota Seksi' must use bottom bar");
  assert.equal(isSidebarRole(undefined, "Seksi Acara"), false, "Jabatan 'Seksi Acara' must use bottom bar");
  assert.equal(isSidebarRole(undefined, "Seksi Konsumsi"), false, "Jabatan 'Seksi Konsumsi' must use bottom bar");

  // Default / Empty / Edge Cases
  assert.equal(isSidebarRole(), false, "Empty arguments must default to bottom bar");
  assert.equal(isSidebarRole(null, null), false, "null arguments must default to bottom bar");
  assert.equal(isSidebarRole("", ""), false, "Empty strings must default to bottom bar");
  assert.equal(isSidebarRole("unknown_role"), false, "Unknown role must default to bottom bar");
  assert.equal(isSidebarRole(undefined, "Tamu Undangan"), false, "Guest jabatan must default to bottom bar");
});

test("3. Navigation Menu items mapping according to role-based access", () => {
  // Ketua gets full 7 modules (tested via exported getNavRoutes)
  const ketuaItems = getNavRoutes("ketua_panitia");
  assert.equal(ketuaItems.length, 7);
  assert.ok(ketuaItems.includes("/pengguna"), "Ketua Panitia must have access to /pengguna");

  // Ketua identified by jabatan 'Ketua' gets full 7 modules
  const ketuaByJabatan = getNavRoutes(undefined, "Ketua");
  assert.equal(ketuaByJabatan.length, 7, "Ketua identified by jabatan must get all 7 modules");
  assert.ok(ketuaByJabatan.includes("/pengguna"), "Ketua by jabatan must have /pengguna");

  // Wakil gets 6 modules (no /pengguna)
  const wakilItems = getNavRoutes("wakil_ketua");
  assert.equal(wakilItems.length, 6);
  assert.ok(!wakilItems.includes("/pengguna"), "Wakil must not have /pengguna");
  assert.ok(wakilItems.includes("/keuangan"), "Wakil must have /keuangan");
  assert.ok(wakilItems.includes("/tamu"), "Wakil must have /tamu");

  // Wakil identified by Roman numeral 'Wakil Ketua I' gets 6 modules
  const wakilRoman = getNavRoutes(undefined, "Wakil Ketua I");
  assert.equal(wakilRoman.length, 6, "Wakil Ketua I must get 6 modules");
  assert.ok(!wakilRoman.includes("/pengguna"));

  // Wakil Bendahara must NOT receive Wakil Ketua modules; gets Bendahara modules
  const wakilBendahara = getNavRoutes(undefined, "Wakil Bendahara");
  assert.deepEqual(wakilBendahara, ["/dashboard", "/keuangan", "/tugas"]);

  // Bendahara gets 3 modules
  const bendaharaItems = getNavRoutes("bendahara");
  assert.deepEqual(bendaharaItems, ["/dashboard", "/keuangan", "/tugas"]);

  // Sekretaris gets 4 modules
  const sekretarisItems = getNavRoutes("sekretaris");
  assert.deepEqual(sekretarisItems, ["/dashboard", "/tugas", "/rundown", "/tamu"]);

  // Koordinator Seksi gets 2 modules
  const seksiItems = getNavRoutes("koordinator_seksi");
  assert.deepEqual(seksiItems, ["/dashboard", "/tugas"]);

  // Pelindung & Penasihat get 1 module
  const pelindungItems = getNavRoutes("pelindung");
  assert.deepEqual(pelindungItems, ["/dashboard"]);

  // Default / Unknown gets 2 modules
  const defaultItems = getNavRoutes();
  assert.deepEqual(defaultItems, ["/dashboard", "/tugas"]);
});

test("4. isKetuaRole and isWakilRole distinct boundary checking", () => {
  assert.equal(isKetuaRole("ketua_panitia"), true);
  assert.equal(isKetuaRole("admin"), true);
  assert.equal(isKetuaRole(undefined, "Ketua Panitia"), true);
  assert.equal(isKetuaRole(undefined, "Ketua"), true);
  assert.equal(isKetuaRole(undefined, "Wakil Ketua"), false);
  assert.equal(isKetuaRole(undefined, "Ketua Seksi"), false);

  assert.equal(isWakilRole("wakil_ketua"), true);
  assert.equal(isWakilRole(undefined, "Wakil Ketua"), true);
  assert.equal(isWakilRole(undefined, "Wakil"), true);
  assert.equal(isWakilRole("ketua_panitia"), false);
  assert.equal(isWakilRole(undefined, "Ketua Panitia"), false);
  assert.equal(isWakilRole(undefined, "Wakil Bendahara"), false);
});
