import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute } from "@/lib/db";
import { requireAuth, ROLES, isKetuaRole, isWakilRole } from "@/lib/auth";
import { randomUUID } from "node:crypto";

const VALID_STATUSES = ["Belum Mulai", "Proses", "Selesai"];

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();

    const seksiIdParam = req.nextUrl.searchParams.get("seksi_id");
    const statusParam = req.nextUrl.searchParams.get("status");

    let sql = `
      SELECT t.*, s.nama_seksi, p.nama as pj_nama, p.no_hp as pj_hp
      FROM tugas t
      LEFT JOIN seksi s ON t.seksi_id = s.id
      LEFT JOIN panitia p ON t.pj_id = p.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    // Role-based scoping
    if (user.role === ROLES.KOORDINATOR_SEKSI) {
      if (user.seksi_id) {
        sql += " AND (t.seksi_id = ? OR t.is_umum = 1)";
        params.push(user.seksi_id);
      } else {
        sql += " AND t.is_umum = 1";
      }
    } else if (user.role === ROLES.SEKRETARIS) {
      sql += " AND (t.target_role = 'sekretaris' OR s.nama_seksi LIKE '%sekretariat%' OR t.created_by = ? OR t.is_umum = 1)";
      params.push(user.id);
    } else if (user.role === ROLES.BENDAHARA) {
      sql += " AND (t.target_role = 'bendahara' OR s.nama_seksi LIKE '%bendahara%' OR t.created_by = ? OR t.is_umum = 1)";
      params.push(user.id);
    } else {
      // Ketua Panitia, Wakil Ketua, Pelindung, Penasihat
      if (seksiIdParam) {
        sql += " AND (t.seksi_id = ? OR t.is_umum = 1)";
        params.push(seksiIdParam);
      }
    }

    if (statusParam && VALID_STATUSES.includes(statusParam)) {
      sql += " AND t.status = ?";
      params.push(statusParam);
    }

    sql += " ORDER BY t.created_at DESC";

    const tugasList = await query(sql, params);
    const seksiList = await query("SELECT id, nama_seksi FROM seksi ORDER BY nama_seksi ASC");
    const panitiaList = await query("SELECT id, nama, jabatan, seksi_id FROM panitia ORDER BY nama ASC");

    // Summary statistics per seksi
    const progressStats = await query(`
      SELECT 
        s.id, s.nama_seksi,
        COUNT(t.id) as total,
        SUM(CASE WHEN t.status = 'Selesai' THEN 1 ELSE 0 END) as selesai,
        SUM(CASE WHEN t.status = 'Proses' THEN 1 ELSE 0 END) as proses,
        SUM(CASE WHEN t.status = 'Belum Mulai' THEN 1 ELSE 0 END) as belum_mulai
      FROM seksi s
      LEFT JOIN tugas t ON s.id = t.seksi_id
      GROUP BY s.id, s.nama_seksi
    `);

    return NextResponse.json({
      tugas: tugasList,
      seksi: seksiList,
      panitia: panitiaList,
      progressStats,
      userRole: user.role,
      userSeksiId: user.seksi_id || null,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Tugas API] GET Error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      let { seksi_id, target_role, nama_tugas, deskripsi, status, deadline, pj_id, foto_dokumentasi } = body;

      if (!nama_tugas) {
        return NextResponse.json({ error: "Nama tugas wajib diisi" }, { status: 400 });
      }

      // Enforce role constraints on creation
      if (user.role === ROLES.KOORDINATOR_SEKSI) {
        if (!user.seksi_id) {
          return NextResponse.json({ error: "Akun koordinator belum terhubung ke seksi" }, { status: 403 });
        }
        seksi_id = user.seksi_id;
        target_role = null;
      } else if (user.role === ROLES.SEKRETARIS) {
        if (!seksi_id) target_role = "sekretaris";
      } else if (user.role === ROLES.BENDAHARA) {
        if (!seksi_id) target_role = "bendahara";
      }

      // Auto-assign PJ to current user if not ketua/admin and pj_id was not explicitly passed
      if (!pj_id && !isKetuaRole(user.role, user.jabatan)) {
        const panitiaRow = await queryOne<{ id: string }>(
          "SELECT id FROM panitia WHERE user_id = ? OR nama = ? LIMIT 1",
          [user.id, user.nama]
        );
        if (panitiaRow) {
          pj_id = panitiaRow.id;
        }
      }

      const canCreateUmum = isKetuaRole(user.role, user.jabatan) || isWakilRole(user.role, user.jabatan) || user.role === ROLES.SEKRETARIS;
      const isUmumVal = canCreateUmum && body.is_umum ? 1 : 0;

      const taskStatus = status && VALID_STATUSES.includes(status) ? status : "Belum Mulai";
      const id = randomUUID();

      await execute(
        "INSERT INTO tugas (id, seksi_id, target_role, nama_tugas, deskripsi, status, deadline, pj_id, foto_dokumentasi, created_by, is_umum) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          id,
          seksi_id || null,
          target_role || null,
          nama_tugas,
          deskripsi || null,
          taskStatus,
          deadline || null,
          pj_id || null,
          foto_dokumentasi || null,
          user.id,
          isUmumVal,
        ]
      );

      return NextResponse.json({ success: true, id });
    }

    if (action === "update") {
      const { id, seksi_id, target_role, nama_tugas, deskripsi, status, deadline, pj_id, foto_dokumentasi } = body;
      if (!id || !nama_tugas) {
        return NextResponse.json({ error: "Data tugas tidak lengkap" }, { status: 400 });
      }

      const existing = await queryOne<{ id: string; seksi_id?: string; created_by?: string; is_umum?: number }>(
        "SELECT id, seksi_id, created_by, is_umum FROM tugas WHERE id = ?",
        [id]
      );

      if (!existing) {
        return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 });
      }

      // Permissions check
      if (user.role === ROLES.KOORDINATOR_SEKSI && existing.seksi_id !== user.seksi_id) {
        return NextResponse.json({ error: "Anda tidak berhak mengedit tugas seksi lain" }, { status: 403 });
      }

      const canEditUmum = isKetuaRole(user.role, user.jabatan) || isWakilRole(user.role, user.jabatan) || user.role === ROLES.SEKRETARIS;
      const isUmumVal = canEditUmum && body.is_umum !== undefined ? (body.is_umum ? 1 : 0) : (existing.is_umum || 0);
      const taskStatus = status && VALID_STATUSES.includes(status) ? status : "Belum Mulai";

      await execute(
        "UPDATE tugas SET seksi_id = ?, target_role = ?, nama_tugas = ?, deskripsi = ?, status = ?, deadline = ?, pj_id = ?, foto_dokumentasi = ?, is_umum = ? WHERE id = ?",
        [
          seksi_id || null,
          target_role || null,
          nama_tugas,
          deskripsi || null,
          taskStatus,
          deadline || null,
          pj_id || null,
          foto_dokumentasi || null,
          isUmumVal,
          id,
        ]
      );

      return NextResponse.json({ success: true });
    }

    if (action === "update_status") {
      const { id, status } = body;
      if (!id || !status) {
        return NextResponse.json({ error: "ID dan status tugas diperlukan" }, { status: 400 });
      }

      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: "Status tugas tidak valid" }, { status: 400 });
      }

      const existing = await queryOne<{ id: string; seksi_id?: string }>(
        "SELECT id, seksi_id FROM tugas WHERE id = ?",
        [id]
      );

      if (!existing) {
        return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 });
      }

      // Pengubahan status tugas boleh siapa saja dan tersinkron ke semua halaman
      await execute("UPDATE tugas SET status = ? WHERE id = ?", [status, id]);
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "ID tugas diperlukan" }, { status: 400 });

      const existing = await queryOne<{ id: string; seksi_id?: string; created_by?: string }>(
        "SELECT id, seksi_id, created_by FROM tugas WHERE id = ?",
        [id]
      );

      if (!existing) {
        return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 });
      }

      if (user.role === ROLES.KOORDINATOR_SEKSI && existing.seksi_id !== user.seksi_id) {
        return NextResponse.json({ error: "Anda tidak berhak menghapus tugas seksi lain" }, { status: 403 });
      }

      await execute("DELETE FROM tugas WHERE id = ?", [id]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Action tidak dikenal" }, { status: 400 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Tugas API] POST Error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
