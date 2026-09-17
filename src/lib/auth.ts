import { cookies } from "next/headers";
import { queryOne } from "./db";
import {
  SessionUser,
  verifySessionToken,
  createSessionToken,
} from "./auth-tokens";

export * from "./auth-tokens";

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("maulid_session")?.value;
  if (!sessionToken) return null;

  const verified = verifySessionToken(sessionToken);
  if (!verified) return null;

  try {
    let user: SessionUser | null = null;
    try {
      user = await queryOne<SessionUser>(
        `SELECT u.id, u.username, u.nama, u.role, COALESCE(u.seksi_id, p.seksi_id) as seksi_id, u.status, p.jabatan as jabatan, s.nama_seksi as nama_seksi
         FROM admin_users u
         LEFT JOIN panitia p ON p.user_id = u.id
         LEFT JOIN seksi s ON (u.seksi_id = s.id OR (u.seksi_id IS NULL AND p.seksi_id = s.id))
         WHERE u.id = ? AND u.username = ? AND (u.status = 'aktif' OR u.status IS NULL)`,
        [verified.userId, verified.username]
      );
    } catch {
      user = await queryOne<SessionUser>(
        `SELECT id, username, nama, role, seksi_id, status FROM admin_users WHERE id = ? AND username = ? AND (status = 'aktif' OR status IS NULL)`,
        [verified.userId, verified.username]
      );
    }
    if (!user) return null;
    if (user.role === "admin") {
      user.role = "ketua_panitia";
    }
    return user;
  } catch {
    return null;
  }
}

export async function requireAuth(allowedRoles?: string[]): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  if (allowedRoles && allowedRoles.length > 0) {
    const currentRole = session.role === "admin" ? "ketua_panitia" : session.role;
    // ketua_panitia has full access
    if (!allowedRoles.includes(currentRole) && currentRole !== "ketua_panitia") {
      throw new Error("FORBIDDEN");
    }
  }
  return session;
}

export async function createSession(user: SessionUser) {
  const token = createSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set("maulid_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete("maulid_session");
}
