import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute, withTransaction } from "@/lib/db";
import { requireAuth, ROLES } from "@/lib/auth";
import { getTodayString } from "@/lib/format";
import { randomUUID } from "node:crypto";

export async function GET(req: NextRequest) {
  try {
    await requireAuth([ROLES.KETUA_PANITIA, ROLES.WAKIL_KETUA, ROLES.BENDAHARA]);

    const tipe = req.nextUrl.searchParams.get("tipe"); // masuk | keluar | all
    const metode = req.nextUrl.searchParams.get("metode"); // cash | transfer | all
    const status = req.nextUrl.searchParams.get("status"); // aktif | void | all
    const startDate = req.nextUrl.searchParams.get("startDate"); // YYYY-MM-DD
    const endDate = req.nextUrl.searchParams.get("endDate"); // YYYY-MM-DD

    let sql = `
      SELECT k.*, r.nama_anggaran
      FROM keuangan k
      LEFT JOIN rab r ON k.rab_id = r.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (tipe && tipe !== "all") {
      sql += " AND k.tipe = ?";
      params.push(tipe);
    }

    if (metode && metode !== "all") {
      sql += " AND k.metode = ?";
      params.push(metode);
    }

    if (status === "aktif") {
      sql += " AND (k.status IS NULL OR k.status = 'aktif')";
    } else if (status === "void") {
      sql += " AND (k.status = 'void' OR k.status = 'reversal')";
    }

    if (startDate) {
      sql += " AND k.tanggal >= ?";
      params.push(startDate);
    }

    if (endDate) {
      sql += " AND k.tanggal <= ?";
      params.push(endDate);
    }

    sql += " ORDER BY k.tanggal DESC, k.created_at DESC";

    const transaksi = await query(sql, params);

    // Saldo per kanal kas aktif (hanya transaksi berstatus aktif)
    const channelAgg = await queryOne<{
      cash_masuk: number;
      cash_keluar: number;
      tf_masuk: number;
      tf_keluar: number;
      omset_masuk: number;
      omset_keluar: number;
    }>(`
      SELECT
        COALESCE(SUM(CASE WHEN metode = 'cash' AND tipe = 'masuk' AND (status IS NULL OR status = 'aktif') THEN nominal ELSE 0 END), 0) as cash_masuk,
        COALESCE(SUM(CASE WHEN metode = 'cash' AND tipe = 'keluar' AND (status IS NULL OR status = 'aktif') THEN nominal ELSE 0 END), 0) as cash_keluar,
        COALESCE(SUM(CASE WHEN metode = 'transfer' AND tipe = 'masuk' AND (status IS NULL OR status = 'aktif') THEN nominal ELSE 0 END), 0) as tf_masuk,
        COALESCE(SUM(CASE WHEN metode = 'transfer' AND tipe = 'keluar' AND (status IS NULL OR status = 'aktif') THEN nominal ELSE 0 END), 0) as tf_keluar,
        -- Omset murni (tanpa mutasi_internal dan tanpa void)
        COALESCE(SUM(CASE WHEN tipe = 'masuk' AND (kategori IS NULL OR kategori != 'mutasi_internal') AND (status IS NULL OR status = 'aktif') THEN nominal ELSE 0 END), 0) as omset_masuk,
        COALESCE(SUM(CASE WHEN tipe = 'keluar' AND (kategori IS NULL OR kategori != 'mutasi_internal') AND (status IS NULL OR status = 'aktif') THEN nominal ELSE 0 END), 0) as omset_keluar
      FROM keuangan
    `);

    const cashMasuk = Number(channelAgg?.cash_masuk || 0);
    const cashKeluar = Number(channelAgg?.cash_keluar || 0);
    const saldoCash = cashMasuk - cashKeluar;

    const transferMasuk = Number(channelAgg?.tf_masuk || 0);
    const transferKeluar = Number(channelAgg?.tf_keluar || 0);
    const saldoRekening = transferMasuk - transferKeluar;

    const totalMasuk = Number(channelAgg?.omset_masuk || 0);
    const totalKeluar = Number(channelAgg?.omset_keluar || 0);
    const saldoTotal = saldoCash + saldoRekening;

    return NextResponse.json({
      transaksi,
      ringkasan: {
        totalMasuk,
        totalKeluar,
        saldoTotal,
        cashMasuk,
        cashKeluar,
        saldoCash,
        transferMasuk,
        transferKeluar,
        saldoRekening,
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Hanya Bendahara, Ketua, atau Wakil yang dapat mengakses keuangan" }, { status: 403 });
    }
    console.error("[Keuangan API] GET Error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth([ROLES.KETUA_PANITIA, ROLES.WAKIL_KETUA, ROLES.BENDAHARA]);
    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { tipe, tanggal, keterangan, nominal, metode, rab_id } = body;
      if (!tipe || !tanggal || !keterangan || nominal === undefined || nominal === null) {
        return NextResponse.json({ error: "Lengkapi semua isian keuangan" }, { status: 400 });
      }

      if (!["masuk", "keluar"].includes(tipe)) {
        return NextResponse.json({ error: "Tipe transaksi harus 'masuk' atau 'keluar'" }, { status: 400 });
      }

      const parsedNominal = parseInt(nominal, 10);
      if (isNaN(parsedNominal) || parsedNominal <= 0) {
        return NextResponse.json({ error: "Nominal harus angka valid lebih dari 0" }, { status: 400 });
      }

      const selectedMetode = metode === "transfer" ? "transfer" : "cash";
      const selectedRabId = tipe === "keluar" && rab_id ? rab_id : null;
      const id = randomUUID();

      if (tipe === "keluar") {
        let errorResponse: NextResponse | null = null;
        await withTransaction(async (conn) => {
          const [rows] = (await conn.query(
            `SELECT COALESCE(SUM(CASE WHEN tipe = 'masuk' THEN nominal ELSE -nominal END), 0) as saldo
             FROM keuangan
             WHERE metode = ? AND (status IS NULL OR status = 'aktif') FOR UPDATE`,
            [selectedMetode]
          )) as any;
          const currentSaldo = Number(rows[0]?.saldo || 0);
          const labelMetode = selectedMetode === "cash" ? "Dompet (Cash)" : "Rekening Bank";
          if (currentSaldo < parsedNominal) {
            errorResponse = NextResponse.json(
              { error: `Saldo ${labelMetode} tidak mencukupi untuk pengeluaran ini (sisa: Rp ${currentSaldo.toLocaleString("id-ID")})` },
              { status: 400 }
            );
            throw new Error("INSUFFICIENT_BALANCE");
          }
          await conn.execute(
            "INSERT INTO keuangan (id, tipe, tanggal, keterangan, nominal, metode, status, rab_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [id, tipe, tanggal, keterangan, parsedNominal, selectedMetode, "aktif", selectedRabId]
          );
        }).catch((err) => {
          if (err.message !== "INSUFFICIENT_BALANCE") throw err;
        });

        if (errorResponse) return errorResponse;
        return NextResponse.json({ success: true, id });
      } else {
        await execute(
          "INSERT INTO keuangan (id, tipe, tanggal, keterangan, nominal, metode, status, rab_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [id, tipe, tanggal, keterangan, parsedNominal, selectedMetode, "aktif", null]
        );
        return NextResponse.json({ success: true, id });
      }
    }

    // Mutasi internal saldo: Dompet (Cash) <-> Rekening (Transfer)
    if (action === "mutasi_internal" || action === "mutasi") {
      const { dari, ke, nominal, tanggal, catatan } = body;
      if (!dari || !ke || !nominal || !tanggal) {
        return NextResponse.json({ error: "Data mutasi kas tidak lengkap" }, { status: 400 });
      }

      if (dari === ke) {
        return NextResponse.json({ error: "Sumber dan tujuan mutasi tidak boleh sama" }, { status: 400 });
      }

      if (!["cash", "transfer"].includes(dari) || !["cash", "transfer"].includes(ke)) {
        return NextResponse.json({ error: "Kanal kas tidak valid" }, { status: 400 });
      }

      const parsedNominal = parseInt(nominal, 10);
      if (isNaN(parsedNominal) || parsedNominal <= 0) {
        return NextResponse.json({ error: "Nominal mutasi harus lebih dari 0" }, { status: 400 });
      }

      const labelDari = dari === "cash" ? "Dompet (Cash)" : "Rekening Bank";
      const labelKe = ke === "cash" ? "Dompet (Cash)" : "Rekening Bank";

      const pairId = randomUUID();
      const idKeluar = randomUUID();
      const idMasuk = randomUUID();

      const keteranganKeluar = `Mutasi Pindah Dana ke ${labelKe}${catatan ? ` - ${catatan}` : ""}`;
      const keteranganMasuk = `Mutasi Terima Dana dari ${labelDari}${catatan ? ` - ${catatan}` : ""}`;

      let errorResponse: NextResponse | null = null;
      await withTransaction(async (conn) => {
        // Validasi kecukupan saldo sumber dengan FOR UPDATE locking
        const [rows] = (await conn.query(
          `SELECT COALESCE(SUM(CASE WHEN tipe = 'masuk' THEN nominal ELSE -nominal END), 0) as saldo
           FROM keuangan
           WHERE metode = ? AND (status IS NULL OR status = 'aktif') FOR UPDATE`,
          [dari]
        )) as any;

        const sourceSaldo = Number(rows[0]?.saldo || 0);
        if (sourceSaldo < parsedNominal) {
          errorResponse = NextResponse.json(
            { error: `Saldo ${labelDari} tidak mencukupi (sisa: Rp ${sourceSaldo.toLocaleString("id-ID")})` },
            { status: 400 }
          );
          throw new Error("INSUFFICIENT_BALANCE");
        }

        // 1. Catat kas keluar dari sumber
        await conn.execute(
          "INSERT INTO keuangan (id, tipe, tanggal, keterangan, nominal, metode, kategori, status, pair_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [idKeluar, "keluar", tanggal, keteranganKeluar, parsedNominal, dari, "mutasi_internal", "aktif", pairId]
        );

        // 2. Catat kas masuk ke tujuan
        await conn.execute(
          "INSERT INTO keuangan (id, tipe, tanggal, keterangan, nominal, metode, kategori, status, pair_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [idMasuk, "masuk", tanggal, keteranganMasuk, parsedNominal, ke, "mutasi_internal", "aktif", pairId]
        );
      }).catch((err) => {
        if (err.message !== "INSUFFICIENT_BALANCE") throw err;
      });

      if (errorResponse) return errorResponse;
      return NextResponse.json({ success: true, pairId });
    }

    // Sistem Void (Pembatalan Transaksi Audit Trail)
    if (action === "void" || action === "delete") {
      const { id, reason } = body;
      if (!id) return NextResponse.json({ error: "ID transaksi diperlukan" }, { status: 400 });

      const voidReason = reason?.trim() || "Pembatalan oleh bendahara/admin";

      const tx = await queryOne<{
        id: string;
        tipe: "masuk" | "keluar";
        tanggal: string;
        keterangan: string;
        nominal: number;
        metode: string;
        kategori?: string;
        status: string;
        pair_id?: string;
      }>("SELECT * FROM keuangan WHERE id = ?", [id]);

      if (!tx) {
        return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
      }

      if (tx.status === "void" || tx.status === "reversal") {
        return NextResponse.json({ error: "Transaksi sudah dibatalkan sebelumnya" }, { status: 400 });
      }

      const actorName = user.nama || user.username;
      const today = getTodayString();

      let errorResponse: NextResponse | null = null;
      await withTransaction(async (conn) => {
        // Jika ini bagian dari mutasi internal berpasangan
        if (tx.pair_id) {
          const [pairs] = (await conn.query(
            "SELECT * FROM keuangan WHERE pair_id = ? AND (status IS NULL OR status = 'aktif') FOR UPDATE",
            [tx.pair_id]
          )) as any;

          const pairList = (pairs as Array<{
            id: string;
            tipe: "masuk" | "keluar";
            keterangan: string;
            nominal: number;
            metode: string;
            kategori: string;
          }>) || [];

          // Cek defisit pada kanal yang menerima dana (masuk) jika mutasi dibatalkan
          const incomingItem = pairList.find((p) => p.tipe === "masuk");
          if (incomingItem) {
            const [rows] = (await conn.query(
              `SELECT COALESCE(SUM(CASE WHEN tipe = 'masuk' THEN nominal ELSE -nominal END), 0) as saldo
               FROM keuangan
               WHERE metode = ? AND (status IS NULL OR status = 'aktif') FOR UPDATE`,
              [incomingItem.metode]
            )) as any;
            const currentSaldo = Number(rows[0]?.saldo || 0);
            const labelMetode = incomingItem.metode === "cash" ? "Dompet (Cash)" : "Rekening Bank";
            if (currentSaldo < incomingItem.nominal) {
              errorResponse = NextResponse.json(
                {
                  error: `Pembatalan mutasi ditolak: Saldo ${labelMetode} tidak mencukupi (sisa: Rp ${currentSaldo.toLocaleString("id-ID")}, dibutuhkan: Rp ${incomingItem.nominal.toLocaleString("id-ID")}) dan akan menyebabkan saldo minus/defisit.`,
                },
                { status: 400 }
              );
              throw new Error("INSUFFICIENT_BALANCE");
            }
          }

          for (const item of pairList) {
            // Tandai void
            await conn.execute(
              "UPDATE keuangan SET status = 'void', void_reason = ?, void_by = ?, void_at = NOW() WHERE id = ?",
              [voidReason, actorName, item.id]
            );

            // Tulis transaksi pembalik (reversal)
            const reversalId = randomUUID();
            const reversalTipe = item.tipe === "masuk" ? "keluar" : "masuk";
            const reversalKet = `[VOID] Pembalik ${item.keterangan} (Alasan: ${voidReason})`;

            await conn.execute(
              "INSERT INTO keuangan (id, tipe, tanggal, keterangan, nominal, metode, kategori, status, void_ref_id, pair_id) VALUES (?, ?, ?, ?, ?, ?, ?, 'reversal', ?, ?)",
              [reversalId, reversalTipe, today, reversalKet, item.nominal, item.metode, item.kategori, item.id, tx.pair_id]
            );
          }
        } else {
          // Transaksi tunggal
          // Jika membatalkan pemasukan, cek apakah saldo saat ini mencukupi agar tidak defisit
          if (tx.tipe === "masuk") {
            const [rows] = (await conn.query(
              `SELECT COALESCE(SUM(CASE WHEN tipe = 'masuk' THEN nominal ELSE -nominal END), 0) as saldo
               FROM keuangan
               WHERE metode = ? AND (status IS NULL OR status = 'aktif') FOR UPDATE`,
              [tx.metode]
            )) as any;
            const currentSaldo = Number(rows[0]?.saldo || 0);
            const labelMetode = tx.metode === "cash" ? "Dompet (Cash)" : "Rekening Bank";
            if (currentSaldo < tx.nominal) {
              errorResponse = NextResponse.json(
                {
                  error: `Pembatalan pemasukan ditolak: Saldo ${labelMetode} tidak mencukupi (sisa: Rp ${currentSaldo.toLocaleString("id-ID")}, dibutuhkan: Rp ${tx.nominal.toLocaleString("id-ID")}) dan akan menyebabkan saldo minus/defisit.`,
                },
                { status: 400 }
              );
              throw new Error("INSUFFICIENT_BALANCE");
            }
          }

          await conn.execute(
            "UPDATE keuangan SET status = 'void', void_reason = ?, void_by = ?, void_at = NOW() WHERE id = ?",
            [voidReason, actorName, tx.id]
          );

          // Tulis transaksi pembalik
          const reversalId = randomUUID();
          const reversalTipe = tx.tipe === "masuk" ? "keluar" : "masuk";
          const reversalKet = `[VOID] Pembatalan Transaksi #${tx.id.slice(0, 8)} - ${tx.keterangan} (Alasan: ${voidReason})`;

          await conn.execute(
            "INSERT INTO keuangan (id, tipe, tanggal, keterangan, nominal, metode, kategori, status, void_ref_id) VALUES (?, ?, ?, ?, ?, ?, ?, 'reversal', ?)",
            [reversalId, reversalTipe, today, reversalKet, tx.nominal, tx.metode, tx.kategori || null, tx.id]
          );
        }
      }).catch((err) => {
        if (err.message !== "INSUFFICIENT_BALANCE") throw err;
      });

      if (errorResponse) return errorResponse;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Action tidak dikenal" }, { status: 400 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Hanya Bendahara, Ketua, atau Wakil yang dapat mengubah data keuangan" }, { status: 403 });
    }
    console.error("[Keuangan API] POST Error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
