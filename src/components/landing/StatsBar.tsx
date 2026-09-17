"use client";

import React from "react";
import { Users, BookOpen, Sparkles, Utensils } from "lucide-react";

export function StatsBar() {
  const stats = [
    {
      icon: Users,
      value: "1.500+",
      title: "Target Jamaah Hadir",
      desc: "Terbuka bagi Muslimin & Muslimat",
    },
    {
      icon: BookOpen,
      value: "4 Tokoh",
      title: "Masyayikh & Qari",
      desc: "Tausiyah Hikmah & Tilawatil Qur'an",
    },
    {
      icon: Sparkles,
      value: "1 Malam Berkah",
      title: "Rawi Simthudduror",
      desc: "Lantunan Sholawat & Mahalul Qiyam",
    },
    {
      icon: Utensils,
      value: "100% Khidmat",
      title: "Jamuan Berkah Umat",
      desc: "Disediakan Konsumsi untuk Jamaah",
    },
  ];

  return (
    <section className="bg-slate-100 dark:bg-slate-950 border-y border-slate-200/80 dark:border-slate-800 py-10 px-4 sm:px-6 transition-colors">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex items-start space-x-3.5"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand-accentLight/60 dark:bg-slate-800 text-brand-forest dark:text-brand-accent flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <span className="text-lg sm:text-2xl font-serif font-bold text-brand-dark dark:text-white block leading-tight">
                    {stat.value}
                  </span>
                  <span className="text-xs font-semibold text-brand-forest dark:text-brand-accent block mt-0.5">
                    {stat.title}
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">
                    {stat.desc}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
