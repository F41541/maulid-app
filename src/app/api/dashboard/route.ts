import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { requireAuth, ROLES } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();

    // 1. Total panitia & tamu
    const panitiaRow = await queryOne<{ count: number }>("SELECT COUNT(*) as count FROM panitia");
    const totalPanitia = Number(panitiaRow?.count || 0);

    const seksiRow = await queryOne<{ count: number }>("SELECT COUNT(*) as count FROM seksi");
    const totalSeksi = Number(seksiRow?.count || 0);

    const tamuRow = await queryOne<{ count: number }>("SELECT COUNT(*) as count FROM tamu");
    const totalTamu = Number(tamuRow?.count || 0);

    const tamuHadirRow = await queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM tamu WHERE kehadiran = 'Hadir'"
    );
    const tamuHadir = Number(tamuHadirRow?.count || 0);

    // 2. Progress tugas (disesuaikan jika koordinator seksi)
    let taskStatsQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Selesai' THEN 1 ELSE 0 END) as selesai,
        SUM(CASE WHEN status = 'Proses' THEN 1 ELSE 0 END) as proses,
        SUM(CASE WHEN status = 'Belum Mulai' THEN 1 ELSE 0 END) as belum_mulai
      FROM tugas
    `;
    const taskStatsParams: string[] = [];

    if (user.role === ROLES.KOORDINATOR_SEKSI && user.seksi_id) {
      taskStatsQuery += " WHERE (seksi_id = ? OR is_umum = 1)";
      taskStatsParams.push(user.seksi_id);
    }

    const taskStats = await queryOne<{
      total: number;
      selesai: number;
      proses: number;
      belum_mulai: number;
    }>(taskStatsQuery, taskStatsParams);

    const totalTugas = Number(taskStats?.total || 0);
    const tugasSelesai = Number(taskStats?.selesai || 0);
    const persentaseTugas = totalTugas > 0 ? Math.round((tugasSelesai / totalTugas) * 100) : 0;

    // 3. Keuangan Murni & Saldo Kanal (Hanya transaksi aktif)
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
        -- Omset murni tanpa mutasi internal
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
    const saldoKas = saldoCash + saldoRekening;

    // 4. Preview rundown
    const rundownPreview = await query("SELECT * FROM rundown ORDER BY urutan ASC");

    // 5. Tugas mendesak (disesuaikan jika koordinator seksi & tugas untuk semua)
    let urgentQuery = `
      SELECT t.*, s.nama_seksi, p.nama as pj_nama
      FROM tugas t
      LEFT JOIN seksi s ON t.seksi_id = s.id
      LEFT JOIN panitia p ON t.pj_id = p.id
      WHERE t.status != 'Selesai'
    `;
    const urgentParams: string[] = [];

    if (user.role === ROLES.KOORDINATOR_SEKSI && user.seksi_id) {
      urgentQuery += " AND (t.seksi_id = ? OR t.is_umum = 1)";
      urgentParams.push(user.seksi_id);
    } else if (user.role === ROLES.SEKRETARIS) {
      urgentQuery += " AND (t.target_role = 'sekretaris' OR s.nama_seksi LIKE '%sekretariat%' OR t.created_by = ? OR t.is_umum = 1)";
      urgentParams.push(user.id);
    } else if (user.role === ROLES.BENDAHARA) {
      urgentQuery += " AND (t.target_role = 'bendahara' OR s.nama_seksi LIKE '%bendahara%' OR t.created_by = ? OR t.is_umum = 1)";
      urgentParams.push(user.id);
    }

    urgentQuery += `
      ORDER BY 
        CASE WHEN t.deadline IS NOT NULL AND t.deadline != '' THEN 0 ELSE 1 END,
        t.deadline ASC, t.created_at DESC
      LIMIT 5
    `;

    const urgentTasks = await query(urgentQuery, urgentParams);

    return NextResponse.json({
      userRole: user.role,
      userSeksiId: user.seksi_id || null,
      totalPanitia,
      totalSeksi,
      totalTamu,
      tamuHadir,
      persentaseTugas,
      totalTugas,
      tugasSelesai,
      keuangan: {
        totalMasuk,
        totalKeluar,
        saldoKas,
        saldoCash,
        saldoRekening,
      },
      rundownPreview,
      urgentTasks,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Dashboard API] Error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
