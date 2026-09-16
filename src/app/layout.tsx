import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aplikasi Manajemen Panitia Maulid Nabi Muhammad SAW",
  description: "Aplikasi manajemen kepanitiaan, susunan acara, tugas, dan keuangan Maulid Nabi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
