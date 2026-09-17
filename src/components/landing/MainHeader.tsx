"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, X, ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function MainHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Beranda", href: "#hero" },
    { label: "Tentang Acara", href: "#tentang" },
    { label: "Susunan Acara", href: "#rundown" },
    { label: "Penceramah", href: "#penceramah" },
    { label: "Infaq & Donasi", href: "#infaq" },
    { label: "Lokasi & Kontak", href: "#kontak" },
  ];

  return (
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Logo Branding */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-2xl bg-brand-forest flex items-center justify-center text-brand-accent shadow-sm group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79.09.28.19.55.32.81 1.05 2.1 3.2 3.56 5.7 3.56 1.15 0 2.22-.31 3.14-.85-.75 3.32-3.37 5.86-6.37 6.2z" />
              <path d="M16.5 5.5l.8 1.7 1.8.3-1.3 1.3.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.3 1.8-.3z" />
            </svg>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-serif font-bold text-brand-dark dark:text-white tracking-tight block leading-tight">
              Maulid Nabi 1448 H
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase block">
              Pusat Informasi Jamaah &amp; Panitia
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center space-x-6 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hover:text-brand-forest dark:hover:text-brand-accent transition-colors py-1"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Action Group */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Theme toggle on desktop (samping sebelum login portal) */}
          <ThemeToggle
            size="sm"
            className="hidden sm:inline-flex p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"
          />

          <Link
            href="/login"
            className="hidden sm:inline-flex items-center gap-2 bg-brand-forest hover:bg-brand-dark text-white px-4 py-2 rounded-full text-xs font-semibold shadow-xs hover:shadow-md transition group border border-brand-accent/20"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-brand-accent" />
            <span>Portal Panitia</span>
            <ArrowRight className="w-3 h-3 text-brand-accent group-hover:translate-x-0.5 transition-transform" />
          </Link>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald"
            aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu navigasi"}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer / Sidebar */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-4 space-y-3 animate-kinetic-slide-down shadow-xl">
          <nav className="flex flex-col space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-brand-accentLight/40 dark:hover:bg-slate-800 hover:text-brand-forest dark:hover:text-brand-accent transition flex items-center justify-between"
              >
                <span>{link.label}</span>
                <Sparkles className="w-3.5 h-3.5 text-brand-accent" />
              </a>
            ))}
          </nav>

          {/* Theme Switcher in Mobile Sidebar */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-2 py-1">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Tema Gelap / Terang
            </span>
            <ThemeToggle size="sm" />
          </div>

          <div className="pt-2">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 bg-brand-forest hover:bg-brand-dark text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-xs transition"
            >
              <ShieldCheck className="w-4 h-4 text-brand-accent" />
              <span>Masuk ke Portal Panitia</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
