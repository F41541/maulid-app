import React from "react";
import { query } from "@/lib/db";
import { MainHeader } from "@/components/landing/MainHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { StatsBar } from "@/components/landing/StatsBar";
import { AboutSection } from "@/components/landing/AboutSection";
import { RundownSection, RundownItem } from "@/components/landing/RundownSection";
import { SpeakersSection } from "@/components/landing/SpeakersSection";
import { DonationSection } from "@/components/landing/DonationSection";
import { LocationContactSection } from "@/components/landing/LocationContactSection";
import { MainFooter } from "@/components/landing/MainFooter";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  let rundownList: RundownItem[] = [];
  try {
    const rows = await query<RundownItem>(
      "SELECT id, hari, waktu, nama_kegiatan, nama_pengisi, catatan FROM rundown ORDER BY urutan ASC"
    );
    rundownList = rows.map((r) => ({
      id: String(r.id),
      hari: String(r.hari || "Hari H"),
      waktu: String(r.waktu || ""),
      nama_kegiatan: String(r.nama_kegiatan || ""),
      nama_pengisi: r.nama_pengisi ? String(r.nama_pengisi) : null,
      catatan: r.catatan ? String(r.catatan) : null,
    }));
  } catch (err) {
    console.error("[LandingPage] Gagal memuat data rundown:", err);
    rundownList = [];
  }

  return (
    <div className="min-h-screen bg-surface-ground text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-brand-accent selection:text-brand-dark">
      {/* Navigation Header */}
      <MainHeader />

      {/* Main Sections */}
      <main className="flex-grow">
        {/* 1. Hero Section with Live Countdown & Islamic Arch Display */}
        <HeroSection />

        {/* 2. Highlight Stats Bar */}
        <StatsBar />

        {/* 3. About Section with Botanical Scalloped Frame & Interactive Tabs */}
        <AboutSection />

        {/* 4. Dynamic Database Rundown Section */}
        <RundownSection rundownList={rundownList} />

        {/* 5. Speakers & Scholars Showcase */}
        <SpeakersSection />

        {/* 6. Infaq, Donations & Bank Accounts */}
        <DonationSection />

        {/* 7. Venue Location, Map & Inquiry Form */}
        <LocationContactSection />
      </main>

      {/* Footer */}
      <MainFooter />
    </div>
  );
}
