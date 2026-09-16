import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { randomUUID } from "node:crypto";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const tipe = req.nextUrl.searchParams.get("tipe"); // masuk | keluar | all
    const metode = req.nextUrl.searchParams.get("metode"); // cash | transfer | all

    let query = "SELECT * FROM keuangan WHERE 1=1";
    const params: string[] = [];

    if (tipe && tipe !== "all") {
      query += " AND tipe = ?";
      params.push(tipe);
    }

    if (metode && metode !== "all") {
      query += " AND metode = ?";
      params.push(metode);
    }

    query += " ORDER BY tanggal DESC, created_at DESC";

    const transaksi = db.prepare(query).all(...params);

    // Hitung ringkasan saldo Dompet (Cash)
    const cashMasuk = (
      db.prepare("SELECT COALESCE(SUM(nominal), 0) as total FROM keuangan WHERE tipe = 'masuk' AND metode = 'cash'").get() as { total: number }
    ).total;
    const cashKeluar = (
      db.prepare("SELECT COALESCE(SUM(nominal), 0) as total FROM keuangan WHERE tipe = 'keluar' AND metode = 'cash'").get() as { total: number }
    ).total;
    const saldoCash = cashMasuk - cashKeluar;

    // Hitung ringkasan saldo Rekening (Transfer)
    const transferMasuk = (
      db.prepare("SELECT COALESCE(SUM(nominal), 0) as total FROM keuangan WHERE tipe = 'masuk' AND metode = 'transfer'").get() as { total: number }
    ).total;
    const transferKeluar = (
      db.prepare("SELECT COALESCE(SUM(nominal), 0) as total FROM keuangan WHERE tipe = 'keluar' AND metode = 'transfer'").get() as { total: number }
    ).total;
    const saldoRekening = transferMasuk - transferKeluar;

    // Total Semua Saldo
    const totalMasuk = cashMasuk + transferMasuk;
    const totalKeluar = cashKeluar + transferKeluar;
    const saldoTotal = totalMasuk - totalKeluar;

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
      const { tipe, tanggal, keterangan, nominal, metode } = body;
      if (!tipe || !tanggal || !keterangan || nominal === undefined || nominal === null) {
        return NextResponse.json({ error: "Lengkapi semua isian keuangan" }, { status: 400 });
      }

      const parsedNominal = parseInt(nominal, 10);
      if (isNaN(parsedNominal) || parsedNominal < 0) {
        return NextResponse.json({ error: "Nominal harus angka valid non-negatif" }, { status: 400 });
      }

      const selectedMetode = metode === "transfer" ? "transfer" : "cash";

      const id = randomUUID();
      db.prepare(
        "INSERT INTO keuangan (id, tipe, tanggal, keterangan, nominal, metode) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(id, tipe, tanggal, keterangan, parsedNominal, selectedMetode);

      return NextResponse.json({ success: true, id });
    }

    if (action === "update") {
      const { id, tipe, tanggal, keterangan, nominal, metode } = body;
      if (!id || !tipe || !tanggal || !keterangan || nominal === undefined) {
        return NextResponse.json({ error: "Data transaksi tidak lengkap" }, { status: 400 });
      }

      const parsedNominal = parseInt(nominal, 10);
      if (isNaN(parsedNominal) || parsedNominal < 0) {
        return NextResponse.json({ error: "Nominal harus angka valid non-negatif" }, { status: 400 });
      }

      const selectedMetode = metode === "transfer" ? "transfer" : "cash";

      db.prepare(
        "UPDATE keuangan SET tipe = ?, tanggal = ?, keterangan = ?, nominal = ?, metode = ? WHERE id = ?"
      ).run(tipe, tanggal, keterangan, parsedNominal, selectedMetode, id);

      return NextResponse.json({ success: true });
    }

    // Mutasi internal saldo: Dompet (Cash) <-> Rekening (Transfer)
    if (action === "mutasi_internal") {
      const { dari, ke, nominal, tanggal, catatan } = body;
      if (!dari || !ke || !nominal || !tanggal) {
        return NextResponse.json({ error: "Data mutasi kas tidak lengkap" }, { status: 400 });
      }

      if (dari === ke) {
        return NextResponse.json({ error: "Sumber dan tujuan mutasi tidak boleh sama" }, { status: 400 });
      }

      const parsedNominal = parseInt(nominal, 10);
      if (isNaN(parsedNominal) || parsedNominal <= 0) {
        return NextResponse.json({ error: "Nominal mutasi harus lebih dari 0" }, { status: 400 });
      }

      const idKeluar = randomUUID();
      const idMasuk = randomUUID();

      const labelDari = dari === "cash" ? "Dompet (Cash)" : "Rekening Bank";
      const labelKe = ke === "cash" ? "Dompet (Cash)" : "Rekening Bank";
      const keteranganKeluar = `Mutasi Pindah Dana ke ${labelKe}${catatan ? ` - ${catatan}` : ""}`;
      const keteranganMasuk = `Mutasi Terima Dana dari ${labelDari}${catatan ? ` - ${catatan}` : ""}`;

      // Insert keluar dari sumber
      db.prepare(
        "INSERT INTO keuangan (id, tipe, tanggal, keterangan, nominal, metode, kategori) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(idKeluar, "keluar", tanggal, keteranganKeluar, parsedNominal, dari, "mutasi_internal");

      // Insert masuk ke tujuan
      db.prepare(
        "INSERT INTO keuangan (id, tipe, tanggal, keterangan, nominal, metode, kategori) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(idMasuk, "masuk", tanggal, keteranganMasuk, parsedNominal, ke, "mutasi_internal");

      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "ID transaksi diperlukan" }, { status: 400 });

      db.prepare("DELETE FROM keuangan WHERE id = ?").run(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Action tidak dikenal" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
