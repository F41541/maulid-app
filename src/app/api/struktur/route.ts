import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute, withTransaction } from "@/lib/db";
import { requireAuth, ROLES } from "@/lib/auth";
import { randomUUID } from "node:crypto";

export async function GET(req: NextRequest) {
  try {
    await requireAuth([ROLES.KETUA_PANITIA, ROLES.WAKIL_KETUA]);

    const panitiaList = await query(`
      SELECT 
        p.*, s.nama_seksi,
        u.username as user_username, u.role as user_role, u.status as user_status
      FROM panitia p 
      LEFT JOIN seksi s ON p.seksi_id = s.id 
      LEFT JOIN admin_users u ON p.user_id = u.id
      ORDER BY 
        CASE 
          WHEN p.jabatan = 'Pelindung' THEN 1
          WHEN p.jabatan = 'Penasihat' THEN 2
          WHEN p.jabatan = 'Ketua Panitia' THEN 3
          WHEN p.jabatan = 'Wakil Ketua' THEN 4
          WHEN p.jabatan = 'Sekretaris' THEN 5
          WHEN p.jabatan = 'Bendahara' THEN 6
          WHEN p.jabatan = 'Koordinator Seksi' THEN 7
          ELSE 8
        END, p.nama ASC
    `);

    const seksiList = await query(`
      SELECT s.*, p.nama as koordinator_nama, p.no_hp as koordinator_hp,
        (SELECT COUNT(*) FROM panitia WHERE seksi_id = s.id) as total_anggota,
        (SELECT COUNT(*) FROM tugas WHERE seksi_id = s.id) as total_tugas,
        (SELECT COUNT(*) FROM tugas WHERE seksi_id = s.id AND status = 'Selesai') as tugas_selesai
      FROM seksi s
      JOIN panitia p ON s.koordinator_id = p.id
      ORDER BY s.nama_seksi ASC
    `);

    return NextResponse.json({ panitia: panitiaList, seksi: seksiList });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Hanya Ketua dan Wakil Ketua Panitia yang dapat mengakses struktur" }, { status: 403 });
    }
    console.error("[Struktur API] GET Error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth([ROLES.KETUA_PANITIA, ROLES.WAKIL_KETUA]);
    const body = await req.json();
    const { action } = body;

    if (action === "create_panitia") {
      const { nama, jabatan, seksi_id, no_hp, catatan } = body;
      if (!nama || !jabatan) {
        return NextResponse.json({ error: "Nama dan jabatan wajib diisi" }, { status: 400 });
      }

      const id = randomUUID();
      await execute(
        "INSERT INTO panitia (id, nama, jabatan, seksi_id, no_hp, catatan) VALUES (?, ?, ?, ?, ?, ?)",
        [id, nama, jabatan, seksi_id || null, no_hp || null, catatan || null]
      );

      return NextResponse.json({ success: true, id });
    }

    if (action === "update_panitia") {
      const { id, nama, jabatan, seksi_id, no_hp, catatan } = body;
      if (!id || !nama || !jabatan) {
        return NextResponse.json({ error: "Data panitia tidak lengkap" }, { status: 400 });
      }

      const result = await execute(
        "UPDATE panitia SET nama = ?, jabatan = ?, seksi_id = ?, no_hp = ?, catatan = ? WHERE id = ?",
        [nama, jabatan, seksi_id || null, no_hp || null, catatan || null, id]
      );
      if (result.affectedRows === 0) {
        return NextResponse.json({ error: "Panitia tidak ditemukan" }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === "delete_panitia") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "ID panitia diperlukan" }, { status: 400 });

      // Check if this panitia is a coordinator for any seksi
      const seksiCount = await queryOne<{ count: number }>(
        "SELECT COUNT(*) as count FROM seksi WHERE koordinator_id = ?",
        [id]
      );
      if (Number(seksiCount?.count || 0) > 0) {
        return NextResponse.json(
          { error: "Tidak dapat menghapus panitia yang menjabat sebagai koordinator seksi. Ganti koordinator seksi terlebih dahulu." },
          { status: 400 }
        );
      }

      const result = await execute("DELETE FROM panitia WHERE id = ?", [id]);
      if (result.affectedRows === 0) {
        return NextResponse.json({ error: "Panitia tidak ditemukan" }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "create_seksi") {
      const { nama_seksi, koordinator_id } = body;
      if (!nama_seksi || !koordinator_id) {
        return NextResponse.json({ error: "Nama seksi dan Koordinator wajib diisi" }, { status: 400 });
      }

      // Verify koordinator exists
      const koordinator = await queryOne("SELECT id FROM panitia WHERE id = ?", [koordinator_id]);
      if (!koordinator) {
        return NextResponse.json({ error: "Koordinator tidak ditemukan di daftar panitia" }, { status: 400 });
      }

      const id = randomUUID();
      await withTransaction(async (conn) => {
        await conn.execute("INSERT INTO seksi (id, nama_seksi, koordinator_id) VALUES (?, ?, ?)", [
          id,
          nama_seksi,
          koordinator_id,
        ]);

        await conn.execute("UPDATE panitia SET seksi_id = ? WHERE id = ?", [id, koordinator_id]);
      });

      return NextResponse.json({ success: true, id });
    }

    if (action === "update_seksi") {
      const { id, nama_seksi, koordinator_id } = body;
      if (!id || !nama_seksi || !koordinator_id) {
        return NextResponse.json({ error: "Data seksi tidak lengkap" }, { status: 400 });
      }

      const existingSeksi = await queryOne("SELECT id FROM seksi WHERE id = ?", [id]);
      if (!existingSeksi) {
        return NextResponse.json({ error: "Seksi tidak ditemukan" }, { status: 404 });
      }

      // Verify koordinator exists
      const koordinator = await queryOne("SELECT id FROM panitia WHERE id = ?", [koordinator_id]);
      if (!koordinator) {
        return NextResponse.json({ error: "Koordinator tidak ditemukan di daftar panitia" }, { status: 400 });
      }

      await withTransaction(async (conn) => {
        await conn.execute("UPDATE seksi SET nama_seksi = ?, koordinator_id = ? WHERE id = ?", [
          nama_seksi,
          koordinator_id,
          id,
        ]);

        await conn.execute("UPDATE panitia SET seksi_id = ? WHERE id = ?", [id, koordinator_id]);
      });

      return NextResponse.json({ success: true });
    }

    if (action === "delete_seksi") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "ID seksi diperlukan" }, { status: 400 });

      const existingSeksi = await queryOne("SELECT id FROM seksi WHERE id = ?", [id]);
      if (!existingSeksi) {
        return NextResponse.json({ error: "Seksi tidak ditemukan" }, { status: 404 });
      }

      await withTransaction(async (conn) => {
        // Detach panitia assigned to this seksi
        await conn.execute("UPDATE panitia SET seksi_id = NULL WHERE seksi_id = ?", [id]);
        await conn.execute("DELETE FROM seksi WHERE id = ?", [id]);
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Aksi tidak dikenali" }, { status: 400 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Hanya Ketua Panitia atau Wakil Ketua yang dapat mengubah struktur organisasi" }, { status: 403 });
    }
    console.error("[Struktur API] POST Error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
