"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, Clock, MapPin, ArrowRight, ShieldCheck, HeartHandshake } from "lucide-react";

export function HeroSection() {
  // Live Countdown to Maulid event (Kamis, 12 Rabiul Awal 1448 H / approx September 24, 2026, 19:30:00 WIB)
  const [timeLeft, setTimeLeft] = useState({
    days: 6,
    hours: 14,
    minutes: 32,
    seconds: 45,
  });

  useEffect(() => {
    // Target event date: Sunday, 11 October 2026 19:30:00 GMT+7
    const targetDate = new Date("2026-10-11T19:30:00+07:00").getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = targetDate - now;

      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="hero" className="relative bg-brand-dark overflow-hidden py-12 sm:py-16 lg:py-20">
      {/* Architectural Dome/Arch Decorative Silhouette SVG in Background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none flex justify-center items-center">
        <svg className="w-[800px] h-[800px] text-brand-emerald" fill="currentColor" viewBox="0 0 200 200">
          <path d="M100 10 C 130 50 170 80 170 140 C 170 170 140 190 100 190 C 60 190 30 170 30 140 C 30 80 70 50 100 10 Z" />
        </svg>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Side: Invocations, Headings & Countdown */}
          <div className="lg:col-span-7 text-white space-y-6">
            {/* Main Title with Playfair Serif Typography */}
            <div className="space-y-2">
              <p className="text-brand-accent/90 text-sm font-medium tracking-wide">
                ﷽ Bismillahir Rahmanir Rahim
              </p>
              <span className="text-brand-accent text-xs sm:text-sm font-semibold tracking-wider uppercase block">
                Tabligh Akbar &amp; Pembacaan Rawi Simthudduror
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-medium leading-tight sm:leading-snug text-white">
                Peringatan Maulid Nabi<br />
                <span className="text-brand-accent italic">Muhammad SAW</span> 1448 H
              </h1>
            </div>

            <p className="text-white/80 text-sm sm:text-base max-w-xl font-light leading-relaxed">
              Meneladani akhlak mulia Baginda Rasulullah SAW, mempererat ukhuwah islamiyah, dan merajut mahabbah kebersamaan umat dalam bimbingan para Masyayikh dan Habaib.
            </p>

            {/* Event Key Details Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
              <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-3 flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-brand-accent shrink-0" />
                <div>
                  <span className="text-white/60 block text-[10px] uppercase tracking-wider">Tanggal</span>
                  <span className="font-semibold text-white">Minggu, 11 Oktober 2026</span>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-3 flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-brand-accent shrink-0" />
                <div>
                  <span className="text-white/60 block text-[10px] uppercase tracking-wider">Waktu</span>
                  <span className="font-semibold text-white">19.30 WIB (Ba&apos;da Isya)</span>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-3 flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-brand-accent shrink-0" />
                <div>
                  <span className="text-white/60 block text-[10px] uppercase tracking-wider">Lokasi</span>
                  <span className="font-semibold text-white truncate" title="Mushola Nurul Hidayah">Mushola Nurul Hidayah</span>
                </div>
              </div>
            </div>

            {/* Live Interactive Countdown */}
            <div className="bg-black/30 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-brand-accent flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 animate-pulse" />
                  <span>Hitung Mundur Menuju Acara Akbar:</span>
                </span>
                <span className="text-[10px] text-white/60 bg-white/10 px-2 py-0.5 rounded-full font-medium">
                  11 Oktober 2026 M
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center">
                <div className="bg-white/10 rounded-xl p-2 border border-white/10">
                  <span className="text-xl sm:text-2xl font-bold font-serif text-brand-accent block">
                    {timeLeft.days}
                  </span>
                  <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold">Hari</span>
                </div>
                <div className="bg-white/10 rounded-xl p-2 border border-white/10">
                  <span className="text-xl sm:text-2xl font-bold font-serif text-white block">
                    {timeLeft.hours}
                  </span>
                  <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold">Jam</span>
                </div>
                <div className="bg-white/10 rounded-xl p-2 border border-white/10">
                  <span className="text-xl sm:text-2xl font-bold font-serif text-white block">
                    {timeLeft.minutes}
                  </span>
                  <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold">Menit</span>
                </div>
                <div className="bg-white/10 rounded-xl p-2 border border-white/10">
                  <span className="text-xl sm:text-2xl font-bold font-serif text-brand-accent block">
                    {timeLeft.seconds}
                  </span>
                  <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold">Detik</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href="#rundown"
                className="inline-flex items-center gap-2 bg-brand-accent hover:bg-brand-accentHover text-brand-dark px-6 py-3 rounded-full text-xs font-bold tracking-wider uppercase transition shadow-md group"
              >
                <span>Lihat Susunan Acara</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
              </a>

              <a
                href="#infaq"
                className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-sm px-5 py-3 rounded-full text-xs font-semibold tracking-wide transition"
              >
                <HeartHandshake className="w-4 h-4 text-brand-accent" />
                <span>Infaq &amp; Partisipasi Umat</span>
              </a>

              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-medium px-4 py-3 hover:underline transition"
              >
                <ShieldCheck className="w-4 h-4 text-brand-accent" />
                <span>Portal Panitia</span>
              </Link>
            </div>
          </div>

          {/* Right Side: Ornate Islamic Mosque Arch Window Display */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="relative w-64 sm:w-72 md:w-80 aspect-[3/4] p-2 rounded-t-[140px] rounded-b-2xl bg-white/10 backdrop-blur-md border border-white/25 shadow-2xl group">
              {/* Inner Arch Visual Container */}
              <div className="w-full h-full rounded-t-[130px] rounded-b-xl overflow-hidden relative shadow-inner bg-brand-forest">
                <img
                  alt="Kubah &amp; Menara Masjid Utama Acara Maulid Nabi"
                  className="w-full h-full object-cover transform group-hover:scale-105 transition duration-700"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDzIAMVQk1x5-W7MEJK8QTo3UK5h3M-pY0C7VZbaGuLu94o01fO4ufxFBNBCybEiv988WpS6nO43ULF5uXwBqcbmhageS4SZpDVRfWEzRn-lUbmMwqNnBoq07wGG3LcgKoJhFOyaIgCOIGjRsEql9nz8ojwDpigt1nXEsWiHaEH3KZ-zslV4FjI3Ixd2S0xNGbUGS8A_nU2YmjFdNBAVhh57C2bg1aFQgTmELAKGVaGC-ibLefVE79lrQ"
                />
                {/* Subtle inner arch framing overlay */}
                <div className="absolute inset-0 border-4 border-white/30 rounded-t-[130px] rounded-b-xl pointer-events-none" />

                {/* Floating Highlight Card */}
                <div className="absolute bottom-4 left-4 right-4 bg-brand-dark/90 backdrop-blur-md p-3 rounded-xl border border-white/20 text-center shadow-lg">
                  <span className="text-[10px] text-brand-accent uppercase font-bold tracking-wider block">
                    Tema Tabligh Akbar
                  </span>
                  <p className="text-xs text-white font-medium mt-0.5">
                    &quot;Cahaya Risalah Nabawiyah di Tengah Peradaban Modern&quot;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
