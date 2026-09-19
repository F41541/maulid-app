import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { requireAuth, ROLES } from "@/lib/auth";
import { randomUUID } from "node:crypto";
import { RabItem, RabSeksiGroup } from "@/types";

export async function GET(req: NextRequest) {
  try {
    await requireAuth([ROLES.KETUA_PANITIA, ROLES.WAKIL_KETUA, ROLES.BENDAHARA]);

    const seksiId = req.nextUrl.searchParams.get("seksi_id");
    const q = req.nextUrl.searchParams.get("q")?.trim();

    let sql = `
      SELECT r.id, r.seksi_id, r.nama_item, r.volume, r.satuan, r.harga_satuan, 
             r.total_estimasi, r.catatan, r.created_by, r.created_at, r.updated_at,
             s.nama_seksi
      FROM rab r
      LEFT JOIN seksi s ON r.seksi_id = s.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (seksiId === "umum") {
      sql += " AND r.seksi_id IS NULL";
    } else if (seksiId && seksiId !== "all") {
      sql += " AND r.seksi_id = ?";
      params.push(seksiId);
    }

    if (q) {
      sql += " AND (r.nama_item LIKE ? OR r.catatan LIKE ?)";
      params.push(`%${q}%`, `%${q}%`);
    }

    sql += " ORDER BY COALESCE(s.nama_seksi, 'ZZZ') ASC, r.created_at ASC";

    const rows = await query<RabItem>(sql, params);

    // List all seksi for filter dropdown & form
    const seksiList = await query<{ id: string; nama_seksi: string }>(
      "SELECT id, nama_seksi FROM seksi ORDER BY nama_seksi ASC"
    );

    // Calculate overall aggregates
    const totalAnggaran = rows.reduce((sum, item) => sum + Number(item.total_estimasi || 0), 0);
    const totalItem = rows.length;

    // Group items by seksi
    const groupMap = new Map<string, RabSeksiGroup>();

    // Initialize all existing seksi in groups if no specific filter is active
    if (!seksiId || seksiId === "all") {
      for (const s of seksiList) {
        groupMap.set(s.id, {
          seksi_id: s.id,
          nama_seksi: s.nama_seksi,
          items: [],
          subtotal: 0,
          total_items: 0,
        });
      }
    }

    // Populate items into their groups
    for (const item of rows) {
      const key = item.seksi_id || "umum";
      const groupName = item.nama_seksi || "Umum / Kepanitiaan";

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          seksi_id: item.seksi_id,
          nama_seksi: groupName,
          items: [],
          subtotal: 0,
          total_items: 0,
        });
      }

      const grp = groupMap.get(key)!;
      grp.items.push(item);
      grp.subtotal += Number(item.total_estimasi || 0);
      grp.total_items += 1;
    }

    // Convert map to array; filter out empty groups if search query is active
    let groups = Array.from(groupMap.values());
    if (q) {
      groups = groups.filter((g) => g.items.length > 0);
    }

    // Distinct count of seksi with at least one item
    const seksiWithItems = new Set(rows.map((r) => r.seksi_id || "umum"));

    return NextResponse.json({
      items: rows,
      groups,
      ringkasan: {
        totalAnggaran,
        totalItem,
        seksiCount: seksiWithItems.size,
      },
      seksiList,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Hanya Ketua Panitia, Wakil Ketua, atau Bendahara yang dapat mengakses RAB" },
        { status: 403 }
      );
    }
    console.error("[RAB API] GET Error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server saat memuat data RAB" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth([ROLES.KETUA_PANITIA, ROLES.WAKIL_KETUA, ROLES.BENDAHARA]);
    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { seksi_id, nama_item, volume, satuan, harga_satuan, catatan } = body;

      if (!nama_item || !nama_item.trim()) {
        return NextResponse.json({ error: "Nama kebutuhan / uraian wajib diisi" }, { status: 400 });
      }

      const parsedVolume = Math.round(parseFloat(volume) * 100) / 100;
      if (isNaN(parsedVolume) || parsedVolume <= 0) {
        return NextResponse.json({ error: "Volume kuantitas harus angka valid lebih dari 0" }, { status: 400 });
      }

      const parsedHarga = parseInt(harga_satuan, 10);
      if (isNaN(parsedHarga) || parsedHarga < 0) {
        return NextResponse.json({ error: "Harga satuan harus angka valid tidak boleh negatif" }, { status: 400 });
      }

      const cleanSatuan = (satuan || "pcs").trim();
      const totalEstimasi = Math.round(parsedVolume * parsedHarga);
      const id = randomUUID();
      const targetSeksiId = seksi_id && seksi_id !== "umum" ? seksi_id : null;

      await execute(
        `INSERT INTO rab (id, seksi_id, nama_item, volume, satuan, harga_satuan, total_estimasi, catatan, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          targetSeksiId,
          nama_item.trim(),
          parsedVolume,
          cleanSatuan,
          parsedHarga,
          totalEstimasi,
          catatan ? catatan.trim() : null,
          user.id,
        ]
      );

      return NextResponse.json({ success: true, id });
    }

    if (action === "update") {
      const { id, seksi_id, nama_item, volume, satuan, harga_satuan, catatan } = body;

      if (!id) {
        return NextResponse.json({ error: "ID RAB wajib disertakan" }, { status: 400 });
      }

      if (!nama_item || !nama_item.trim()) {
        return NextResponse.json({ error: "Nama kebutuhan / uraian wajib diisi" }, { status: 400 });
      }

      const parsedVolume = Math.round(parseFloat(volume) * 100) / 100;
      if (isNaN(parsedVolume) || parsedVolume <= 0) {
        return NextResponse.json({ error: "Volume kuantitas harus angka valid lebih dari 0" }, { status: 400 });
      }

      const parsedHarga = parseInt(harga_satuan, 10);
      if (isNaN(parsedHarga) || parsedHarga < 0) {
        return NextResponse.json({ error: "Harga satuan harus angka valid tidak boleh negatif" }, { status: 400 });
      }

      const cleanSatuan = (satuan || "pcs").trim();
      const totalEstimasi = Math.round(parsedVolume * parsedHarga);
      const targetSeksiId = seksi_id && seksi_id !== "umum" ? seksi_id : null;

      const result = await execute(
        `UPDATE rab 
         SET seksi_id = ?, nama_item = ?, volume = ?, satuan = ?, harga_satuan = ?, total_estimasi = ?, catatan = ?
         WHERE id = ?`,
        [
          targetSeksiId,
          nama_item.trim(),
          parsedVolume,
          cleanSatuan,
          parsedHarga,
          totalEstimasi,
          catatan ? catatan.trim() : null,
          id,
        ]
      );

      if (result.affectedRows === 0) {
        return NextResponse.json({ error: "Item RAB tidak ditemukan" }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const { id } = body;

      if (!id) {
        return NextResponse.json({ error: "ID RAB wajib disertakan" }, { status: 400 });
      }

      const result = await execute("DELETE FROM rab WHERE id = ?", [id]);

      if (result.affectedRows === 0) {
        return NextResponse.json({ error: "Item RAB tidak ditemukan" }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Aksi tidak dikenali" }, { status: 400 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Hanya Ketua Panitia, Wakil Ketua, atau Bendahara yang dapat mengelola data RAB" },
        { status: 403 }
      );
    }
    console.error("[RAB API] POST Error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server saat menyimpan data RAB" }, { status: 500 });
  }
}
