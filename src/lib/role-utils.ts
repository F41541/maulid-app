/**
 * Utility functions for role and jabatan checking and navigation mapping.
 * Client-safe (no Node.js built-ins or server dependencies).
 */

export interface CachedUserSession {
  id: string;
  username: string;
  nama: string;
  role: string;
  seksi_id?: string | null;
  jabatan?: string | null;
}

const SESSION_CACHE_KEY = "maulid_user_session";

export const ROLE_OPTIONS = [
  { value: "ketua_panitia", label: "Ketua Panitia" },
  { value: "wakil_ketua", label: "Wakil Ketua" },
  { value: "sekretaris", label: "Sekretaris" },
  { value: "bendahara", label: "Bendahara" },
  { value: "koordinator_seksi", label: "Koordinator Seksi" },
  { value: "pelindung", label: "Pelindung" },
  { value: "penasihat", label: "Penasihat" },
] as const;

export const ROLE_LABELS: Record<string, string> = {
  ketua_panitia: "Ketua Panitia",
  wakil_ketua: "Wakil Ketua",
  wakil_panitia: "Wakil Panitia",
  wakil_ketua_panitia: "Wakil Ketua Panitia",
  sekretaris: "Sekretaris",
  bendahara: "Bendahara",
  pelindung: "Pelindung",
  penasihat: "Penasihat",
  koordinator_seksi: "Koordinator Seksi",
  admin: "Ketua Panitia",
};

export function isKetuaRole(role?: string | null, jabatan?: string | null): boolean {
  const normRole = (role || "").toLowerCase().replace(/[\s_-]+/g, "");
  if (
    normRole === "ketuapanitia" ||
    normRole === "admin" ||
    normRole === "ketua" ||
    normRole === "ketuapelaksana" ||
    normRole === "ketuaumum"
  ) {
    return true;
  }

  if (jabatan) {
    const normJabatan = jabatan.toLowerCase().trim();
    // Exclude subordinate / seksi / wakil
    if (
      normJabatan.includes("wakil") ||
      normJabatan.includes("seksi") ||
      normJabatan.includes("divisi") ||
      normJabatan.includes("bidang") ||
      normJabatan.includes("bendahara") ||
      normJabatan.includes("sekretaris")
    ) {
      return false;
    }

    const clean = normJabatan.replace(/[\s_-]+/g, "");
    if (
      clean === "ketuapanitia" ||
      clean === "ketua" ||
      clean === "ketuapelaksana" ||
      clean === "ketuaumum" ||
      clean.startsWith("ketuapanitia") ||
      clean.startsWith("ketuapelaksana")
    ) {
      return true;
    }
  }

  return false;
}

export function isWakilRole(role?: string | null, jabatan?: string | null): boolean {
  // If role/jabatan strictly belongs to Ketua Panitia, it's not Wakil
  if (isKetuaRole(role, null)) return false;

  const normRole = (role || "").toLowerCase().replace(/[\s_-]+/g, "");
  if (
    normRole === "wakilketua" ||
    normRole === "wakilpanitia" ||
    normRole === "wakilketuapanitia" ||
    normRole === "wakilketuapelaksana" ||
    normRole === "wakilketua1" ||
    normRole === "wakilketua2" ||
    normRole === "wakilpanitia1" ||
    normRole === "wakilpanitia2" ||
    normRole === "wakil"
  ) {
    return true;
  }

  if (jabatan) {
    const normJabatan = jabatan.toLowerCase().trim();
    // Must NOT be wakil bendahara, wakil sekretaris, wakil seksi, wakil koordinator
    if (
      normJabatan.includes("bendahara") ||
      normJabatan.includes("sekretaris") ||
      normJabatan.includes("seksi") ||
      normJabatan.includes("koordinator") ||
      normJabatan.includes("divisi") ||
      normJabatan.includes("bidang")
    ) {
      return false;
    }

    const clean = normJabatan.replace(/[\s_-]+/g, "");
    if (
      clean === "wakil" ||
      clean === "wakilketua" ||
      clean === "wakilpanitia" ||
      clean === "wakilketuapanitia" ||
      clean === "wakilketuapelaksana" ||
      clean === "wakilketuaumum" ||
      clean === "wakilketua1" ||
      clean === "wakilketua2" ||
      clean === "wakilketuai" ||
      clean === "wakilketuaii" ||
      clean === "wakilpanitia1" ||
      clean === "wakilpanitia2" ||
      clean === "wakilpanitiai" ||
      clean === "wakilpanitiaii" ||
      clean === "wakil1" ||
      clean === "wakil2" ||
      clean === "wakili" ||
      clean === "wakilii" ||
      clean.startsWith("wakilketuapanitia") ||
      clean.startsWith("wakilketua") ||
      clean.startsWith("wakilpanitia")
    ) {
      return true;
    }
  }

  return false;
}

export function isSidebarRole(role?: string | null, jabatan?: string | null): boolean {
  return isKetuaRole(role, jabatan) || isWakilRole(role, jabatan);
}

export function getNavRoutes(role?: string | null, jabatan?: string | null): string[] {
  if (isKetuaRole(role, jabatan)) {
    return [
      "/dashboard",
      "/struktur",
      "/rundown",
      "/tugas",
      "/keuangan",
      "/tamu",
      "/pengguna",
    ];
  }

  if (isWakilRole(role, jabatan)) {
    return ["/dashboard", "/struktur", "/rundown", "/tugas", "/keuangan", "/tamu"];
  }

  const normRole = (role || "").toLowerCase().replace(/[\s_-]+/g, "");
  const normJabatan = (jabatan || "").toLowerCase();

  if (normRole === "sekretaris" || normJabatan.includes("sekretaris")) {
    return ["/dashboard", "/tugas", "/rundown", "/tamu"];
  }

  if (normRole === "bendahara" || normJabatan.includes("bendahara")) {
    return ["/dashboard", "/keuangan", "/tugas"];
  }

  if (normRole === "koordinatorseksi" || normJabatan.includes("koordinator")) {
    return ["/dashboard", "/tugas"];
  }

  if (
    normRole === "pelindung" ||
    normRole === "penasihat" ||
    normJabatan.includes("pelindung") ||
    normJabatan.includes("penasihat")
  ) {
    return ["/dashboard", "/tugas"];
  }

  // Default / Anggota / Panitia Lain
  return ["/dashboard", "/tugas"];
}

// Client cache helpers (sessionStorage)
export function getCachedUser(): CachedUserSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedUser(user: CachedUserSession | null): void {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(SESSION_CACHE_KEY);
    }
  } catch {}
}

export function clearCachedUser(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_CACHE_KEY);
  } catch {}
}
