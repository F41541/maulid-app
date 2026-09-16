import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { randomUUID } from "node:crypto";

const ALLOWED_STATUS = ["VVIP", "VIP", "Reguler"] as const;
const ALLOWED_KEHADIRAN = ["Hadir", "Tidak Hadir", "Belum Konfirmasi"] as const;

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const status = req.nextUrl.searchParams.get("status");
    const kehadiran = req.nextUrl.searchParams.get("kehadiran");
    const q = req.nextUrl.searchParams.get("q");

    let query = "SELECT * FROM tamu WHERE 1=1";
    const params: string[] = [];

    if (status && status !== "all") {
      query += " AND status = ?";
      params.push(status);
    }

    if (kehadiran && kehadiran !== "all") {
      query += " AND kehadiran = ?";
      params.push(kehadiran);
    }

    if (q) {
      query += " AND (nama LIKE ? OR alamat LIKE ? OR pengundang LIKE ?)";
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    query += `
      ORDER BY 
        CASE 
          WHEN status = 'VVIP' THEN 1
          WHEN status = 'VIP' THEN 2
          WHEN status = 'Reguler' THEN 3
          ELSE 4
        END, nama ASC
    `;

    const tamuList = db.prepare(query).all(...params);

    // Statistik tamu
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'VVIP' THEN 1 ELSE 0 END) as vvip,
        SUM(CASE WHEN status = 'VIP' THEN 1 ELSE 0 END) as vip,
        SUM(CASE WHEN status = 'Reguler' THEN 1 ELSE 0 END) as reguler,
        SUM(CASE WHEN kehadiran = 'Hadir' THEN 1 ELSE 0 END) as hadir,
        SUM(CASE WHEN kehadiran = 'Tidak Hadir' THEN 1 ELSE 0 END) as tidak_hadir,
        SUM(CASE WHEN kehadiran = 'Belum Konfirmasi' THEN 1 ELSE 0 END) as belum_konfirmasi
      FROM tamu
    `).get();

    return NextResponse.json({ tamu: tamuList, stats });
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

    if (action === "create") {
      const { nama, alamat, status, pengundang, kehadiran, catatan } = body;
      if (!nama) {
        return NextResponse.json({ error: "Nama tamu wajib diisi" }, { status: 400 });
      }

      const finalStatus = status || "VIP";
      if (!ALLOWED_STATUS.includes(finalStatus as (typeof ALLOWED_STATUS)[number])) {
        return NextResponse.json(
          { error: "Kategori tamu hanya boleh VVIP, VIP, atau Reguler" },
          { status: 400 }
        );
      }

      const finalKehadiran = kehadiran || "Hadir";
      if (!ALLOWED_KEHADIRAN.includes(finalKehadiran as (typeof ALLOWED_KEHADIRAN)[number])) {
        return NextResponse.json(
          { error: "Status kehadiran tidak valid" },
          { status: 400 }
        );
      }

      const id = randomUUID();
      db.prepare(
        "INSERT INTO tamu (id, nama, alamat, status, pengundang, kehadiran, catatan) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(
        id,
        nama,
        alamat || null,
        finalStatus,
        pengundang || null,
        finalKehadiran,
        catatan || null
      );

      return NextResponse.json({ success: true, id });
    }

    if (action === "update") {
      const { id, nama, alamat, status, pengundang, kehadiran, catatan } = body;
      if (!id || !nama) {
        return NextResponse.json({ error: "Data tamu tidak lengkap" }, { status: 400 });
      }

      const finalStatus = status || "VIP";
      if (!ALLOWED_STATUS.includes(finalStatus as (typeof ALLOWED_STATUS)[number])) {
        return NextResponse.json(
          { error: "Kategori tamu hanya boleh VVIP, VIP, atau Reguler" },
          { status: 400 }
        );
      }

      const finalKehadiran = kehadiran || "Hadir";
      if (!ALLOWED_KEHADIRAN.includes(finalKehadiran as (typeof ALLOWED_KEHADIRAN)[number])) {
        return NextResponse.json(
          { error: "Status kehadiran tidak valid" },
          { status: 400 }
        );
      }

      db.prepare(
        "UPDATE tamu SET nama = ?, alamat = ?, status = ?, pengundang = ?, kehadiran = ?, catatan = ? WHERE id = ?"
      ).run(
        nama,
        alamat || null,
        finalStatus,
        pengundang || null,
        finalKehadiran,
        catatan || null,
        id
      );

      return NextResponse.json({ success: true });
    }

    if (action === "update_kehadiran") {
      const { id, kehadiran } = body;
      if (!id || !kehadiran) {
        return NextResponse.json({ error: "ID dan kehadiran diperlukan" }, { status: 400 });
      }

      if (!ALLOWED_KEHADIRAN.includes(kehadiran as (typeof ALLOWED_KEHADIRAN)[number])) {
        return NextResponse.json(
          { error: "Status kehadiran tidak valid" },
          { status: 400 }
        );
      }

      db.prepare("UPDATE tamu SET kehadiran = ? WHERE id = ?").run(kehadiran, id);
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "ID tamu diperlukan" }, { status: 400 });

      db.prepare("DELETE FROM tamu WHERE id = ?").run(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Action tidak dikenal" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
