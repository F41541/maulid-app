import crypto from "node:crypto";

export interface SessionUser {
  id: string;
  username: string;
  nama: string;
  role: string;
  seksi_id?: string | null;
  status?: string;
  jabatan?: string | null;
}

export const ROLES = {
  KETUA_PANITIA: "ketua_panitia",
  WAKIL_KETUA: "wakil_ketua",
  SEKRETARIS: "sekretaris",
  BENDAHARA: "bendahara",
  PELINDUNG: "pelindung",
  PENASIHAT: "penasihat",
  KOORDINATOR_SEKSI: "koordinator_seksi",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES] | string;

export {
  isSidebarRole,
  isKetuaRole,
  isWakilRole,
  getNavRoutes,
} from "./role-utils.ts";

if (process.env.NODE_ENV === "production" && !process.env.AUTH_SECRET) {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    console.warn("WARNING: AUTH_SECRET is not defined during build. Ensure AUTH_SECRET is set in production runtime!");
  } else {
    console.error("FATAL ERROR: AUTH_SECRET must be defined in production environment!");
    throw new Error("FATAL: AUTH_SECRET must be defined in production environment!");
  }
}
const AUTH_SECRET = process.env.AUTH_SECRET || "maulid-app-super-secret-key-1448h-2026m";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  if (storedHash.includes(":")) {
    const [salt, originalHash] = storedHash.split(":");
    if (!salt || !originalHash) return false;
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
    const hashBuf = Buffer.from(hash);
    const origBuf = Buffer.from(originalHash);
    if (hashBuf.length !== origBuf.length) return false;
    return crypto.timingSafeEqual(hashBuf, origBuf);
  }
  // Fallback for legacy plain text testing passwords
  return password === storedHash;
}

export function signToken(payload: string): string {
  const hmac = crypto.createHmac("sha256", AUTH_SECRET);
  return hmac.update(payload).digest("hex");
}

export function createSessionToken(user: SessionUser): string {
  if (user.username && user.username.includes(":")) {
    throw new Error("Username cannot contain ':' delimiter");
  }
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const seksiId = user.seksi_id || "";
  const role = user.role || "ketua_panitia";
  const data = `${user.id}:${user.username}:${role}:${seksiId}:${expiresAt}`;
  const sig = signToken(data);
  return Buffer.from(`${data}:${sig}`).toString("base64");
}

export function verifySessionToken(token: string): {
  userId: string;
  username: string;
  role: string;
  seksiId: string | null;
  expiresAt: number;
} | null {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 6) {
      return null;
    }
    const [userId, username, role, seksiId, expiresAtStr, sig] = parts;
    const data = `${userId}:${username}:${role}:${seksiId}:${expiresAtStr}`;
    const expectedSig = signToken(data);
    const sigBuf = Buffer.from(sig);
    const expectedSigBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedSigBuf.length || !crypto.timingSafeEqual(sigBuf, expectedSigBuf)) {
      return null;
    }
    const expiresAt = Number(expiresAtStr);
    if (Date.now() > expiresAt) {
      return null;
    }
    return { userId, username, role, seksiId: seksiId || null, expiresAt };
  } catch {
    return null;
  }
}
