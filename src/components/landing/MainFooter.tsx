"use client";

import React from "react";
import Link from "next/link";
import { ArrowUp, MapPin, Mail, Phone, ShieldCheck, Heart } from "lucide-react";

export function MainFooter() {
  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer className="bg-brand-dark text-white pt-16 pb-10 border-t border-brand-emerald/40 relative overflow-hidden">
      {/* Big Faded Watermark in Background */}
      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-[100px] sm:text-[140px] font-serif font-bold text-white/[0.03] pointer-events-none select-none tracking-widest uppercase text-center whitespace-nowrap">
        MAULID 1448 H
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Col 1: Brand & Identity */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-forest flex items-center justify-center text-brand-accent shadow-sm">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79.09.28.19.55.32.81 1.05 2.1 3.2 3.56 5.7 3.56 1.15 0 2.22-.31 3.14-.85-.75 3.32-3.37 5.86-6.37 6.2z" />
                  <path d="M16.5 5.5l.8 1.7 1.8.3-1.3 1.3.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.3 1.8-.3z" />
                </svg>
              </div>
              <span className="text-xl font-serif font-bold text-white tracking-tight">
                Maulid Nabi 1448 H
              </span>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              Peringatan Hari Kelahiran Baginda Nabi Agung Muhammad SAW 1448 H / 2026 M. Mempererat tali persaudaraan sesama umat dan meneladani suri teladan akhlak Rasulullah.
            </p>
            <div className="pt-1">
              <span className="text-xs font-serif text-brand-accent italic">
                &quot;Shallu &apos;alan Nabi Muhammad!&quot;
              </span>
            </div>
          </div>

          {/* Col 2: Navigasi Cepat */}
          <div className="space-y-3">
            <h4 className="text-sm font-serif font-bold text-brand-accent tracking-wide uppercase">
              Tautan Halaman
            </h4>
            <ul className="space-y-2 text-xs text-white/70">
              <li>
                <a href="#hero" className="hover:text-white transition">
                  &bull; Beranda
                </a>
              </li>
              <li>
                <a href="#tentang" className="hover:text-white transition">
                  &bull; Tentang Acara &amp; Keutamaan
                </a>
              </li>
              <li>
                <a href="#rundown" className="hover:text-white transition">
                  &bull; Susunan Acara (Rundown)
                </a>
              </li>
              <li>
                <a href="#penceramah" className="hover:text-white transition">
                  &bull; Penceramah &amp; Masyayikh
                </a>
              </li>
              <li>
                <a href="#infaq" className="hover:text-white transition">
                  &bull; Infaq &amp; Donasi Umat
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Portal & Kontak Panitia */}
          <div className="space-y-3">
            <h4 className="text-sm font-serif font-bold text-brand-accent tracking-wide uppercase">
              Sekretariat Panitia
            </h4>
            <ul className="space-y-2.5 text-xs text-white/70">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
                <span>Mushola Nurul Hidayah, Blok III Citoke Indah, Desa Sedonglor, Kec. Sedong, Kab. Cirebon</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-brand-accent shrink-0" />
                <span>+62 812-3456-7890 (Sekretariat)</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-brand-accent shrink-0" />
                <span>sekretariat@maulid1448h.id</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Portal Pengurus & Scroll Top */}
          <div className="space-y-4">
            <h4 className="text-sm font-serif font-bold text-brand-accent tracking-wide uppercase">
              Akses Khusus Panitia
            </h4>
            <p className="text-xs text-white/70">
              Pengurus, koordinator seksi, dan panitia pelaksana dapat mengelola tugas, rundown, dan keuangan melalui portal panitia.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-brand-forest hover:bg-white hover:text-brand-dark text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition border border-brand-accent/30"
            >
              <ShieldCheck className="w-4 h-4 text-brand-accent" />
              <span>Login Portal Panitia &rarr;</span>
            </Link>
          </div>
        </div>

        {/* Bottom Bar & Copyright */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/60">
          <p>
            &copy; 1448 H / 2026 M Panitia Peringatan Maulid Nabi Muhammad SAW. Terbuka Untuk Umum.
          </p>

          <button
            type="button"
            onClick={scrollToTop}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 transition"
          >
            <span>Kembali ke Atas</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
}
