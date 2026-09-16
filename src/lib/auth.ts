import { cookies } from "next/headers";
import { getDb } from "./db";

export interface SessionUser {
  id: string;
  username: string;
  nama: string;
  role?: string;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("maulid_session")?.value;
  if (!sessionToken) return null;

  try {
    const [userId, username] = Buffer.from(sessionToken, "base64").toString("utf-8").split(":");
    if (!userId || !username) return null;

    const db = getDb();
    const user = db.prepare("SELECT id, username, nama, role FROM admin_users WHERE id = ? AND username = ?").get(userId, username) as SessionUser | undefined;
    return user || null;
  } catch {
    return null;
  }
}

export async function createSession(user: SessionUser) {
  const token = Buffer.from(`${user.id}:${user.username}`).toString("base64");
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
