import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { randomUUID } from "node:crypto";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const panitiaList = db.prepare(`
      SELECT p.*, s.nama_seksi 
      FROM panitia p 
      LEFT JOIN seksi s ON p.seksi_id = s.id 
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
    `).all();

    const seksiList = db.prepare(`
      SELECT s.*, p.nama as koordinator_nama, p.no_hp as koordinator_hp,
        (SELECT COUNT(*) FROM panitia WHERE seksi_id = s.id) as total_anggota,
        (SELECT COUNT(*) FROM tugas WHERE seksi_id = s.id) as total_tugas,
        (SELECT COUNT(*) FROM tugas WHERE seksi_id = s.id AND status = 'Selesai') as tugas_selesai
      FROM seksi s
      JOIN panitia p ON s.koordinator_id = p.id
      ORDER BY s.nama_seksi ASC
    `).all();

    return NextResponse.json({ panitia: panitiaList, seksi: seksiList });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { action } = body;

    if (action === "create_panitia") {
      const { nama, jabatan, seksi_id, no_hp, catatan } = body;
      if (!nama || !jabatan) {
        return NextResponse.json({ error: "Nama dan jabatan wajib diisi" }, { status: 400 });
      }

      const id = randomUUID();
      db.prepare(
        "INSERT INTO panitia (id, nama, jabatan, seksi_id, no_hp, catatan) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(id, nama, jabatan, seksi_id || null, no_hp || null, catatan || null);

      return NextResponse.json({ success: true, id });
    }

    if (action === "update_panitia") {
      const { id, nama, jabatan, seksi_id, no_hp, catatan } = body;
      if (!id || !nama || !jabatan) {
        return NextResponse.json({ error: "Data panitia tidak lengkap" }, { status: 400 });
      }

      db.prepare(
        "UPDATE panitia SET nama = ?, jabatan = ?, seksi_id = ?, no_hp = ?, catatan = ? WHERE id = ?"
      ).run(nama, jabatan, seksi_id || null, no_hp || null, catatan || null, id);

      return NextResponse.json({ success: true });
    }

    if (action === "delete_panitia") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "ID panitia diperlukan" }, { status: 400 });

      // Check if this panitia is a coordinator for any seksi
      const seksiCount = db.prepare("SELECT COUNT(*) as count FROM seksi WHERE koordinator_id = ?").get(id) as { count: number };
      if (seksiCount.count > 0) {
        return NextResponse.json(
          { error: "Tidak dapat menghapus panitia yang menjabat sebagai koordinator seksi. Ganti koordinator seksi terlebih dahulu." },
          { status: 400 }
        );
      }

      db.prepare("DELETE FROM panitia WHERE id = ?").run(id);
      return NextResponse.json({ success: true });
    }

    if (action === "create_seksi") {
      const { nama_seksi, koordinator_id } = body;
      if (!nama_seksi || !koordinator_id) {
        return NextResponse.json({ error: "Nama seksi dan Koordinator wajib diisi" }, { status: 400 });
      }

      // Verify koordinator exists
      const koordinator = db.prepare("SELECT id FROM panitia WHERE id = ?").get(koordinator_id);
      if (!koordinator) {
        return NextResponse.json({ error: "Koordinator tidak ditemukan di daftar panitia" }, { status: 400 });
      }

      const id = randomUUID();
      db.prepare("INSERT INTO seksi (id, nama_seksi, koordinator_id) VALUES (?, ?, ?)").run(
        id,
        nama_seksi,
        koordinator_id
      );

      // Also set seksi_id on the coordinator panitia record if not set
      db.prepare("UPDATE panitia SET seksi_id = ? WHERE id = ?").run(id, koordinator_id);

      return NextResponse.json({ success: true, id });
    }

    if (action === "update_seksi") {
      const { id, nama_seksi, koordinator_id } = body;
      if (!id || !nama_seksi || !koordinator_id) {
        return NextResponse.json({ error: "Data seksi tidak lengkap" }, { status: 400 });
      }

      // Verify koordinator exists
      const koordinator = db.prepare("SELECT id FROM panitia WHERE id = ?").get(koordinator_id);
      if (!koordinator) {
        return NextResponse.json({ error: "Koordinator tidak ditemukan di daftar panitia" }, { status: 400 });
      }

      db.prepare("UPDATE seksi SET nama_seksi = ?, koordinator_id = ? WHERE id = ?").run(
        nama_seksi,
        koordinator_id,
        id
      );

      // Update coordinator's seksi
      db.prepare("UPDATE panitia SET seksi_id = ? WHERE id = ?").run(id, koordinator_id);

      return NextResponse.json({ success: true });
    }

    if (action === "delete_seksi") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "ID seksi diperlukan" }, { status: 400 });

      // Detach panitia assigned to this seksi
      db.prepare("UPDATE panitia SET seksi_id = NULL WHERE seksi_id = ?").run(id);
      db.prepare("DELETE FROM seksi WHERE id = ?").run(id);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Aksi tidak dikenali" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
