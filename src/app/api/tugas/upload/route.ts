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

    // 3. Sanitasi ekstensi file
    let ext = ".jpg";
    if (file.type === "image/png") ext = ".png";
    if (file.type === "image/webp") ext = ".webp";

    const fileName = `dok-${randomUUID()}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "dokumentasi");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/dokumentasi/${fileName}`;

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
