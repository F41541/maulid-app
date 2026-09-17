"use client";

import React, { useRef, useEffect, useState, useId } from "react";
import { Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTanggalLengkap } from "@/lib/format";

export interface DateInputProps {
  value?: string; // Format ISO: "YYYY-MM-DD"
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  id?: string;
  name?: string;
  min?: string;
  max?: string;
}

function getDaysInMonth(year: number, month: number): number {
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return 31;
  return new Date(year, month, 0).getDate();
}

function isValidIsoDate(str: string): boolean {
  if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const [y, m, d] = str.split("-").map((n) => parseInt(n, 10));
  if (m < 1 || m > 12) return false;
  const maxDay = getDaysInMonth(y, m);
  return d >= 1 && d <= maxDay;
}

export function DateInput({
  value = "",
  onChange,
  required = false,
  disabled = false,
  error = false,
  className,
  id,
  min,
  max,
}: DateInputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;

  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);

  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  // Track values synchronously in refs to prevent stale closure in blur events
  const dayValRef = useRef("");
  const monthValRef = useRef("");
  const yearValRef = useRef("");

  const selectBox = (input: HTMLInputElement | null) => {
    if (!input) return;
    try {
      input.select();
      input.setSelectionRange(0, input.value.length);
    } catch {}
  };

  // Sync internal state from value prop
  useEffect(() => {
    if (!value) {
      dayValRef.current = "";
      monthValRef.current = "";
      yearValRef.current = "";
      setDay("");
      setMonth("");
      setYear("");
      return;
    }

    const parts = value.split("-");
    if (parts.length === 3) {
      const [y, m, d] = parts;
      setYear((prev) => {
        const next = prev !== y ? y : prev;
        yearValRef.current = next;
        return next;
      });
      setMonth((prev) => {
        const next = prev.length === 1 && m === prev.padStart(2, "0") ? prev : (prev !== m ? m : prev);
        monthValRef.current = next;
        return next;
      });
      setDay((prev) => {
        const next = prev.length === 1 && d === prev.padStart(2, "0") ? prev : (prev !== d ? d : prev);
        dayValRef.current = next;
        return next;
      });
    }
  }, [value]);

  const emitDateIfValid = (d: string, m: string, y: string) => {
    if (!d && !m && !y) {
      onChange("");
      return;
    }

    // Only emit when year has 4 digits, month exactly 2 digits, and day exactly 2 digits
    if (y.length === 4 && m.length === 2 && d.length === 2) {
      const numY = parseInt(y, 10);
      const numM = parseInt(m, 10);
      const numD = parseInt(d, 10);

      if (numM >= 1 && numM <= 12) {
        const maxD = getDaysInMonth(numY, numM);
        const validD = Math.min(Math.max(numD, 1), maxD);
        const paddedM = String(numM).padStart(2, "0");
        const paddedD = String(validD).padStart(2, "0");
        const iso = `${y}-${paddedM}-${paddedD}`;
        onChange(iso);
      }
    }
  };

  const handleOnlyNumbers = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      ["Backspace", "Tab", "ArrowLeft", "ArrowRight", "Delete", "Enter"].includes(e.key) ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
    let num = parseInt(raw, 10);
    let val = raw;
    if (!isNaN(num) && num > 31) {
      val = "31";
      num = 31;
    }

    // Auto-pad single digit 4-9 immediately to 04-09
    if (val.length === 1 && num >= 4 && num <= 9) {
      val = `0${num}`;
    }

    dayValRef.current = val;
    setDay(val);

    // Auto-advance to month only when 2 digits entered
    if (val.length === 2) {
      emitDateIfValid(val, monthValRef.current, yearValRef.current);
      monthRef.current?.focus();
      selectBox(monthRef.current);
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
    let num = parseInt(raw, 10);
    let val = raw;
    if (!isNaN(num) && num > 12) {
      val = "12";
      num = 12;
    }

    // Auto-pad single digit 2-9 immediately to 02-09
    if (val.length === 1 && num >= 2 && num <= 9) {
      val = `0${num}`;
    }

    monthValRef.current = val;
    setMonth(val);

    // Auto-advance to year when 2 digits entered
    if (val.length === 2) {
      emitDateIfValid(dayValRef.current, val, yearValRef.current);
      yearRef.current?.focus();
      selectBox(yearRef.current);
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    yearValRef.current = raw;
    setYear(raw);
    if (raw.length === 4) {
      emitDateIfValid(dayValRef.current, monthValRef.current, raw);
    }
  };

  const handleDayKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    handleOnlyNumbers(e);
    if (/^\d$/.test(e.key)) {
      const input = e.currentTarget;
      if (input.selectionStart === input.selectionEnd && input.value.length >= 2) {
        input.value = "";
      }
    }
    if (e.key === "ArrowRight" || e.key === "/" || e.key === "-") {
      e.preventDefault();
      monthRef.current?.focus();
      selectBox(monthRef.current);
    }
  };

  const handleMonthKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    handleOnlyNumbers(e);
    if (/^\d$/.test(e.key)) {
      const input = e.currentTarget;
      if (input.selectionStart === input.selectionEnd && input.value.length >= 2) {
        input.value = "";
      }
    }
    if ((e.key === "Backspace" && month === "") || e.key === "ArrowLeft") {
      e.preventDefault();
      dayRef.current?.focus();
      selectBox(dayRef.current);
    } else if (e.key === "ArrowRight" || e.key === "/" || e.key === "-") {
      e.preventDefault();
      yearRef.current?.focus();
      selectBox(yearRef.current);
    }
  };

  const handleYearKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    handleOnlyNumbers(e);
    if (/^\d$/.test(e.key)) {
      const input = e.currentTarget;
      if (input.selectionStart === input.selectionEnd && input.value.length >= 4) {
        input.value = "";
      }
    }
    if ((e.key === "Backspace" && year === "") || e.key === "ArrowLeft") {
      e.preventDefault();
      monthRef.current?.focus();
      selectBox(monthRef.current);
    }
  };

  const handleDayBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const currentVal = dayValRef.current || e.target.value.replace(/\D/g, "").slice(0, 2);
    if (currentVal.length === 1 && currentVal !== "") {
      const padded = currentVal.padStart(2, "0");
      dayValRef.current = padded;
      setDay(padded);
      emitDateIfValid(padded, monthValRef.current, yearValRef.current);
    }
  };

  const handleMonthBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const currentVal = monthValRef.current || e.target.value.replace(/\D/g, "").slice(0, 2);
    if (currentVal.length === 1 && currentVal !== "") {
      const padded = currentVal.padStart(2, "0");
      monthValRef.current = padded;
      setMonth(padded);
      emitDateIfValid(dayValRef.current, padded, yearValRef.current);
    }
  };

  const handleYearBlur = () => {
    if (yearValRef.current.length === 4) {
      emitDateIfValid(dayValRef.current, monthValRef.current, yearValRef.current);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").trim();
    // Support formats: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY
    let d = "";
    let m = "";
    let y = "";

    if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(text)) {
      const parts = text.split(/[-/.]/);
      y = parts[0];
      m = parts[1].padStart(2, "0");
      d = parts[2].padStart(2, "0");
    } else if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$/.test(text)) {
      const parts = text.split(/[-/.]/);
      d = parts[0].padStart(2, "0");
      m = parts[1].padStart(2, "0");
      y = parts[2];
    }

    if (d && m && y) {
      e.preventDefault();
      setDay(d);
      setMonth(m);
      setYear(y);
      emitDateIfValid(d, m, y);
    }
  };

  const handleNativePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedIso = e.target.value;
    if (selectedIso) {
      const parts = selectedIso.split("-");
      if (parts.length === 3) {
        yearValRef.current = parts[0];
        monthValRef.current = parts[1];
        dayValRef.current = parts[2];
        setYear(parts[0]);
        setMonth(parts[1]);
        setDay(parts[2]);
        onChange(selectedIso);
      }
    }
  };

  const triggerNativePicker = () => {
    if (disabled) return;
    try {
      if (pickerRef.current && "showPicker" in HTMLInputElement.prototype) {
        pickerRef.current.showPicker();
      } else {
        pickerRef.current?.focus();
        pickerRef.current?.click();
      }
    } catch {
      pickerRef.current?.focus();
      pickerRef.current?.click();
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    dayValRef.current = "";
    monthValRef.current = "";
    yearValRef.current = "";
    setDay("");
    setMonth("");
    setYear("");
    onChange("");
    dayRef.current?.focus();
    selectBox(dayRef.current);
  };

  const hasValidDate = isValidIsoDate(value);

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      <div
        onPaste={handlePaste}
        className={cn(
          "relative flex items-center justify-between min-h-[44px] px-3 py-1.5 border rounded-xl transition-all duration-150",
          "bg-white dark:bg-slate-900",
          error
            ? "border-rose-300 dark:border-rose-700 focus-within:ring-2 focus-within:ring-rose-500"
            : "border-slate-300 dark:border-slate-700 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500",
          disabled && "opacity-50 bg-slate-100 dark:bg-slate-800 cursor-not-allowed"
        )}
      >
        {/* Segmented Inputs: Hari / Bulan / Tahun */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-sm font-medium">
          {/* Hari (DD) */}
          <div className="flex flex-col items-center">
            <input
              ref={dayRef}
              id={`${inputId}-day`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              placeholder="HH"
              value={day}
              disabled={disabled}
              onFocus={(e) => {
                e.currentTarget.select();
                selectBox(e.currentTarget);
                requestAnimationFrame(() => selectBox(e.currentTarget));
              }}
              onClick={(e) => selectBox(e.currentTarget)}
              onMouseUp={(e) => {
                selectBox(e.currentTarget);
                e.preventDefault();
              }}
              onChange={handleDayChange}
              onKeyDown={handleDayKeyDown}
              onBlur={handleDayBlur}
              className={cn(
                "w-11 sm:w-12 h-10 text-center font-mono font-bold text-sm sm:text-base rounded-xl transition-all shadow-2xs focus:outline-none",
                "border bg-slate-50 dark:bg-slate-800/90 text-slate-900 dark:text-white caret-transparent selection:bg-emerald-500 selection:text-white",
                error
                  ? "border-rose-300 dark:border-rose-700 focus:ring-2 focus:ring-rose-500"
                  : "border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-emerald-50/40 dark:focus:bg-emerald-950/40"
              )}
              aria-label="Hari / Tanggal (01-31)"
            />
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 select-none mt-1">
              Hari
            </span>
          </div>

          <span className="text-slate-300 dark:text-slate-600 font-bold select-none text-base sm:text-lg mb-4">/</span>

          {/* Bulan (MM) */}
          <div className="flex flex-col items-center">
            <input
              ref={monthRef}
              id={`${inputId}-month`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              placeholder="BB"
              value={month}
              disabled={disabled}
              onFocus={(e) => {
                e.currentTarget.select();
                selectBox(e.currentTarget);
                requestAnimationFrame(() => selectBox(e.currentTarget));
              }}
              onClick={(e) => selectBox(e.currentTarget)}
              onMouseUp={(e) => {
                selectBox(e.currentTarget);
                e.preventDefault();
              }}
              onChange={handleMonthChange}
              onKeyDown={handleMonthKeyDown}
              onBlur={handleMonthBlur}
              className={cn(
                "w-11 sm:w-12 h-10 text-center font-mono font-bold text-sm sm:text-base rounded-xl transition-all shadow-2xs focus:outline-none",
                "border bg-slate-50 dark:bg-slate-800/90 text-slate-900 dark:text-white caret-transparent selection:bg-emerald-500 selection:text-white",
                error
                  ? "border-rose-300 dark:border-rose-700 focus:ring-2 focus:ring-rose-500"
                  : "border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-emerald-50/40 dark:focus:bg-emerald-950/40"
              )}
              aria-label="Bulan (01-12)"
            />
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 select-none mt-1">
              Bulan
            </span>
          </div>

          <span className="text-slate-300 dark:text-slate-600 font-bold select-none text-base sm:text-lg mb-4">/</span>

          {/* Tahun (YYYY) */}
          <div className="flex flex-col items-center">
            <input
              ref={yearRef}
              id={`${inputId}-year`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              placeholder="TTTT"
              value={year}
              disabled={disabled}
              onFocus={(e) => {
                e.currentTarget.select();
                selectBox(e.currentTarget);
                requestAnimationFrame(() => selectBox(e.currentTarget));
              }}
              onClick={(e) => selectBox(e.currentTarget)}
              onMouseUp={(e) => {
                selectBox(e.currentTarget);
                e.preventDefault();
              }}
              onChange={handleYearChange}
              onKeyDown={handleYearKeyDown}
              onBlur={handleYearBlur}
              className={cn(
                "w-16 sm:w-18 h-10 text-center font-mono font-bold text-sm sm:text-base rounded-xl transition-all shadow-2xs focus:outline-none",
                "border bg-slate-50 dark:bg-slate-800/90 text-slate-900 dark:text-white caret-transparent selection:bg-emerald-500 selection:text-white",
                error
                  ? "border-rose-300 dark:border-rose-700 focus:ring-2 focus:ring-rose-500"
                  : "border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-emerald-50/40 dark:focus:bg-emerald-950/40"
              )}
              aria-label="Tahun (YYYY)"
            />
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 select-none mt-1">
              Tahun
            </span>
          </div>
        </div>

        {/* Right controls: Clear button & Native Picker trigger */}
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {!required && value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              title="Hapus tanggal"
              className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Calendar Picker button */}
          <div className="relative">
            <button
              type="button"
              disabled={disabled}
              onClick={triggerNativePicker}
              title="Pilih dari Kalender"
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 border border-emerald-200 dark:border-emerald-800 transition shadow-2xs"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kalender</span>
            </button>

            {/* Native date input for picker & browser interaction */}
            <input
              ref={pickerRef}
              type="date"
              tabIndex={-1}
              disabled={disabled}
              value={hasValidDate ? value : ""}
              onChange={handleNativePickerChange}
              min={min}
              max={max}
              className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Hidden validation input for native form submission checking */}
        <input
          type="text"
          tabIndex={-1}
          required={required}
          value={value || ""}
          onChange={() => {}}
          className="sr-only"
          aria-hidden="true"
        />
      </div>

      {/* Live Indonesian Date Confirmation: Hari, Tanggal Bulan Tahun */}
      {hasValidDate && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 px-1 pt-0.5 animate-in fade-in duration-150">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 inline-block" />
          <span>{formatTanggalLengkap(value)}</span>
        </p>
      )}
    </div>
  );
}
