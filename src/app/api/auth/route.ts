import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { action, username, password } = await req.json();

    if (action === "logout") {
      await destroySession();
      return NextResponse.json({ success: true });
    }

    if (action === "login") {
      if (!username || !password) {
        return NextResponse.json({ error: "Username dan password wajib diisi" }, { status: 400 });
      }

      const db = getDb();
      const user = db.prepare("SELECT id, username, password, nama, role FROM admin_users WHERE username = ?").get(username) as
        | { id: string; username: string; password: string; nama: string; role?: string }
        | undefined;

      if (!user || user.password !== password) {
        return NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
      }

      await createSession({ id: user.id, username: user.username, nama: user.nama, role: user.role || "admin" });
      return NextResponse.json({
        success: true,
        user: { id: user.id, username: user.username, nama: user.nama, role: user.role || "admin" },
      });
    }

    return NextResponse.json({ error: "Action tidak dikenal" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
