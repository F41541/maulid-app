"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CheckSquare,
  Wallet,
  LogOut,
  UserCheck,
} from "lucide-react";

export default function Navbar({ userName }: { userName?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.push("/login");
    router.refresh();
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/struktur", label: "Struktur Organisasi", icon: Users },
    { href: "/rundown", label: "Rundown Acara", icon: CalendarCheck },
    { href: "/tugas", label: "Tugas per Seksi", icon: CheckSquare },
    { href: "/keuangan", label: "Keuangan Kas", icon: Wallet },
    { href: "/tamu", label: "Tamu Undangan", icon: UserCheck },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              ﷺ
            </div>
            <div>
              <span className="font-bold text-slate-800 text-base leading-none block">
                Panitia Maulid Nabi
              </span>
              <span className="text-xs text-emerald-700 font-medium leading-none">
                Tahun 1448 H / 2026 M
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User profile & logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <span className="block text-xs font-semibold text-slate-700">
                {userName || "Admin"}
              </span>
              <span className="block text-[11px] text-slate-400">Admin Utama</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              title="Keluar"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav Bar */}
      <div className="md:hidden border-t border-slate-100 px-2 py-2 flex items-center justify-around bg-slate-50 overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`p-1.5 rounded-lg flex flex-col items-center text-[10px] shrink-0 ${
                isActive ? "text-emerald-700 font-semibold" : "text-slate-500"
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
