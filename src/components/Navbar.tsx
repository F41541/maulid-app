"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CheckSquare,
  Calculator,
  Wallet,
  LogOut,
  UserCheck,
  UserCog,
  Menu,
  X,
  ChevronDown,
  User,
} from "lucide-react";
import {
  isSidebarRole,
  isKetuaRole,
  isWakilRole,
  getNavRoutes,
  getCachedUser,
  setCachedUser,
  clearCachedUser,
  ROLE_LABELS,
} from "@/lib/role-utils";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface UserSessionState {
  id: string;
  username: string;
  nama: string;
  role: string;
  seksi_id?: string | null;
  nama_seksi?: string | null;
  jabatan?: string | null;
}

export interface NavbarProps {
  userName?: string | null;
  userRole?: string | null;
  userJabatan?: string | null;
  children?: React.ReactNode;
}

const ALL_NAV_CONFIG: Record<
  string,
  { label: string; shortLabel: string; icon: typeof LayoutDashboard }
> = {
  "/dashboard": { label: "Dashboard", shortLabel: "Beranda", icon: LayoutDashboard },
  "/struktur": { label: "Struktur Organisasi", shortLabel: "Struktur", icon: Users },
  "/rundown": { label: "Rundown Acara", shortLabel: "Rundown", icon: CalendarCheck },
  "/tugas": { label: "Tugas per Seksi", shortLabel: "Tugas", icon: CheckSquare },
  "/rab": { label: "RAB (Anggaran)", shortLabel: "RAB", icon: Calculator },
  "/keuangan": { label: "Keuangan Kas", shortLabel: "Keuangan", icon: Wallet },
  "/tamu": { label: "Tamu Undangan", shortLabel: "Tamu", icon: UserCheck },
  "/pengguna": { label: "Kelola Akun", shortLabel: "Akun", icon: UserCog },
};

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/struktur": "Struktur Organisasi",
  "/rundown": "Rundown Acara",
  "/tugas": "Tugas per Seksi",
  "/rab": "Rencana Anggaran Biaya (RAB)",
  "/keuangan": "Keuangan Kas",
  "/tamu": "Tamu Undangan",
  "/pengguna": "Kelola Akun",
};

// Module-level in-memory cache to prevent layout flicker across client route transitions
let isHydrated = false;
let memoryUser: UserSessionState | null = null;

export default function Navbar({
  userName,
  userRole,
  userJabatan,
  children,
}: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Initialize from memory cache only after initial hydration to prevent SSR mismatch
  const [currentUser, setCurrentUser] = useState<UserSessionState | null>(() => {
    if (!isHydrated) return null;
    return memoryUser;
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);

  useEffect(() => {
    isHydrated = true;
    const cached = memoryUser || getCachedUser();
    if (cached) {
      memoryUser = cached;
      setCurrentUser((prev) => prev || cached);
    }

    fetch("/api/auth")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        if (data?.user) {
          memoryUser = data.user;
          setCurrentUser(data.user);
          setCachedUser(data.user);
        } else {
          memoryUser = null;
          clearCachedUser();
          setCurrentUser(null);
          if (pathname !== "/" && pathname !== "/login") {
            router.push("/login");
          }
        }
      })
      .catch(() => {
        if (!memoryUser && !getCachedUser() && pathname !== "/" && pathname !== "/login") {
          router.push("/login");
        }
      });
  }, []);

  // Close mobile drawer on Escape key press
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  // Close profile sheet on Escape key press
  useEffect(() => {
    if (!profileSheetOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProfileSheetOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [profileSheetOpen]);

  const handleLogout = async () => {
    memoryUser = null;
    clearCachedUser();
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.push("/login");
    router.refresh();
  };

  const effectiveRole = userRole || currentUser?.role || "";
  const effectiveJabatan = userJabatan || currentUser?.jabatan || "";
  const effectiveName = userName || currentUser?.nama || (currentUser ? "Pengurus" : "");

  // Match current page title
  const matchedRoute = Object.keys(PAGE_TITLES).find(
    (route) => pathname === route || (route !== "/dashboard" && pathname.startsWith(route + "/"))
  );
  const currentPageTitle = matchedRoute ? PAGE_TITLES[matchedRoute] : "Dashboard";

  // Sidebar rule: Ketua Panitia & Wakil Panitia -> Sidebar; otherwise -> Bottom Bar
  const showSidebar = isSidebarRole(effectiveRole, effectiveJabatan);

  // Dynamic navigation items based on role
  const routes = getNavRoutes(effectiveRole, effectiveJabatan);
  const isSekretarisOrBendahara =
    effectiveRole === "sekretaris" ||
    effectiveRole === "bendahara" ||
    effectiveJabatan.toLowerCase().includes("sekretaris") ||
    effectiveJabatan.toLowerCase().includes("bendahara");
  const isKoordinator =
    effectiveRole === "koordinator_seksi" ||
    effectiveJabatan.toLowerCase().includes("koordinator");

  const navItems = routes.map((href) => {
    const config = ALL_NAV_CONFIG[href] || {
      label: href,
      shortLabel: href,
      icon: LayoutDashboard,
    };
    let label = config.label;
    if (href === "/tugas") {
      if (isSekretarisOrBendahara) label = "Tugas Saya";
      else if (isKoordinator) label = "Tugas Seksi";
      else if (!showSidebar) label = "Tugas";
    }
    return {
      href,
      label,
      shortLabel: config.shortLabel,
      icon: config.icon,
    };
  });

  const isLinkActive = (href: string) => {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
  };

  const baseRoleLabel =
    effectiveJabatan ||
    ROLE_LABELS[effectiveRole] ||
    (showSidebar
      ? isWakilRole(effectiveRole, effectiveJabatan)
        ? "Wakil Ketua"
        : "Ketua Panitia"
      : effectiveRole
      ? "Pengurus"
      : "");

  let divisiTambahan = currentUser?.nama_seksi || "";
  const normRole = (effectiveRole || "").toLowerCase();
  const normJab = (effectiveJabatan || "").toLowerCase();

  if (!divisiTambahan) {
    if (normRole === "pelindung" || normJab.includes("pelindung")) {
      divisiTambahan = "Dewan Pelindung";
    } else if (normRole === "penasihat" || normJab.includes("penasihat")) {
      divisiTambahan = "Dewan Penasihat";
    } else if (normRole === "sekretaris" || normJab.includes("sekretaris")) {
      divisiTambahan = "Sekretariat";
    } else if (normRole === "bendahara" || normJab.includes("bendahara")) {
      divisiTambahan = "Keuangan";
    }
  }

  const renderedRoleLabel =
    divisiTambahan && !baseRoleLabel.toLowerCase().includes(divisiTambahan.toLowerCase())
      ? `${baseRoleLabel} — ${divisiTambahan}`
      : baseRoleLabel;

  // MODE 1: SIDEBAR NAVIGATION (Ketua & Wakil Panitia)
  if (showSidebar) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
        {/* Desktop Fixed Sidebar */}
        <aside
          aria-label="Sidebar Panitia"
          className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-30 no-print transition-colors"
        >
          {/* Brand Header */}
          <div className="h-16 flex items-center px-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                ﷺ
              </div>
              <div>
                <span className="font-bold text-slate-800 dark:text-white text-sm leading-tight block">
                  Panitia Maulid
                </span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium leading-none block mt-0.5">
                  1448 H / 2026 M
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav aria-label="Navigasi Sidebar" className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Navigasi
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isLinkActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ease-out active:scale-[0.98] ${
                    active
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      active
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom User Card & Logout */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 shrink-0">
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
              <div className="min-w-0 flex-1">
                <span
                  className="block text-xs font-semibold text-slate-800 dark:text-slate-100 truncate"
                  title={effectiveName}
                >
                  {effectiveName}
                </span>
                <span className="inline-block px-1.5 py-0.5 mt-0.5 rounded-md text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 truncate">
                  {renderedRoleLabel}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="min-w-[44px] min-h-[44px] p-2.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-all duration-150 ease-[var(--spring-snappy)] active:scale-95 shrink-0 inline-flex items-center justify-center focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-500 focus-visible:outline-none cursor-pointer"
                title="Keluar dari akun"
                aria-label="Keluar dari akun"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Drawer (Backdrop + Slide-over Panel) */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs transition-opacity md:hidden animate-kinetic-backdrop no-print print:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}
        <aside
          id="mobile-nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Menu Navigasi Mobile"
          className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 shadow-2xl flex flex-col transition-transform duration-200 ease-[var(--spring-natural)] md:hidden border-r border-slate-200 dark:border-slate-800 no-print print:hidden ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="h-14 flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                ﷺ
              </div>
              <div>
                <span className="font-bold text-slate-800 dark:text-white text-sm leading-tight block">
                  Panitia Maulid
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">1448 H / 2026 M</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="min-w-[44px] min-h-[44px] p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center"
              aria-label="Tutup menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav aria-label="Navigasi Mobile" className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Navigasi
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isLinkActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ease-out active:scale-[0.98] ${
                    active
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      active
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {effectiveName}
                </span>
                <span className="inline-block px-1.5 py-0.5 mt-0.5 rounded-md text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 truncate">
                  {renderedRoleLabel}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="min-w-[44px] min-h-[44px] p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-all duration-150 ease-[var(--spring-snappy)] active:scale-95 shrink-0 inline-flex items-center justify-center focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-500 focus-visible:outline-none cursor-pointer"
                title="Keluar dari akun"
                aria-label="Keluar dari akun"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Content Area with Desktop Sidebar Left Margin */}
        {children ? (
          <div className="md:pl-64 flex-1 flex flex-col min-w-0 w-full max-w-full overflow-x-clip print:pl-0">
            {/* Top Header untuk Ketua & Wakil Ketua (seluruh halaman) */}
            <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between no-print transition-colors">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="md:hidden min-w-[40px] min-h-[40px] p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition inline-flex items-center justify-center focus-visible:ring-2 focus-visible:ring-emerald-500"
                  aria-label="Buka menu navigasi"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  {currentPageTitle}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle size="md" />
              </div>
            </header>

            <main className="flex-1 min-w-0 w-full overflow-x-hidden">
              {children}
            </main>
          </div>
        ) : null}
      </div>
    );
  }

  // MODE 2: BOTTOM BAR NAVIGATION (Semua role lainnya: Sekretaris, Bendahara, Seksi, Anggota, dll.)
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Top Header untuk Pengguna Selain Admin / Ketua */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 no-print transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Current Page Title (Rata Kiri Minimalis) */}
          <h1 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg tracking-tight">
            {currentPageTitle}
          </h1>

          {/* Right: Theme Toggle */}
          <div className="flex items-center gap-2">
            <ThemeToggle size="md" />
          </div>
        </div>
      </header>

      {/* Content Area with Bottom Padding to prevent Bottom Bar overlap */}
      {children ? (
        <div className="pb-24 sm:pb-28 flex-1 flex flex-col min-w-0 w-full max-w-full overflow-x-hidden print:pb-0">
          {children}
        </div>
      ) : null}

      {/* Fixed Bottom Bar Navigation */}
      <nav
        aria-label="Navigasi Bawah"
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-lg no-print [padding-bottom:max(0.5rem,env(safe-area-inset-bottom))] transition-colors"
      >
        <div className="max-w-md sm:max-w-lg mx-auto px-3 py-1.5 flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isLinkActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`min-w-[56px] min-h-[48px] py-1 px-2.5 rounded-xl transition-all duration-150 ease-out active:scale-95 flex flex-col items-center justify-center focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  active
                    ? "text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50/80 dark:bg-emerald-950/60 shadow-2xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className={`w-5 h-5 mb-0.5 ${
                    active
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                />
                <span className="text-[11px] leading-tight truncate">
                  {item.shortLabel || item.label.split(" ")[0]}
                </span>
              </Link>
            );
          })}

          {/* Tab Akun di Paling Kanan */}
          <button
            type="button"
            onClick={() => setProfileSheetOpen(true)}
            aria-expanded={profileSheetOpen}
            aria-haspopup="dialog"
            aria-label="Profil Akun"
            className={`min-w-[56px] min-h-[48px] py-1 px-2.5 rounded-xl transition-all duration-150 ease-out active:scale-95 flex flex-col items-center justify-center focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer ${
              profileSheetOpen
                ? "text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50/80 dark:bg-emerald-950/60 shadow-2xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
            }`}
          >
            <User
              className={`w-5 h-5 mb-0.5 ${
                profileSheetOpen
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-slate-400 dark:text-slate-500"
              }`}
            />
            <span className="text-[11px] leading-tight truncate">Akun</span>
          </button>
        </div>
      </nav>

      {/* Bottom Sheet Profil Akun */}
      {profileSheetOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-kinetic-backdrop no-print"
          onClick={() => setProfileSheetOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Profil Pengguna"
        className={`fixed inset-x-0 bottom-0 z-50 max-w-lg mx-auto bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl border-t border-slate-200 dark:border-slate-800 transition-transform duration-250 ease-[var(--spring-natural)] no-print ${
          profileSheetOpen ? "translate-y-0" : "translate-y-full pointer-events-none"
        }`}
      >
        {/* Drag handle pill */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Profil Pengguna</h2>
            <button
              type="button"
              onClick={() => setProfileSheetOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
              {effectiveName ? effectiveName.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-slate-900 dark:text-white truncate">
                {effectiveName}
              </span>
              {currentUser?.username && (
                <span className="text-xs text-slate-500 dark:text-slate-400 block truncate mt-0.5">
                  @{currentUser.username}
                </span>
              )}
              <span className="inline-block px-2 py-0.5 mt-1.5 rounded-md text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {renderedRoleLabel}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setProfileSheetOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200/80 dark:border-rose-900/50 transition active:scale-[0.98] cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar dari Akun</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
