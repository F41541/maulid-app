import test from "node:test";
import assert from "node:assert/strict";
import { formatRupiah, formatTanggal, getTodayString } from "../src/lib/format.ts";
import { cn } from "../src/lib/utils.ts";

test("Format Helpers - formatRupiah", () => {
  assert.equal(formatRupiah(0), "Rp\u00A00");
  assert.equal(formatRupiah(1500000), "Rp\u00A01.500.000");
  assert.equal(formatRupiah("2500000"), "Rp\u00A02.500.000");
  assert.equal(formatRupiah(null), "Rp\u00A00");
  assert.equal(formatRupiah(undefined), "Rp\u00A00");
  assert.equal(formatRupiah("invalid"), "Rp\u00A00");
  assert.equal(formatRupiah(-50000), "-Rp\u00A050.000");
  assert.equal(formatRupiah(1234.56), "Rp\u00A01.235");
});

test("Format Helpers - formatTanggal", () => {
  assert.equal(formatTanggal(null), "-");
  assert.equal(formatTanggal(""), "-");
  const formatted = formatTanggal("2026-09-16");
  assert.match(formatted, /16.*2026/);
  // Full ISO string format
  const isoFormatted = formatTanggal("2026-09-16T08:00:00.000Z");
  assert.match(isoFormatted, /16.*2026/);
  // Leap year date
  const leapFormatted = formatTanggal("2024-02-29");
  assert.match(leapFormatted, /29.*2024/);
  // Custom non-ISO string should return safely
  assert.equal(formatTanggal("Hari H"), "Hari H");
  assert.equal(formatTanggal("Sabtu Pagi"), "Sabtu Pagi");
});

test("Format Helpers - getTodayString", () => {
  const today = getTodayString();
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
});

test("Classnames Helper - cn", () => {
  assert.equal(cn("px-4 py-2", "px-6"), "py-2 px-6");
  assert.equal(cn("text-red-500", false && "hidden", "font-bold"), "text-red-500 font-bold");
  assert.equal(cn("bg-white", undefined, null), "bg-white");
  // Tailwind conflicts correctly resolved
  assert.equal(cn("p-4", "p-2"), "p-2");
  assert.equal(cn("text-red-500", "text-emerald-600"), "text-emerald-600");
  assert.equal(cn("block", "hidden", "flex"), "flex");
});

test("Export Excel Helper - XLSX Workbook and Sheet generation", async () => {
  const XLSX = await import("xlsx");

  const sampleData = [
    ["No", "ID", "Tipe", "Nominal"],
    [1, "tx-1", "Kas Masuk", 500000],
    [2, "tx-2", "Kas Keluar", 150000],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sampleData);
  assert.ok(ws, "Worksheet should be created successfully");
  assert.equal(ws["A1"].v, "No");
  assert.equal(ws["D2"].v, 500000);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Laporan Kas");
  assert.equal(wb.SheetNames.length, 1);
  assert.equal(wb.SheetNames[0], "Laporan Kas");
});
