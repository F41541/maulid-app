import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute, withTransaction } from "@/lib/db";
import { requireAuth, hashPassword, ROLES } from "@/lib/auth";
import { randomUUID } from "node:crypto";

export async function GET() {
  try {
    await requireAuth([ROLES.KETUA_PANITIA]);

    const users = await query(`
      SELECT 
        u.id, u.username, u.nama, u.role, u.seksi_id, u.status, u.created_at,
        s.nama_seksi,
        p.id as panitia_id, p.nama as panitia_nama, p.jabatan as panitia_jabatan
      FROM admin_users u
      LEFT JOIN seksi s ON u.seksi_id = s.id
      LEFT JOIN panitia p ON p.user_id = u.id
      ORDER BY u.created_at DESC
    `);

    const panitiaTanpaAkun = await query(`
      SELECT p.id, p.nama, p.jabatan, p.seksi_id, s.nama_seksi
      FROM panitia p
      LEFT JOIN seksi s ON p.seksi_id = s.id
      WHERE p.user_id IS NULL OR p.user_id = ''
      ORDER BY p.nama ASC
    `);

    const seksiList = await query("SELECT id, nama_seksi FROM seksi ORDER BY nama_seksi ASC");

    return NextResponse.json({ users, panitiaTanpaAkun, seksiList });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Hanya Ketua Panitia yang dapat mengelola akun pengguna" }, { status: 403 });
    }
    console.error("[Users API] GET Error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await requireAuth([ROLES.KETUA_PANITIA]);
    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { username, password, nama, role, seksi_id, panitia_id } = body;

      if (!username || !password || !nama || !role) {
        return NextResponse.json({ error: "Semua kolom wajib diisi (username, password, nama, role)" }, { status: 400 });
      }

      if (username.length < 3) {
        return NextResponse.json({ error: "Username minimal 3 karakter" }, { status: 400 });
      }

      if (password.length < 5) {
        return NextResponse.json({ error: "Password minimal 5 karakter" }, { status: 400 });
      }

      const existing = await queryOne("SELECT id FROM admin_users WHERE username = ?", [username]);
      if (existing) {
        return NextResponse.json({ error: "Username sudah digunakan oleh akun lain" }, { status: 400 });
      }

      const normalizedRole =
        role === "koordinator_acara" ? ROLES.KOORDINATOR_SEKSI : role;

      const validRoles = [
        ROLES.KETUA_PANITIA,
        ROLES.WAKIL_KETUA,
        ROLES.SEKRETARIS,
        ROLES.BENDAHARA,
        ROLES.PELINDUNG,
        ROLES.PENASIHAT,
        ROLES.KOORDINATOR_SEKSI,
      ];

      if (!validRoles.includes(normalizedRole)) {
        return NextResponse.json({ error: "Role pengguna tidak valid" }, { status: 400 });
      }

      const userId = randomUUID();
      const hashedPassword = hashPassword(password);
      const targetSeksiId = normalizedRole === ROLES.KOORDINATOR_SEKSI ? seksi_id || null : null;

      await withTransaction(async (conn) => {
        await conn.execute(
          "INSERT INTO admin_users (id, username, password, nama, role, seksi_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [userId, username, hashedPassword, nama, normalizedRole, targetSeksiId, "aktif"]
        );

        if (panitia_id) {
          await conn.execute("UPDATE panitia SET user_id = ? WHERE id = ?", [userId, panitia_id]);
        }
      });

      return NextResponse.json({ success: true, id: userId });
    }

    if (action === "reset_password") {
      const { id, new_password } = body;
      if (!id || !new_password) {
        return NextResponse.json({ error: "ID dan password baru diperlukan" }, { status: 400 });
      }

      if (new_password.length < 5) {
        return NextResponse.json({ error: "Password minimal 5 karakter" }, { status: 400 });
      }

      const hashedPassword = hashPassword(new_password);
      await execute("UPDATE admin_users SET password = ? WHERE id = ?", [hashedPassword, id]);
      return NextResponse.json({ success: true });
    }

    if (action === "update") {
      const { id, username, nama, role, seksi_id, new_password } = body;
      if (!id || !username || !nama || !role) {
        return NextResponse.json({ error: "Data pengguna tidak lengkap" }, { status: 400 });
      }

      // Check if username is taken by another user
      const existing = await queryOne<{ id: string }>(
        "SELECT id FROM admin_users WHERE username = ? AND id != ?",
        [username, id]
      );
      if (existing) {
        return NextResponse.json({ error: "Username sudah digunakan oleh akun lain" }, { status: 400 });
      }

      const normalizedRole =
        role === "koordinator_acara" ? ROLES.KOORDINATOR_SEKSI : role;
      const targetSeksiId =
        normalizedRole === ROLES.KOORDINATOR_SEKSI ? seksi_id || null : null;

      if (new_password && new_password.trim().length > 0) {
        if (new_password.length < 5) {
          return NextResponse.json({ error: "Password minimal 5 karakter" }, { status: 400 });
        }
        const hashedPassword = hashPassword(new_password);
        await execute(
          "UPDATE admin_users SET username = ?, nama = ?, role = ?, seksi_id = ?, password = ? WHERE id = ?",
          [username, nama, normalizedRole, targetSeksiId, hashedPassword, id]
        );
      } else {
        await execute(
          "UPDATE admin_users SET username = ?, nama = ?, role = ?, seksi_id = ? WHERE id = ?",
          [username, nama, normalizedRole, targetSeksiId, id]
        );
      }

      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "ID pengguna diperlukan" }, { status: 400 });

      if (id === currentUser.id) {
        return NextResponse.json({ error: "Tidak dapat menghapus akun sendiri yang sedang aktif" }, { status: 400 });
      }

      await withTransaction(async (conn) => {
        // Unlink panitia
        await conn.execute("UPDATE panitia SET user_id = NULL WHERE user_id = ?", [id]);
        // Delete user
        await conn.execute("DELETE FROM admin_users WHERE id = ?", [id]);
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Aksi tidak dikenali" }, { status: 400 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Hanya Ketua Panitia yang dapat mengelola akun pengguna" }, { status: 403 });
    }
    console.error("[Users API] POST Error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
