"use client";

import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      className={cn(
        "fixed top-3 inset-x-4 max-w-md mx-auto z-50 py-2.5 px-4 rounded-xl shadow-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200 no-print animate-kinetic-slide-down",
        !isOnline
          ? "bg-amber-600 text-white border-amber-700 shadow-amber-900/20"
          : "bg-emerald-600 text-white border-emerald-700 shadow-emerald-900/20"
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
          <span>Koneksi terputus. Bekerja dalam mode offline.</span>
        </>
      ) : (
        <>
          <Wifi className="w-4 h-4 shrink-0" />
          <span>Koneksi pulih. Anda kembali online.</span>
        </>
      )}
    </div>
  );
}
