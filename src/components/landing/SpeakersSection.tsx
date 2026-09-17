"use client";

import React, { useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function SpeakersSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const speakers = [
    {
      name: "Habib Umar bin Yahya",
      role: "Penceramah Utama (Mau'idhoh)",
      desc: "Ulama kharismatik yang mengupas keteladanan akhlak Baginda Rasulullah SAW di zaman modern.",
      badge: "Mau'idhoh Hasanah",
      featured: true,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBLu8M-c1Dajmlcy-gAqd-dzoQExWVVSIo19_KM6pSD3mqokkLjXoGwBxscBKKnyoZY6IUiKQbcvx4BD1qpYT0UF8751dQ9zJODSWZyE7QpKiYCGOd6LM8PICA5O6_eBW8oTfWyMJ2uQmseHQ3EVpiX2_-WNNZ__Ya-g2koqehYLhRl96WMLzQV1EWEi7Hvd9JPhb6KCmZhKgpAnhi80_UvKKWA-LDt6FTNzXneXAkZ_8ruLUv_8RNyqQ",
    },
    {
      name: "K.H. Ahmad Fauzi",
      role: "Pelindung & Doa Penutup",
      desc: "Pengasuh Pondok Pesantren dan Tokoh Ulama setempat yang memimpin doa barakah.",
      badge: "Pelindung Yayasan",
      featured: false,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBbVkmGJGr3_UYsAEyz0bQ97HSlU_xXgrEpVvKbzaJ9U7eBuZv_-b4n2b4g594BxoGlp-OKits506FjdFoOeCvISb7UvA85vuWPgjBLlOkBd9tRP2GJfNaOQlAXmx6do5STmpJ9M5jpF1iDdAnLq_qV79K2OL6OQ2Wj1-rDqJPdYhwPbQ6djVJgobW8gsqC7lUV5xl7ZM-K4gNj4s8z7lzmcp4BiPdsfQyoga08lctJ85A2vJzJi6N4FQ",
    },
    {
      name: "Ustadz Qori Syamsuri",
      role: "Qari Tilawatil Qur'an",
      desc: "Qari berprestasi nasional yang melantunkan ayat suci Al-Qur'an surat Al-Ahzab dengan khidmat.",
      badge: "Qari Nasional",
      featured: false,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCAQR5WNUTPyc0UbHcyJIDaxiLPsJAeuviNDS9u0GmrkaBYigJiZPXDuVt8R9zMxVCGK1OXmymBpBzBtXTJrWT6v0zABerBJ_teV4_PI3gx_KGxHd8eZ_TbiUTykCRzMDhnM7ZrXYuJDKKe6S-M_KgIK7MWqewo-gOeFtit_7m7Hf6LEwUSVtX0HUslSJ3DQJti1SPJFOcuDtFEeCJw2JWxWMpFQFHgUFu35P16vaCkY2MFAauyDkVMOg",
    },
    {
      name: "Grup Hadroh Syubban & Ahbabul",
      role: "Tim Sholawat & Rawi Simthudduror",
      desc: "Mengiringi pembacaan rawi maulid Simthudduror dan lantunan qasidah penuh mahabbah.",
      badge: "Tim Hadroh & Rawi",
      featured: false,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuA8EKMt1Smn6h5tgARTDV4FevGHf1oeTJgR8toeWbjzHQT_w5famANJNS9mlJn9Bk1_7WBgi76gT4-ywR6_4xxTUH7JIeGC9KkxzOvHTRhmyE6Far36d8GyhQ0FkjgtwyHlDPnoFVQMh1O1z99MN_qjJ6j2jAkknemsHg_k9PSTmf9cue5d3ZlTEstowwqMu_9hMZhfOWsitO-o3eHEvpaiCSC-zeH2dnLX4-KiPNSh7CXUaPUCcCk8ew",
    },
  ];

  const handleScroll = () => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const itemWidth = container.clientWidth * 0.82 + 16;
    const index = Math.round(container.scrollLeft / itemWidth);
    setActiveIndex(Math.min(Math.max(0, index), speakers.length - 1));
  };

  const scrollToCard = (index: number) => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const items = container.children;
    if (items[index]) {
      const card = items[index] as HTMLElement;
      const offset = card.offsetLeft - (container.clientWidth - card.clientWidth) / 2;
      container.scrollTo({ left: offset, behavior: "smooth" });
    }
    setActiveIndex(index);
  };

  const renderSpeakerCard = (speaker: (typeof speakers)[0], idx: number) => (
    <div
      key={idx}
      className={`h-full rounded-3xl p-4 sm:p-5 border transition duration-300 flex flex-col items-center text-center group ${
        speaker.featured
          ? "bg-[#f8fbe9] dark:bg-emerald-950/40 border-brand-accent shadow-md hover:shadow-xl hover:-translate-y-1.5"
          : "bg-slate-50 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700 shadow-xs hover:shadow-lg hover:-translate-y-1"
      }`}
    >
      {/* Arch Top Image Container */}
      <div className="w-full aspect-[3/4] rounded-t-full rounded-b-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-4 relative shadow-inner">
        <img
          alt={speaker.name}
          className="w-full h-full object-cover object-top group-hover:scale-105 transition duration-500"
          src={speaker.image}
        />
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-brand-dark/85 backdrop-blur-md text-brand-accent text-[11px] font-bold px-3 py-1 rounded-full border border-brand-accent/30 shadow-md z-10">
          {speaker.badge}
        </div>
      </div>

      {/* Speaker Info */}
      <span className="text-xs font-bold uppercase tracking-wider text-brand-forest dark:text-brand-accent mb-1 block">
        {speaker.role}
      </span>

      <h3 className="text-base sm:text-lg font-serif font-bold text-brand-dark dark:text-white mb-2">
        {speaker.name}
      </h3>

      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex-grow">
        {speaker.desc}
      </p>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 w-full flex items-center justify-center">
        <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
          Insya Allah Hadir Membimbing
        </span>
      </div>
    </div>
  );

  return (
    <section
      id="penceramah"
      className="w-full py-16 sm:py-24 bg-white dark:bg-slate-900 transition-colors scroll-mt-20 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-lg mx-auto mb-10 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-serif text-brand-dark dark:text-white">
            Penceramah &amp; Asatidz
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Menimba samudera hikmah dan keteladanan akhlak Baginda Rasulullah SAW bersama para guru kita.
          </p>
        </div>

        {/* 1. Mobile Carousel View (< sm) */}
        <div className="sm:hidden">
          <div
            ref={carouselRef}
            onScroll={handleScroll}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 pt-1 px-4 -mx-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {speakers.map((speaker, idx) => (
              <div
                key={idx}
                className="w-[82vw] max-w-[310px] shrink-0 snap-center"
              >
                {renderSpeakerCard(speaker, idx)}
              </div>
            ))}
          </div>

          {/* Carousel Navigation & Indicators */}
          <div className="flex items-center justify-between mt-3 px-1">
            {/* Dots Indicator */}
            <div className="flex items-center gap-1.5">
              {speakers.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => scrollToCard(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    activeIndex === i
                      ? "w-7 bg-brand-forest dark:bg-brand-accent shadow-xs"
                      : "w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400"
                  }`}
                  aria-label={`Slide ke ${i + 1}`}
                />
              ))}
            </div>

            {/* Prev & Next Arrows */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollToCard(Math.max(0, activeIndex - 1))}
                disabled={activeIndex === 0}
                suppressHydrationWarning
                className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 shadow-xs disabled:opacity-30 disabled:cursor-not-allowed hover:bg-brand-forest hover:text-white dark:hover:bg-brand-accent dark:hover:text-brand-dark transition active:scale-95"
                aria-label="Penceramah sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollToCard(Math.min(speakers.length - 1, activeIndex + 1))}
                disabled={activeIndex === speakers.length - 1}
                suppressHydrationWarning
                className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 shadow-xs disabled:opacity-30 disabled:cursor-not-allowed hover:bg-brand-forest hover:text-white dark:hover:bg-brand-accent dark:hover:text-brand-dark transition active:scale-95"
                aria-label="Penceramah selanjutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-center mt-2.5 text-[11px] text-slate-500 dark:text-slate-400">
            Geser untuk melihat profil asatidz lainnya &rarr;
          </p>
        </div>

        {/* 2. Desktop & Tablet Grid View (>= sm) */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {speakers.map((speaker, idx) => renderSpeakerCard(speaker, idx))}
        </div>
      </div>
    </section>
  );
}
