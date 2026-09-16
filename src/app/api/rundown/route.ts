import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { randomUUID } from "node:crypto";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const rundown = db.prepare("SELECT * FROM rundown ORDER BY urutan ASC, created_at ASC").all();
    return NextResponse.json({ rundown });
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
      const { hari, waktu, nama_kegiatan, nama_pengisi, catatan } = body;
      if (!waktu || !nama_kegiatan) {
        return NextResponse.json({ error: "Waktu dan nama kegiatan wajib diisi" }, { status: 400 });
      }

      // get highest urutan
      const maxUrutan = db.prepare("SELECT COALESCE(MAX(urutan), 0) as max_u FROM rundown").get() as { max_u: number };
      const nextUrutan = (maxUrutan?.max_u || 0) + 1;

      const id = randomUUID();
      db.prepare(
        "INSERT INTO rundown (id, hari, waktu, nama_kegiatan, nama_pengisi, catatan, urutan) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(id, hari || "Hari H", waktu, nama_kegiatan, nama_pengisi || null, catatan || null, nextUrutan);

      return NextResponse.json({ success: true, id });
    }

    if (action === "update") {
      const { id, hari, waktu, nama_kegiatan, nama_pengisi, catatan } = body;
      if (!id || !waktu || !nama_kegiatan) {
        return NextResponse.json({ error: "Data rundown tidak lengkap" }, { status: 400 });
      }

      db.prepare(
        "UPDATE rundown SET hari = ?, waktu = ?, nama_kegiatan = ?, nama_pengisi = ?, catatan = ? WHERE id = ?"
      ).run(hari || "Hari H", waktu, nama_kegiatan, nama_pengisi || null, catatan || null, id);

      return NextResponse.json({ success: true });
    }

    if (action === "reorder") {
      // items array of { id, urutan }
      const { items } = body;
      if (!Array.isArray(items)) {
        return NextResponse.json({ error: "Format urutan tidak valid" }, { status: 400 });
      }

      const updateStmt = db.prepare("UPDATE rundown SET urutan = ? WHERE id = ?");
      for (const item of items) {
        updateStmt.run(item.urutan, item.id);
      }

      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "ID rundown diperlukan" }, { status: 400 });

      db.prepare("DELETE FROM rundown WHERE id = ?").run(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Action tidak dikenal" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
