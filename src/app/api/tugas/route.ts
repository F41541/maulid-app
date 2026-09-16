import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { randomUUID } from "node:crypto";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const seksiId = req.nextUrl.searchParams.get("seksi_id");
    const status = req.nextUrl.searchParams.get("status");

    let query = `
      SELECT t.*, s.nama_seksi, p.nama as pj_nama, p.no_hp as pj_hp
      FROM tugas t
      JOIN seksi s ON t.seksi_id = s.id
      LEFT JOIN panitia p ON t.pj_id = p.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (seksiId) {
      query += " AND t.seksi_id = ?";
      params.push(seksiId);
    }
    if (status) {
      query += " AND t.status = ?";
      params.push(status);
    }

    query += " ORDER BY t.created_at DESC";

    const tugasList = db.prepare(query).all(...params);
    const seksiList = db.prepare("SELECT id, nama_seksi FROM seksi ORDER BY nama_seksi ASC").all();
    const panitiaList = db.prepare("SELECT id, nama, jabatan, seksi_id FROM panitia ORDER BY nama ASC").all();

    // Summary statistics per seksi
    const progressStats = db.prepare(`
      SELECT 
        s.id, s.nama_seksi,
        COUNT(t.id) as total,
        SUM(CASE WHEN t.status = 'Selesai' THEN 1 ELSE 0 END) as selesai,
        SUM(CASE WHEN t.status = 'Proses' THEN 1 ELSE 0 END) as proses,
        SUM(CASE WHEN t.status = 'Belum Mulai' THEN 1 ELSE 0 END) as belum_mulai
      FROM seksi s
      LEFT JOIN tugas t ON s.id = t.seksi_id
      GROUP BY s.id, s.nama_seksi
    `).all();

    return NextResponse.json({ tugas: tugasList, seksi: seksiList, panitia: panitiaList, progressStats });
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
      const { seksi_id, nama_tugas, deskripsi, status, deadline, pj_id } = body;
      if (!seksi_id || !nama_tugas) {
        return NextResponse.json({ error: "Seksi dan nama tugas wajib diisi" }, { status: 400 });
      }

      const id = randomUUID();
      db.prepare(
        "INSERT INTO tugas (id, seksi_id, nama_tugas, deskripsi, status, deadline, pj_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(id, seksi_id, nama_tugas, deskripsi || null, status || "Belum Mulai", deadline || null, pj_id || null);

      return NextResponse.json({ success: true, id });
    }

    if (action === "update") {
      const { id, seksi_id, nama_tugas, deskripsi, status, deadline, pj_id } = body;
      if (!id || !seksi_id || !nama_tugas) {
        return NextResponse.json({ error: "Data tugas tidak lengkap" }, { status: 400 });
      }

      db.prepare(
        "UPDATE tugas SET seksi_id = ?, nama_tugas = ?, deskripsi = ?, status = ?, deadline = ?, pj_id = ? WHERE id = ?"
      ).run(seksi_id, nama_tugas, deskripsi || null, status, deadline || null, pj_id || null, id);

      return NextResponse.json({ success: true });
    }

    if (action === "update_status") {
      const { id, status } = body;
      if (!id || !status) {
        return NextResponse.json({ error: "ID dan status tugas diperlukan" }, { status: 400 });
      }

      db.prepare("UPDATE tugas SET status = ? WHERE id = ?").run(status, id);
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "ID tugas diperlukan" }, { status: 400 });

      db.prepare("DELETE FROM tugas WHERE id = ?").run(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Action tidak dikenal" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
