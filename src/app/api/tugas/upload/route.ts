import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export async function POST(req: NextRequest) {
  try {
    await requireAuth();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File foto tidak ditemukan" }, { status: 400 });
    }

    // 1. Validasi MIME type
    const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json(
        { error: "Format file tidak didukung. Harap unggah foto dengan format JPG, PNG, atau WebP." },
        { status: 400 }
      );
    }

    // 2. Validasi Ukuran (Maksimal 5 MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Ukuran file terlalu besar. Maksimal ukuran foto adalah 5 MB." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 3. Verifikasi Magic Bytes (Header biner file gambar)
    // JPEG starts with: 0xFF, 0xD8, 0xFF
    // PNG starts with: 0x89, 0x50, 0x4E, 0x47
    // WebP: RIFF....WEBP
    const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isWebp =
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50;

    if (!isJpeg && !isPng && !isWebp) {
      return NextResponse.json(
        { error: "Isi berkas tidak valid atau bukan gambar biner (JPEG, PNG, WebP) yang sah." },
        { status: 400 }
      );
    }

    // 4. Sanitasi ekstensi file sesuai hasil verifikasi biner
    let ext = ".jpg";
    if (isPng) ext = ".png";
    if (isWebp) ext = ".webp";

    const fileName = `dok-${randomUUID()}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "dokumentasi");

    await fs.promises.mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, fileName);
    await fs.promises.writeFile(filePath, buffer);

    const publicUrl = `/api/uploads/dokumentasi/${fileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Upload Dokumentasi Error]:", err);
    return NextResponse.json({ error: "Terjadi kesalahan saat mengunggah foto" }, { status: 500 });
  }
}
