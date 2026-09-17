import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute, withTransaction } from "@/lib/db";
import { requireAuth, ROLES } from "@/lib/auth";
import { randomUUID } from "node:crypto";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const rundown = await query("SELECT * FROM rundown ORDER BY urutan ASC, created_at ASC");
    return NextResponse.json({ rundown });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Hanya Sekretaris, Ketua, atau Wakil yang dapat mengakses rundown" }, { status: 403 });
    }
    console.error("[Rundown API] GET Error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth([ROLES.KETUA_PANITIA, ROLES.WAKIL_KETUA, ROLES.SEKRETARIS]);
    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { hari, waktu, nama_kegiatan, nama_pengisi, catatan } = body;
      if (!waktu || !nama_kegiatan) {
        return NextResponse.json({ error: "Waktu dan nama kegiatan wajib diisi" }, { status: 400 });
      }

      const id = randomUUID();

      await withTransaction(async (conn) => {
        const [rows] = await conn.query(
          "SELECT COALESCE(MAX(urutan), 0) as max_u FROM rundown FOR UPDATE"
        ) as any;
        const nextUrutan = (Number(rows[0]?.max_u) || 0) + 1;

        await conn.execute(
          "INSERT INTO rundown (id, hari, waktu, nama_kegiatan, nama_pengisi, catatan, urutan) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [id, hari || "Hari H", waktu, nama_kegiatan, nama_pengisi || null, catatan || null, nextUrutan]
        );
      });

      return NextResponse.json({ success: true, id });
    }

    if (action === "update") {
      const { id, hari, waktu, nama_kegiatan, nama_pengisi, catatan } = body;
      if (!id || !waktu || !nama_kegiatan) {
        return NextResponse.json({ error: "Data rundown tidak lengkap" }, { status: 400 });
      }

      await execute(
        "UPDATE rundown SET hari = ?, waktu = ?, nama_kegiatan = ?, nama_pengisi = ?, catatan = ? WHERE id = ?",
        [hari || "Hari H", waktu, nama_kegiatan, nama_pengisi || null, catatan || null, id]
      );

      return NextResponse.json({ success: true });
    }

    if (action === "reorder") {
      const { items } = body;
      if (!Array.isArray(items)) {
        return NextResponse.json({ error: "Format urutan tidak valid" }, { status: 400 });
      }

      await withTransaction(async (conn) => {
        for (const item of items) {
          await conn.execute("UPDATE rundown SET urutan = ? WHERE id = ?", [item.urutan, item.id]);
        }
      });

      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "ID rundown diperlukan" }, { status: 400 });

      await execute("DELETE FROM rundown WHERE id = ?", [id]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Action tidak dikenal" }, { status: 400 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Hanya Sekretaris, Ketua, atau Wakil yang dapat mengubah susunan acara" }, { status: 403 });
    }
    console.error("[Rundown API] POST Error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
