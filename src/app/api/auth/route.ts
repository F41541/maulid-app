import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { createSession, destroySession, getSession, verifyPassword, hashPassword } from "@/lib/auth";
import { getFailedLogin, recordFailedLogin, resetFailedLogin } from "@/lib/redis";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({ user: session });
  } catch (err: unknown) {
    console.error("[Auth API] GET Session Error:", err);
    return NextResponse.json({ user: null });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, username, password } = body;

    if (action === "logout") {
      await destroySession();
      return NextResponse.json({ success: true });
    }

    if (action === "login") {
      if (!username || !password) {
        return NextResponse.json({ error: "Username dan password wajib diisi" }, { status: 400 });
      }

      // Check rate limit per username / IP
      const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || "localhost";
      const rateLimitKey = `${clientIp}:${username}`;
      const now = Date.now();
      const attempt = await getFailedLogin(rateLimitKey);

      if (attempt && attempt.lockUntil > now) {
        const remainingMinutes = Math.ceil((attempt.lockUntil - now) / 60000);
        return NextResponse.json(
          { error: `Terlalu banyak percobaan gagal. Akun dikunci sementara. Silakan tunggu ${remainingMinutes} menit.` },
          { status: 429 }
        );
      }

      let user: {
        id: string;
        username: string;
        password: string;
        nama: string;
        role: string;
        seksi_id?: string | null;
        nama_seksi?: string | null;
        status?: string;
        jabatan?: string | null;
      } | null = null;

      try {
        user = await queryOne<{
          id: string;
          username: string;
          password: string;
          nama: string;
          role: string;
          seksi_id?: string | null;
          nama_seksi?: string | null;
          status?: string;
          jabatan?: string | null;
        }>(
          `SELECT u.id, u.username, u.password, u.nama, u.role, COALESCE(u.seksi_id, p.seksi_id) as seksi_id, u.status, p.jabatan as jabatan, s.nama_seksi as nama_seksi
           FROM admin_users u
           LEFT JOIN panitia p ON p.user_id = u.id
           LEFT JOIN seksi s ON (u.seksi_id = s.id OR (u.seksi_id IS NULL AND p.seksi_id = s.id))
           WHERE u.username = ?`,
          [username]
        );
      } catch {
        user = await queryOne<{
          id: string;
          username: string;
          password: string;
          nama: string;
          role: string;
          seksi_id?: string | null;
          status?: string;
          jabatan?: string | null;
        }>("SELECT id, username, password, nama, role, seksi_id, status FROM admin_users WHERE username = ?", [username]);
      }

      if (!user || user.status === "nonaktif" || !verifyPassword(password, user.password)) {
        const count = (attempt?.count || 0) + 1;
        const lockUntil = count >= 5 ? now + 5 * 60 * 1000 : 0;
        await recordFailedLogin(rateLimitKey, count, lockUntil);

        return NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
      }

      // Reset failed attempts on success
      await resetFailedLogin(rateLimitKey);

      // Auto-upgrade plaintext password to salted hash if needed
      if (!user.password.includes(":")) {
        try {
          const newHash = hashPassword(password);
          await execute("UPDATE admin_users SET password = ? WHERE id = ?", [newHash, user.id]);
        } catch {}
      }

      const normalizedRole = user.role === "admin" ? "ketua_panitia" : user.role || "ketua_panitia";

      await createSession({
        id: user.id,
        username: user.username,
        nama: user.nama,
        role: normalizedRole,
        seksi_id: user.seksi_id || null,
        nama_seksi: user.nama_seksi || null,
        jabatan: user.jabatan || null,
      });

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          nama: user.nama,
          role: normalizedRole,
          seksi_id: user.seksi_id || null,
          nama_seksi: user.nama_seksi || null,
          jabatan: user.jabatan || null,
        },
      });
    }

    return NextResponse.json({ error: "Action tidak dikenal" }, { status: 400 });
  } catch (err: unknown) {
    console.error("[Auth API] Error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
