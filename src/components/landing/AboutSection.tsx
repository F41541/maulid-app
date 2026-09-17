"use client";

import React, { useState } from "react";
import { ArrowRight, CheckCircle2, Heart, Sparkles, BookCheck } from "lucide-react";

export function AboutSection() {
  const [activeTab, setActiveTab] = useState<"tujuan" | "keutamaan" | "tataTertib">("tujuan");

  const tabContents = {
    tujuan: {
      title: "Maksud & Tujuan Utama Tabligh Akbar",
      description:
        "Peringatan Maulid Nabi Muhammad SAW 1448 H / 2026 M diselenggarakan sebagai wujud syukur atas anugerah terbesar Allah SWT berupa kelahiran Baginda Nabi Muhammad SAW. Majelis ini berikhtiar mempererat silaturahmi antarwarga, menanamkan kecintaan kepada sunnah, serta menghidupkan majelis ilmu di tengah masyarakat.",
      points: [
        "Menumbuhkan rasa cinta (mahabbah) yang mendalam kepada Nabi SAW",
        "Menghimpun seluruh komponen umat dalam ikatan ukhuwah islamiyah",
        "Edukasi keteladanan akhlak mulia bagi generasi muda muslim",
      ],
    },
    keutamaan: {
      title: "Keberkahan & Keutamaan Bersholawat",
      description:
        "Para ulama dan salafus shalih menegaskan bahwa berkumpul dalam rangka mengenang sirah Nabawiyah dan bersholawat kepada Rasulullah SAW mendatangkan sakinah, rahmat, dan ampunan dari Allah SWT. Sebagaimana sabda Nabi: 'Barangsiapa bersholawat kepadaku sekali, Allah bersholawat kepadanya sepuluh kali.'",
      points: [
        "Mendatangkan ketenangan jiwa dan kelapangan rezeki",
        "Menjadi perantara syafaat di Yaumil Qiyamah",
        "Malaikat mengelilingi majelis pembacaan dzikir dan sholawat",
      ],
    },
    tataTertib: {
      title: "Panduan & Kenyamanan Jamaah Hadir",
      description:
        "Demi kelancaran dan kekhidmatan majelis, panitia mengimbau seluruh jamaah yang hadir untuk mematuhi arahan koordinator lapangan demi ketertiban bersama.",
      points: [
        "Dianjurkan mengenakan pakaian rapi, sopan, dan diutamakan bernuansa putih",
        "Memarkir kendaraan di kantong parkir resmi yang telah diarahkan Seksi Perlengkapan",
        "Menjaga kebersihan area masjid dan membuang sampah pada tempat yang disediakan",
      ],
    },
  };

  const currentTab = tabContents[activeTab];

  return (
    <section id="tentang" className="py-16 sm:py-24 bg-white dark:bg-slate-900 transition-colors scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Scalloped Arched Center Photo Display (Left) */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="relative">
              {/* Scalloped Botanical Islamic Frame */}
              <div className="w-72 sm:w-80 md:w-96 aspect-square rounded-[42%] bg-brand-forest/10 dark:bg-brand-forest/30 p-3 flex items-center justify-center">
                <div className="w-full h-full rounded-[40%] overflow-hidden relative shadow-lg border-4 border-brand-forest dark:border-brand-emerald">
                  <img
                    alt="Suasana Masjid dan Selasar Jamaah Peringatan Maulid"
                    className="w-full h-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDwHF9q6V2MgAP3OPGJ4MLAcNly8570sMHne9F15cdNF1PrV3liYln4YXl5G-mVSgiQ5oVPHnkvWIqppOPGyd4jrdsSDE3WF6QhCF3w9sKl5CQVOlgVUBJYjbNquuL9f5L2l3TjQpQKnVocWNe0PCA43tzMD5QQSvDi5Rde_v3q77kSoLkdgS4WV6RKsVIzsyknTMo0-j0JbFT_voF2S-23eGveIkrJvEvRTfNrF4ENbCF1Y7w7dTv7ig"
                  />
                </div>
              </div>

              {/* Overlapping Circular Portrait of Habib / Imam */}
              <div className="absolute -bottom-4 -right-2 sm:right-2 w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 border-white dark:border-slate-800 shadow-xl overflow-hidden bg-brand-forest">
                <img
                  alt="Habib Umar bin Yahya - Penceramah Utama"
                  className="w-full h-full object-cover object-top"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBLu8M-c1Dajmlcy-gAqd-dzoQExWVVSIo19_KM6pSD3mqokkLjXoGwBxscBKKnyoZY6IUiKQbcvx4BD1qpYT0UF8751dQ9zJODSWZyE7QpKiYCGOd6LM8PICA5O6_eBW8oTfWyMJ2uQmseHQ3EVpiX2_-WNNZ__Ya-g2koqehYLhRl96WMLzQV1EWEi7Hvd9JPhb6KCmZhKgpAnhi80_UvKKWA-LDt6FTNzXneXAkZ_8ruLUv_8RNyqQ"
                />
              </div>

              {/* Decorative Flourish Badge */}
              <div className="absolute -top-3 -left-3 bg-brand-forest text-brand-accent p-3 rounded-2xl shadow-md border border-brand-accent/30">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* About Text & Philosophy (Right) */}
          <div className="lg:col-span-6 space-y-5">
            <h2 className="text-3xl sm:text-4xl font-serif text-brand-dark dark:text-white leading-tight">
              Menghidupkan Mahabbah &amp;<br className="hidden sm:inline" />
              Meneladani Akhlakul Karimah
            </h2>

            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              Majelis peringatan maulid ini dirancang sebagai ruang temu spiritual bagi jamaah dari berbagai kalangan. Bersama para Asatidz, Habaib, dan Qari, kita melantunkan bait-bait pujian, menyerap mutiara nasehat, serta memperkokoh persaudaraan umat Islam.
            </p>

            {/* Interactive Toggle Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setActiveTab("tujuan")}
                className={`px-4 py-2 rounded-full text-xs font-bold transition ${
                  activeTab === "tujuan"
                    ? "bg-brand-accent text-brand-dark shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Tujuan Mulia
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("keutamaan")}
                className={`px-4 py-2 rounded-full text-xs font-bold transition ${
                  activeTab === "keutamaan"
                    ? "bg-brand-accent text-brand-dark shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Keutamaan Sholawat
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("tataTertib")}
                className={`px-4 py-2 rounded-full text-xs font-bold transition ${
                  activeTab === "tataTertib"
                    ? "bg-brand-accent text-brand-dark shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Tata Tertib Jamaah
              </button>
            </div>

            {/* Dynamic Tab Detail Content Box */}
            <div className="bg-brand-cardBg dark:bg-slate-800/80 border border-brand-borderLight dark:border-slate-700 p-5 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold text-brand-forest dark:text-brand-accent">
                {currentTab.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {currentTab.description}
              </p>
              <ul className="space-y-1.5 pt-1">
                {currentTab.points.map((point, pIdx) => (
                  <li key={pIdx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-emerald dark:text-brand-accent shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Highlight Ayat Al-Qur'an Box */}
            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 p-4 rounded-2xl text-xs text-emerald-900 dark:text-emerald-100 space-y-1.5">
              <div className="text-right text-base sm:text-lg font-serif text-brand-emerald dark:text-emerald-300 leading-loose">
                وَمَا أَرْسَلْنَاكَ إِلَّا رَحْمَةً لِلْعَالَمِينَ
              </div>
              <p className="italic text-[11px] text-emerald-800/90 dark:text-emerald-200">
                &quot;Dan Kami tidak mengutus engkau (Muhammad), melainkan sebagai rahmat bagi seluruh alam.&quot; &mdash; (QS. Al-Anbiya: 107)
              </p>
            </div>

            {/* CTA Link */}
            <div className="pt-2">
              <a
                href="#rundown"
                className="inline-flex items-center gap-2 bg-brand-accent hover:bg-brand-accentHover text-brand-dark px-6 py-2.5 rounded-full text-xs font-bold tracking-wider transition shadow-xs"
              >
                <span>Lihat Jadwal Lengkap Acara</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
