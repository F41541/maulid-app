import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { requireAuth, ROLES } from "@/lib/auth";
import { randomUUID } from "node:crypto";
import { RabWadah, RabItemDetail, RabRingkasanGlobal } from "@/types";

export async function GET(req: NextRequest) {
  try {
    await requireAuth([ROLES.KETUA_PANITIA, ROLES.WAKIL_KETUA, ROLES.BENDAHARA]);

    const q = req.nextUrl.searchParams.get("q")?.trim();

    // 1. Fetch all Wadah RAB
    let sqlWadah = "SELECT * FROM rab WHERE 1=1";
    const paramsWadah: unknown[] = [];
    if (q) {
      sqlWadah += " AND (nama_anggaran LIKE ? OR catatan LIKE ?)";
      paramsWadah.push(`%${q}%`, `%${q}%`);
    }
    sqlWadah += " ORDER BY created_at ASC";
    const wadahRows = await query<{
      id: string;
      nama_anggaran: string;
      catatan: string | null;
      created_at: string;
      updated_at: string;
    }>(sqlWadah, paramsWadah);

    // 2. Fetch all Items under all Wadah
    const itemRows = await query<RabItemDetail>(
      "SELECT * FROM rab_items ORDER BY created_at ASC"
    );

    // 3. Fetch Realization from Keuangan for each Wadah
    const realisasiRows = await query<{ rab_id: string; total_realisasi: number }>(`
      SELECT rab_id, COALESCE(SUM(nominal), 0) as total_realisasi
      FROM keuangan
      WHERE tipe = 'keluar' AND (status IS NULL OR status = 'aktif') AND rab_id IS NOT NULL
      GROUP BY rab_id
    `);

    const realisasiMap = new Map<string, number>();
    for (const r of realisasiRows) {
      realisasiMap.set(r.rab_id, Number(r.total_realisasi || 0));
    }

    // Group items by rab_id
    const itemMap = new Map<string, RabItemDetail[]>();
    for (const item of itemRows) {
      if (!itemMap.has(item.rab_id)) {
        itemMap.set(item.rab_id, []);
      }
      itemMap.get(item.rab_id)!.push(item);
    }

    // 4. Assemble Wadah with Items and Calculations
    let totalRencanaGlobal = 0;
    let totalRealisasiGlobal = 0;

    const wadahList: RabWadah[] = wadahRows.map((w) => {
      const items = itemMap.get(w.id) || [];
      const total_rencana = items.reduce(
        (sum, it) => sum + Number(it.total_estimasi || 0),
        0
      );
      const total_realisasi = realisasiMap.get(w.id) || 0;
      const sisa_anggaran = total_rencana - total_realisasi;
      const persentase_realisasi =
        total_rencana > 0
          ? Math.round((total_realisasi / total_rencana) * 100)
          : 0;

      totalRencanaGlobal += total_rencana;
      totalRealisasiGlobal += total_realisasi;

      return {
        id: w.id,
        nama_anggaran: w.nama_anggaran,
        catatan: w.catatan,
        total_rencana,
        total_realisasi,
        sisa_anggaran,
        persentase_realisasi,
        items_count: items.length,
        items,
        created_at: w.created_at,
        updated_at: w.updated_at,
      };
    });

    const ringkasan: RabRingkasanGlobal = {
      totalRencana: totalRencanaGlobal,
      totalRealisasi: totalRealisasiGlobal,
      sisaAnggaran: totalRencanaGlobal - totalRealisasiGlobal,
      persentaseRealisasi:
        totalRencanaGlobal > 0
          ? Math.round((totalRealisasiGlobal / totalRencanaGlobal) * 100)
          : 0,
      totalWadah: wadahList.length,
      totalItems: itemRows.length,
    };

    return NextResponse.json({
      wadah: wadahList,
      ringkasan,
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
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat memuat data RAB" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth([
      ROLES.KETUA_PANITIA,
      ROLES.WAKIL_KETUA,
      ROLES.BENDAHARA,
    ]);
    const body = await req.json();
    const { action } = body;

    // 1. Create Anggaran
    if (action === "create_wadah") {
      const { nama_anggaran, catatan } = body;
      if (!nama_anggaran || !nama_anggaran.trim()) {
        return NextResponse.json(
          { error: "Judul anggaran wajib diisi" },
          { status: 400 }
        );
      }

      const id = randomUUID();
      await execute(
        `INSERT INTO rab (id, nama_anggaran, catatan, created_by) VALUES (?, ?, ?, ?)`,
        [id, nama_anggaran.trim(), catatan ? catatan.trim() : null, user.id]
      );

      return NextResponse.json({ success: true, id });
    }

    // 2. Update Anggaran
    if (action === "update_wadah") {
      const { id, nama_anggaran, catatan } = body;
      if (!id || !nama_anggaran || !nama_anggaran.trim()) {
        return NextResponse.json(
          { error: "ID dan judul anggaran wajib diisi" },
          { status: 400 }
        );
      }

      const res = await execute(
        `UPDATE rab SET nama_anggaran = ?, catatan = ? WHERE id = ?`,
        [nama_anggaran.trim(), catatan ? catatan.trim() : null, id]
      );

      if (res.affectedRows === 0) {
        return NextResponse.json(
          { error: "Anggaran tidak ditemukan" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // 3. Delete Anggaran with Protection
    if (action === "delete_wadah") {
      const { id } = body;
      if (!id) {
        return NextResponse.json(
          { error: "ID anggaran wajib disertakan" },
          { status: 400 }
        );
      }

      // Check if any active/recorded cash transaction uses this wadah
      const linked = await query<{ count: number }>(
        "SELECT COUNT(*) as count FROM keuangan WHERE rab_id = ?",
        [id]
      );
      const count = Number(linked[0]?.count || 0);

      if (count > 0) {
        return NextResponse.json(
          {
            error: `Anggaran tidak dapat dihapus karena sudah memiliki ${count} catatan transaksi pengeluaran kas. Ubah atau batalkan transaksi kas tersebut terlebih dahulu.`,
          },
          { status: 400 }
        );
      }

      const res = await execute("DELETE FROM rab WHERE id = ?", [id]);
      if (res.affectedRows === 0) {
        return NextResponse.json(
          { error: "Anggaran tidak ditemukan" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // 4. Create Detail Item under a Wadah
    if (action === "create_item") {
      const { rab_id, nama_item, volume, satuan, harga_satuan, catatan } = body;

      if (!rab_id) {
        return NextResponse.json(
          { error: "Anggaran (rab_id) wajib ditentukan" },
          { status: 400 }
        );
      }

      if (!nama_item || !nama_item.trim()) {
        return NextResponse.json(
          { error: "Nama kebutuhan / uraian wajib diisi" },
          { status: 400 }
        );
      }

      const parsedVolume = parseFloat(volume);
      if (isNaN(parsedVolume) || parsedVolume <= 0) {
        return NextResponse.json(
          { error: "Volume kuantitas harus angka valid lebih dari 0" },
          { status: 400 }
        );
      }

      const parsedHarga = parseInt(harga_satuan, 10);
      if (isNaN(parsedHarga) || parsedHarga < 0) {
        return NextResponse.json(
          { error: "Harga satuan harus angka valid tidak boleh negatif" },
          { status: 400 }
        );
      }

      const cleanSatuan = (satuan || "pcs").trim();
      const totalEstimasi = Math.round(parsedVolume * parsedHarga);
      const id = randomUUID();

      await execute(
        `INSERT INTO rab_items (id, rab_id, nama_item, volume, satuan, harga_satuan, total_estimasi, catatan)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          rab_id,
          nama_item.trim(),
          parsedVolume,
          cleanSatuan,
          parsedHarga,
          totalEstimasi,
          catatan ? catatan.trim() : null,
        ]
      );

      return NextResponse.json({ success: true, id });
    }

    // 5. Update Detail Item
    if (action === "update_item") {
      const { id, nama_item, volume, satuan, harga_satuan, catatan } = body;

      if (!id) {
        return NextResponse.json(
          { error: "ID rincian kebutuhan wajib disertakan" },
          { status: 400 }
        );
      }

      if (!nama_item || !nama_item.trim()) {
        return NextResponse.json(
          { error: "Nama kebutuhan / uraian wajib diisi" },
          { status: 400 }
        );
      }

      const parsedVolume = parseFloat(volume);
      if (isNaN(parsedVolume) || parsedVolume <= 0) {
        return NextResponse.json(
          { error: "Volume kuantitas harus angka valid lebih dari 0" },
          { status: 400 }
        );
      }

      const parsedHarga = parseInt(harga_satuan, 10);
      if (isNaN(parsedHarga) || parsedHarga < 0) {
        return NextResponse.json(
          { error: "Harga satuan harus angka valid tidak boleh negatif" },
          { status: 400 }
        );
      }

      const cleanSatuan = (satuan || "pcs").trim();
      const totalEstimasi = Math.round(parsedVolume * parsedHarga);

      const res = await execute(
        `UPDATE rab_items 
         SET nama_item = ?, volume = ?, satuan = ?, harga_satuan = ?, total_estimasi = ?, catatan = ?
         WHERE id = ?`,
        [
          nama_item.trim(),
          parsedVolume,
          cleanSatuan,
          parsedHarga,
          totalEstimasi,
          catatan ? catatan.trim() : null,
          id,
        ]
      );

      if (res.affectedRows === 0) {
        return NextResponse.json(
          { error: "Rincian kebutuhan tidak ditemukan" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // 6. Delete Detail Item
    if (action === "delete_item") {
      const { id } = body;
      if (!id) {
        return NextResponse.json(
          { error: "ID rincian kebutuhan wajib disertakan" },
          { status: 400 }
        );
      }

      const res = await execute("DELETE FROM rab_items WHERE id = ?", [id]);
      if (res.affectedRows === 0) {
        return NextResponse.json(
          { error: "Rincian kebutuhan tidak ditemukan" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // 7. Reset RAB Data (Sesuai Permintaan User untuk reset bersih)
    if (action === "reset_rab") {
      await execute("UPDATE keuangan SET rab_id = NULL WHERE rab_id IS NOT NULL");
      await execute("DELETE FROM rab_items");
      await execute("DELETE FROM rab");
      return NextResponse.json({ success: true, message: "Data RAB berhasil direset" });
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
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat memproses data RAB" },
      { status: 500 }
    );
  }
}
