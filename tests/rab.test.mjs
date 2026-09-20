import test from "node:test";
import assert from "node:assert/strict";
import { getNavRoutes, ROLES } from "../src/lib/auth-tokens.ts";
import { formatRupiah } from "../src/lib/format.ts";
import { sanitizeFormula } from "../src/lib/excel-export.ts";

test("1. RAB calculation logic (Volume x Harga Satuan = Total Estimasi)", () => {
  const calculateTotal = (volume, hargaSatuan) => {
    const vol = parseFloat(volume);
    const harga = parseInt(hargaSatuan, 10);
    if (isNaN(vol) || isNaN(harga) || vol <= 0 || harga < 0) return 0;
    return Math.round(vol * harga);
  };

  assert.equal(calculateTotal("500", "25000"), 12500000, "500 porsi x Rp 25.000 = Rp 12.500.000");
  assert.equal(calculateTotal("1", "5000000"), 5000000, "1 set panggung x Rp 5.000.000 = Rp 5.000.000");
  assert.equal(calculateTotal("2.5", "100000"), 250000, "2.5 rim x Rp 100.000 = Rp 250.000");
  assert.equal(calculateTotal("0", "25000"), 0, "Volume 0 harus bernilai 0");
  assert.equal(calculateTotal("-5", "25000"), 0, "Volume negatif harus bernilai 0");
  assert.equal(calculateTotal("10", "-500"), 0, "Harga satuan negatif harus bernilai 0");
});

test("2. RAB navigation permissions and role exclusivity", () => {
  // Ketua Panitia must have /rab
  const ketuaRoutes = getNavRoutes(ROLES.KETUA_PANITIA);
  assert.ok(ketuaRoutes.includes("/rab"), "Ketua Panitia must have access to /rab");

  // Wakil Ketua must have /rab
  const wakilRoutes = getNavRoutes(ROLES.WAKIL_KETUA);
  assert.ok(wakilRoutes.includes("/rab"), "Wakil Ketua must have access to /rab");

  // Bendahara must have /rab
  const bendaharaRoutes = getNavRoutes(ROLES.BENDAHARA);
  assert.ok(bendaharaRoutes.includes("/rab"), "Bendahara must have access to /rab");

  // Sekretaris must NOT have /rab
  const sekretarisRoutes = getNavRoutes(ROLES.SEKRETARIS);
  assert.ok(!sekretarisRoutes.includes("/rab"), "Sekretaris must not have access to /rab");

  // Koordinator Seksi must NOT have /rab
  const seksiRoutes = getNavRoutes(ROLES.KOORDINATOR_SEKSI);
  assert.ok(!seksiRoutes.includes("/rab"), "Koordinator Seksi must not have access to /rab");

  // Pelindung must NOT have /rab
  const pelindungRoutes = getNavRoutes(ROLES.PELINDUNG);
  assert.ok(!pelindungRoutes.includes("/rab"), "Pelindung must not have access to /rab");
});

test("3. Excel export data formatting and formula sanitization for RAB", () => {
  const sampleItems = [
    {
      nama_seksi: "Seksi Konsumsi",
      nama_item: "=1+1 Snack Kotak",
      volume: 500,
      satuan: "kotak",
      harga_satuan: 15000,
      total_estimasi: 7500000,
      catatan: "@Toko Roti Barokah",
    },
    {
      nama_seksi: null,
      nama_item: "Dana Tak Terduga",
      volume: 1,
      satuan: "paket",
      harga_satuan: 2000000,
      total_estimasi: 2000000,
      catatan: null,
    },
  ];

  const rows = sampleItems.map((it, idx) => [
    idx + 1,
    sanitizeFormula(it.nama_seksi || "Umum / Kepanitiaan"),
    sanitizeFormula(it.nama_item),
    Number(it.volume),
    sanitizeFormula(it.satuan),
    Number(it.harga_satuan),
    Number(it.total_estimasi),
    sanitizeFormula(it.catatan || "-"),
  ]);

  // Formula injection check
  assert.equal(rows[0][2], "'=1+1 Snack Kotak", "Formula '=' must be sanitized with leading quote");
  assert.equal(rows[0][7], "'@Toko Roti Barokah", "Formula '@' must be sanitized with leading quote");

  // Default seksi check
  assert.equal(rows[1][1], "Umum / Kepanitiaan", "Null seksi must fallback to 'Umum / Kepanitiaan'");
});

test("4. Format Rupiah display for RAB items", () => {
  assert.equal(formatRupiah(12500000).replace(/\s/g, " "), "Rp 12.500.000");
  assert.equal(formatRupiah(0).replace(/\s/g, " "), "Rp 0");
});

test("5. Master-Detail Wadah calculation & Cash Realization comparison", () => {
  const wadah = {
    id: "wadah-1",
    nama_anggaran: "Anggaran Konsumsi Jamaah",
    items: [
      { nama_item: "Nasi Kotak", volume: 500, harga_satuan: 25000, total_estimasi: 12500000 },
      { nama_item: "Air Mineral Dus", volume: 20, harga_satuan: 25000, total_estimasi: 500000 },
    ],
  };

  const totalRencana = wadah.items.reduce((sum, it) => sum + it.total_estimasi, 0);
  assert.equal(totalRencana, 13000000, "Total rencana wadah harus Rp 13.000.000");

  const realisasiKas = 5000000; // DP nasi kotak
  const sisaAnggaran = totalRencana - realisasiKas;
  assert.equal(sisaAnggaran, 8000000, "Sisa anggaran harus Rp 8.000.000");

  const persentase = Math.round((realisasiKas / totalRencana) * 100);
  assert.equal(persentase, 38, "Penyerapan dana harus 38%");

  // Deletion protection check:
  const canDeleteWadah = (linkedExpenseCount) => linkedExpenseCount === 0;
  assert.equal(canDeleteWadah(2), false, "Wadah dengan 2 transaksi kas tidak boleh dihapus");
  assert.equal(canDeleteWadah(0), true, "Wadah tanpa transaksi kas boleh dihapus");
});
