import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { formatTanggal, formatTanggalLengkap } from "../src/lib/format.ts";

test("1. Format Helpers - formatTanggalLengkap generates Indonesian Day, Date Month Year", () => {
  assert.equal(formatTanggalLengkap(null), "-");
  assert.equal(formatTanggalLengkap(""), "-");

  // Thursday, 17 September 2026
  const formatted = formatTanggalLengkap("2026-09-17");
  assert.match(formatted, /Kamis/i);
  assert.match(formatted, /17/);
  assert.match(formatted, /September/i);
  assert.match(formatted, /2026/);

  // Wednesday, 16 September 2026
  const formattedWed = formatTanggalLengkap("2026-09-16");
  assert.match(formattedWed, /Rabu/i);
  assert.match(formattedWed, /16/);
  assert.match(formattedWed, /September/i);
  assert.match(formattedWed, /2026/);

  // Leap Year: 29 Februari 2024 (Thursday)
  const leap = formatTanggalLengkap("2024-02-29");
  assert.match(leap, /Kamis/i);
  assert.match(leap, /29/);
  assert.match(leap, /Februari/i);
  assert.match(leap, /2024/);
});

test("2. DateInput Component File Integrity and Structure", () => {
  const compPath = path.resolve(process.cwd(), "src/components/ui/DateInput.tsx");
  assert.ok(fs.existsSync(compPath), "DateInput.tsx must exist");

  const content = fs.readFileSync(compPath, "utf-8");
  // Check Hari, Bulan, Tahun labels
  assert.ok(content.includes("Hari"), "Must have Hari label");
  assert.ok(content.includes("Bulan"), "Must have Bulan label");
  assert.ok(content.includes("Tahun"), "Must have Tahun label");

  // Check placeholders
  assert.ok(content.includes('placeholder="HH"'), "Must have HH placeholder for Hari");
  assert.ok(content.includes('placeholder="BB"'), "Must have BB placeholder for Bulan");
  assert.ok(content.includes('placeholder="TTTT"'), "Must have TTTT placeholder for Tahun");

  // Check calendar picker integration
  assert.ok(content.includes("showPicker"), "Must support native picker triggering");
  assert.ok(content.includes("formatTanggalLengkap"), "Must display live date preview");
});

test("3. All Modals Use DateInput Instead of Native Input type=date", () => {
  const filesToCheck = [
    "src/app/(portal)/keuangan/components/TransaksiModal.tsx",
    "src/app/(portal)/keuangan/components/MutasiModal.tsx",
    "src/app/(portal)/rundown/components/RundownModal.tsx",
    "src/app/(portal)/tugas/components/TugasModal.tsx",
  ];

  for (const relPath of filesToCheck) {
    const fallbackPath = relPath.replace("/(portal)", "");
    const fullPath = fs.existsSync(path.resolve(process.cwd(), relPath))
      ? path.resolve(process.cwd(), relPath)
      : path.resolve(process.cwd(), fallbackPath);
    assert.ok(fs.existsSync(fullPath), `${relPath} must exist`);
    const content = fs.readFileSync(fullPath, "utf-8");

    // Must import DateInput
    assert.ok(
      content.includes('import { DateInput } from "@/components/ui/DateInput"') ||
      content.includes('DateInput'),
      `${relPath} must import DateInput`
    );

    // Must use <DateInput
    assert.ok(content.includes("<DateInput"), `${relPath} must use <DateInput`);

    // Must NOT use type="date"
    assert.ok(
      !content.includes('type="date"'),
      `${relPath} should not use raw type="date" anymore`
    );
  }
});

test("4. DateInput and TimeColonInput Boxed Segment & Cursor-Free Styling", () => {
  const dateInputContent = fs.readFileSync(
    path.resolve(process.cwd(), "src/components/ui/DateInput.tsx"),
    "utf-8"
  );
  assert.ok(
    dateInputContent.includes("caret-transparent"),
    "DateInput must use caret-transparent to remove blinking cursor"
  );
  assert.ok(
    dateInputContent.includes("currentTarget.select()"),
    "DateInput must auto-select block when focused or clicked"
  );

  const timeInputContent = fs.readFileSync(
    path.resolve(process.cwd(), "src/components/ui/TimeColonInput.tsx"),
    "utf-8"
  );
  assert.ok(
    timeInputContent.includes("caret-transparent"),
    "TimeColonInput must use caret-transparent"
  );
  assert.ok(
    timeInputContent.includes("currentTarget.select()"),
    "TimeColonInput must auto-select block when focused or clicked"
  );

  const rundownModalPath = fs.existsSync(path.resolve(process.cwd(), "src/app/(portal)/rundown/components/RundownModal.tsx"))
    ? path.resolve(process.cwd(), "src/app/(portal)/rundown/components/RundownModal.tsx")
    : path.resolve(process.cwd(), "src/app/rundown/components/RundownModal.tsx");
  const rundownModalContent = fs.readFileSync(rundownModalPath, "utf-8");
  assert.ok(
    rundownModalContent.includes("Jadwal Pelaksanaan"),
    "RundownModal must contain dedicated Jadwal Pelaksanaan panel"
  );
});

test("5. DateInput typing logic prevents '11' from prematurely turning into '01'", () => {
  const content = fs.readFileSync(
    path.resolve(process.cwd(), "src/components/ui/DateInput.tsx"),
    "utf-8"
  );

  // Assert emitDateIfValid requires exactly 2 digits for day and month
  assert.match(
    content,
    /y\.length\s*===\s*4\s*&&\s*m\.length\s*===\s*2\s*&&\s*d\.length\s*===\s*2/,
    "emitDateIfValid must require exactly 2 digits for day and month to prevent 1-digit padding"
  );

  // Assert value sync does not overwrite intermediate single-digit input
  assert.match(
    content,
    /prev\.length\s*===\s*1\s*&&\s*d\s*===\s*prev\.padStart\(2,\s*["']0["']\)/,
    "DateInput must prevent incoming value prop from overwriting active 1-digit day input"
  );

  // Assert typing on full box resets to new digit
  assert.match(
    content,
    /input\.selectionStart\s*===\s*input\.selectionEnd\s*&&\s*input\.value\.length\s*>=\s*2/,
    "Typing digit into full box must clear previous digits so 11 replaces old date"
  );
});

test("6. Synchronous Ref Tracking & Blur Protection prevents 11 turning into 01 on Day and Month", () => {
  const content = fs.readFileSync(
    path.resolve(process.cwd(), "src/components/ui/DateInput.tsx"),
    "utf-8"
  );

  // Must have synchronous value refs
  assert.ok(content.includes("dayValRef = useRef"), "Must declare dayValRef");
  assert.ok(content.includes("monthValRef = useRef"), "Must declare monthValRef");
  assert.ok(content.includes("yearValRef = useRef"), "Must declare yearValRef");

  // Separate blur handlers for each segment to prevent stale cross-field closure corruption
  assert.ok(content.includes("handleDayBlur"), "Must have decoupled handleDayBlur");
  assert.ok(content.includes("handleMonthBlur"), "Must have decoupled handleMonthBlur");
  assert.ok(content.includes("handleYearBlur"), "Must have decoupled handleYearBlur");

  // handleDayBlur checks length === 1, preserving 2-digit values like '11'
  assert.match(
    content,
    /currentVal\.length\s*===\s*1\s*&&\s*currentVal\s*!==\s*["']["']/,
    "handleDayBlur must strictly check length === 1 and not pad length 2"
  );

  // Rundown openEdit legacy date sanitization
  const rundownPagePath = fs.existsSync(path.resolve(process.cwd(), "src/app/(portal)/rundown/page.tsx"))
    ? path.resolve(process.cwd(), "src/app/(portal)/rundown/page.tsx")
    : path.resolve(process.cwd(), "src/app/rundown/page.tsx");
  const rundownPage = fs.readFileSync(rundownPagePath, "utf-8");
  assert.match(
    rundownPage,
    /hari:\s*\/.*\\d\{4\}-\\d\{2\}-\\d\{2\}.*\/\.test\(item\.hari/,
    "Rundown openEdit must sanitize legacy non-ISO values such as 'Hari H'"
  );
});
