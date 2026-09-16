import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();

    // 1. Total panitia & tamu
    const totalPanitia = (db.prepare("SELECT COUNT(*) as count FROM panitia").get() as { count: number }).count;
    const totalSeksi = (db.prepare("SELECT COUNT(*) as count FROM seksi").get() as { count: number }).count;
    const totalTamu = (db.prepare("SELECT COUNT(*) as count FROM tamu").get() as { count: number }).count;
    const tamuHadir = (db.prepare("SELECT COUNT(*) as count FROM tamu WHERE kehadiran = 'Hadir'").get() as { count: number }).count;

    // 2. Progress tugas
    const taskStats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Selesai' THEN 1 ELSE 0 END) as selesai,
        SUM(CASE WHEN status = 'Proses' THEN 1 ELSE 0 END) as proses,
        SUM(CASE WHEN status = 'Belum Mulai' THEN 1 ELSE 0 END) as belum_mulai
      FROM tugas
    `).get() as { total: number; selesai: number; proses: number; belum_mulai: number };

    const totalTugas = taskStats.total || 0;
    const tugasSelesai = taskStats.selesai || 0;
    const persentaseTugas = totalTugas > 0 ? Math.round((tugasSelesai / totalTugas) * 100) : 0;

    // 3. Keuangan (Cash, Rekening, Total)
    const cashMasuk = (
      db.prepare("SELECT COALESCE(SUM(nominal), 0) as total FROM keuangan WHERE tipe = 'masuk' AND metode = 'cash'").get() as { total: number }
    ).total;
    const cashKeluar = (
      db.prepare("SELECT COALESCE(SUM(nominal), 0) as total FROM keuangan WHERE tipe = 'keluar' AND metode = 'cash'").get() as { total: number }
    ).total;
    const saldoCash = cashMasuk - cashKeluar;

    const transferMasuk = (
      db.prepare("SELECT COALESCE(SUM(nominal), 0) as total FROM keuangan WHERE tipe = 'masuk' AND metode = 'transfer'").get() as { total: number }
    ).total;
    const transferKeluar = (
      db.prepare("SELECT COALESCE(SUM(nominal), 0) as total FROM keuangan WHERE tipe = 'keluar' AND metode = 'transfer'").get() as { total: number }
    ).total;
    const saldoRekening = transferMasuk - transferKeluar;

    const totalMasuk = cashMasuk + transferMasuk;
    const totalKeluar = cashKeluar + transferKeluar;
    const saldoKas = totalMasuk - totalKeluar;

    // 4. Preview rundown (top 4 urutan pertama)
    const rundownPreview = db.prepare("SELECT * FROM rundown ORDER BY urutan ASC LIMIT 4").all();

    // 5. Tugas mendesak / belum selesai (limit 5)
    const urgentTasks = db.prepare(`
      SELECT t.*, s.nama_seksi, p.nama as pj_nama
      FROM tugas t
      JOIN seksi s ON t.seksi_id = s.id
      LEFT JOIN panitia p ON t.pj_id = p.id
      WHERE t.status != 'Selesai'
      ORDER BY 
        CASE WHEN t.deadline IS NOT NULL AND t.deadline != '' THEN 0 ELSE 1 END,
        t.deadline ASC, t.created_at DESC
      LIMIT 5
    `).all();

    return NextResponse.json({
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
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
