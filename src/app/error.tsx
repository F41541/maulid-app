"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error securely
    console.error("Global Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center mb-5 ring-8 ring-rose-50/50 dark:ring-rose-900/20">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Terjadi Kendala Teknis
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
          Sistem mendeteksi adanya gangguan saat memproses data. Anda dapat mencoba memuat ulang halaman ini tanpa kehilangan data sesi Anda.
        </p>

        {error.digest && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-3 bg-slate-100 dark:bg-slate-700/50 py-1 px-2 rounded-md inline-block">
            Kode Diagnostik: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-7">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-semibold rounded-xl shadow-sm transition inline-flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500"
          >
            <RefreshCw className="w-4 h-4" />
            Coba Muat Ulang
          </button>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-[0.98] text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition inline-flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400"
          >
            <Home className="w-4 h-4" />
            Ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
