"use client";

import React, { useRef, useEffect, useState } from "react";

interface TimeColonInputProps {
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
}

export function TimeColonInput({ value, onChange }: TimeColonInputProps) {
  const startHourRef = useRef<HTMLInputElement>(null);
  const startMinuteRef = useRef<HTMLInputElement>(null);
  const endHourRef = useRef<HTMLInputElement>(null);
  const endMinuteRef = useRef<HTMLInputElement>(null);

  const [startH, setStartH] = useState("");
  const [startM, setStartM] = useState("");
  const [endH, setEndH] = useState("");
  const [endM, setEndM] = useState("");

  const selectBox = (input: HTMLInputElement | null) => {
    if (!input) return;
    try {
      input.select();
      input.setSelectionRange(0, input.value.length);
    } catch {}
  };

  // Sync state from value prop
  useEffect(() => {
    if (!value) {
      setStartH("");
      setStartM("");
      setEndH("");
      setEndM("");
      return;
    }

    const parts = value.split("-").map((p) => p.trim());
    const startPart = parts[0] || "";
    const endPart = parts[1] || "";

    const [sh = "", sm = ""] = startPart.split(":").map((s) => s.trim().replace(/\D/g, "").slice(0, 2));
    const [eh = "", em = ""] = endPart.split(":").map((s) => s.trim().replace(/\D/g, "").slice(0, 2));

    setStartH((prev) => (prev.length === 1 && sh === prev.padStart(2, "0") ? prev : sh));
    setStartM((prev) => (prev.length === 1 && sm === prev.padStart(2, "0") ? prev : sm));
    setEndH((prev) => (prev.length === 1 && eh === prev.padStart(2, "0") ? prev : eh));
    setEndM((prev) => (prev.length === 1 && em === prev.padStart(2, "0") ? prev : em));
  }, [value]);

  const emitChange = (sh: string, sm: string, eh: string, em: string) => {
    if (sh.length === 2 && sm.length === 2) {
      let result = `${sh}:${sm}`;
      if (eh.length === 2 && em.length === 2) {
        result += ` - ${eh}:${em}`;
      }
      onChange(result);
    }
  };

  const handleOnlyNumbers = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow navigation, deletion, tab
    if (
      ["Backspace", "Tab", "ArrowLeft", "ArrowRight", "Delete"].includes(e.key) ||
      (e.ctrlKey || e.metaKey)
    ) {
      return;
    }
    if (/^\d$/.test(e.key)) {
      const input = e.currentTarget;
      if (input.selectionStart === input.selectionEnd && input.value.length >= 2) {
        input.value = "";
      }
      return;
    }
    e.preventDefault();
  };

  const handleMinuteKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    prevRef: React.RefObject<HTMLInputElement | null>,
    currentVal: string
  ) => {
    handleOnlyNumbers(e);
    if (e.key === "Backspace" && currentVal === "") {
      prevRef.current?.focus();
    }
  };

  const handleStartHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
    let num = parseInt(raw, 10);
    let val = raw;
    if (!isNaN(num) && num > 23) {
      val = "23";
    }
    setStartH(val);
    emitChange(val, startM, endH, endM);

    // Auto-jump to minute when 2 digits entered
    if (val.length === 2) {
      startMinuteRef.current?.focus();
      startMinuteRef.current?.select();
    }
  };

  const handleStartMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
    let num = parseInt(raw, 10);
    let val = raw;
    if (!isNaN(num) && num > 59) {
      val = "59";
    }
    setStartM(val);
    emitChange(startH, val, endH, endM);

    // If 2 digits entered, optional auto-jump to end hour
    if (val.length === 2 && endHourRef.current) {
      endHourRef.current.focus();
      endHourRef.current.select();
    }
  };

  const handleEndHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
    let num = parseInt(raw, 10);
    let val = raw;
    if (!isNaN(num) && num > 23) {
      val = "23";
    }
    setEndH(val);
    emitChange(startH, startM, val, endM);

    if (val.length === 2) {
      endMinuteRef.current?.focus();
      endMinuteRef.current?.select();
    }
  };

  const handleEndMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
    let num = parseInt(raw, 10);
    let val = raw;
    if (!isNaN(num) && num > 59) {
      val = "59";
    }
    setEndM(val);
    emitChange(startH, startM, endH, val);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {/* Jam Mulai */}
      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition shadow-2xs">
        <input
          ref={startHourRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          placeholder="00"
          value={startH}
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
          onChange={handleStartHourChange}
          onKeyDown={handleOnlyNumbers}
          className="w-8 text-center text-sm font-mono font-bold bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 caret-transparent selection:bg-emerald-500 selection:text-white focus:outline-none"
          aria-label="Jam Mulai"
        />
        <span className="font-bold text-slate-400 dark:text-slate-500 text-sm select-none">:</span>
        <input
          ref={startMinuteRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          placeholder="00"
          value={startM}
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
          onChange={handleStartMinuteChange}
          onKeyDown={(e) => handleMinuteKeyDown(e, startHourRef, startM)}
          className="w-8 text-center text-sm font-mono font-bold bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 caret-transparent selection:bg-emerald-500 selection:text-white focus:outline-none"
          aria-label="Menit Mulai"
        />
        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1 py-0.5 rounded select-none ml-1">WIB</span>
      </div>

      <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold px-0.5">s/d</span>

      {/* Jam Selesai */}
      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition shadow-2xs">
        <input
          ref={endHourRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          placeholder="00"
          value={endH}
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
          onChange={handleEndHourChange}
          onKeyDown={handleOnlyNumbers}
          className="w-8 text-center text-sm font-mono font-bold bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 caret-transparent selection:bg-emerald-500 selection:text-white focus:outline-none"
          aria-label="Jam Selesai (Opsional)"
        />
        <span className="font-bold text-slate-400 dark:text-slate-500 text-sm select-none">:</span>
        <input
          ref={endMinuteRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          placeholder="00"
          value={endM}
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
          onChange={handleEndMinuteChange}
          onKeyDown={(e) => handleMinuteKeyDown(e, endHourRef, endM)}
          className="w-8 text-center text-sm font-mono font-bold bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 caret-transparent selection:bg-emerald-500 selection:text-white focus:outline-none"
          aria-label="Menit Selesai (Opsional)"
        />
        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1 py-0.5 rounded select-none ml-1">WIB</span>
      </div>
    </div>
  );
}
