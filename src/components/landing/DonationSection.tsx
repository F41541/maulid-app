"use client";

import React, { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export function DonationSection() {
  const { success } = useToast();
  const [selectedAmount, setSelectedAmount] = useState<number>(100000);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [copiedBank, setCopiedBank] = useState<string | null>(null);

  const bankAccounts = [
    {
      bank: "Bank Syariah Indonesia (BSI)",
      noRek: "7123456789",
      holder: "Panitia Peringatan Maulid Nabi",
      code: "451",
    },
    {
      bank: "Bank Mandiri",
      noRek: "1230009876543",
      holder: "Panitia Maulid 1448 H",
      code: "008",
    },
    {
      bank: "Bank Central Asia (BCA)",
      noRek: "5432109876",
      holder: "Panitia Maulid / Mushola Nurul Hidayah",
      code: "014",
    },
  ];

  const presets = [50000, 100000, 250000, 500000, 1000000];

  const handleCopy = (noRek: string, bank: string) => {
    navigator.clipboard.writeText(noRek);
    setCopiedBank(bank);
    success(`Nomor rekening ${bank} (${noRek}) berhasil disalin!`);
    setTimeout(() => setCopiedBank(null), 2500);
  };

  const getActiveAmount = () => {
    if (customAmount && Number(customAmount) > 0) {
      return Number(customAmount);
    }
    return selectedAmount;
  };

  const waMessage = encodeURIComponent(
    `Assalamualaikum Warahmatullahi Wabarakatuh,\n\nSaya ingin konfirmasi infaq/sedekah untuk Peringatan Maulid Nabi Muhammad SAW 1448 H sebesar Rp ${getActiveAmount().toLocaleString(
      "id-ID"
    )}.\n\nMohon info tanda terima berkah dari panitia. Jazakumullah khairan katsiran.`
  );

  return (
    <section id="infaq" className="w-full py-16 sm:py-24 bg-slate-100/80 dark:bg-slate-950 border-y border-slate-200/70 dark:border-slate-800/80 transition-colors scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Side: Appeal & Arch Photo */}
          <div className="lg:col-span-5 space-y-5">
            <h2 className="text-3xl sm:text-4xl font-serif text-brand-dark dark:text-white leading-tight">
              Dukungan &amp; Partisipasi<br />
              <span className="text-brand-emerald dark:text-brand-accent italic">Tabligh Akbar</span>
            </h2>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              Setiap rupiah infaq dan sedekah yang Anda salurkan akan dialokasikan untuk memuliakan majelis maulid, pengadaan jamuan nasi kebuli berkah jamaah, sound system, serta sarana ibadah.
            </p>

            {/* Arch Chandelier Frame */}
            <div className="w-full aspect-[16/9] rounded-2xl overflow-hidden border-2 border-brand-forest/30 dark:border-slate-700 shadow-md relative">
              <img
                alt="Kemegahan Lampu Gantung dan Mimbar Masjid"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDO5p9sabp5iRIEMjbbWl902kW0yl5tJZshFed-AHzPZa-iuL1KHFFsZaHF7MxRBI-b8W9Jcen_x2-IHhlE0qwmhk0iD0sixH3khYckvPReZxrKsWPQS--P_BPyZj0l7GaN8w0c1wkAjfxzwewSqRrrm5nGPjJJRTIVD5KH7ESw6PzHxNVH-LrYsQYXdaZbjIyKniNr6aCBAyfcs-spb7bivlfCbLeFiYoZApH4ogYoz32nno19JO7tBw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-4">
                <span className="text-xs text-white/90 font-medium italic">
                  &quot;Harta tidak akan berkurang karena sedekah...&quot; (HR. Muslim)
                </span>
              </div>
            </div>

            {/* Transparansi / Quick Progress Indicator */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-200/80 dark:border-slate-700 space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-gray-600 dark:text-gray-300">Estimasi Kebutuhan Acara</span>
                <span className="text-brand-forest dark:text-brand-accent">Rp 25.000.000</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div className="bg-brand-emerald dark:bg-brand-accent h-full rounded-full w-[74%]" />
              </div>
              <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
                <span>Infaq Terkumpul: Rp 18.500.000</span>
                <span>74% Tercapai</span>
              </div>
            </div>
          </div>

          {/* Right Side: Donation Form & Bank Accounts */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-slate-700 shadow-md space-y-6">
            <div>
              <span className="text-xs font-bold text-brand-forest dark:text-brand-accent uppercase tracking-wider block mb-1">
                Pilih Nominal Infaq
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Pilih preset atau masukkan nominal keikhlasan Anda:
              </p>
            </div>

            {/* Preset Pills */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {presets.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setSelectedAmount(amt);
                    setCustomAmount("");
                  }}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition border text-center ${
                    selectedAmount === amt && !customAmount
                      ? "bg-brand-forest text-brand-accent border-brand-forest shadow-xs"
                      : "bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-600 hover:border-brand-emerald"
                  }`}
                >
                  {(amt / 1000).toLocaleString("id-ID")}rb
                </button>
              ))}
            </div>

            {/* Custom Amount Input */}
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                Rp
              </span>
              <input
                type="number"
                placeholder="Nominal kustom lainnya..."
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-emerald"
              />
            </div>

            {/* Bank Accounts Grid */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                Rekening Resmi Panitia (Bebas Biaya Transfer):
              </span>
              <div className="space-y-2.5">
                {bankAccounts.map((acc) => (
                  <div
                    key={acc.bank}
                    className="p-3.5 rounded-2xl border border-gray-200/80 dark:border-slate-700 bg-brand-cardBg/60 dark:bg-slate-900 flex items-center justify-between gap-3"
                  >
                    <div>
                      <span className="text-xs font-bold text-brand-dark dark:text-white block">
                        {acc.bank}
                      </span>
                      <span className="text-sm font-mono font-bold text-brand-forest dark:text-brand-accent tracking-wider block">
                        {acc.noRek}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 block">
                        a.n. {acc.holder}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(acc.noRek, acc.bank)}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-brand-accentLight/60 dark:hover:bg-slate-700 transition flex items-center gap-1.5 shrink-0 shadow-2xs"
                    >
                      {copiedBank === acc.bank ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-gray-500" />
                          <span>Salin</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* WA Confirmation CTA */}
            <div className="pt-2">
              <a
                href={`https://wa.me/6281234567890?text=${waMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Konfirmasi Infaq via WhatsApp (Rp {getActiveAmount().toLocaleString("id-ID")})</span>
              </a>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 text-center block mt-2">
                &bull; Konfirmasi langsung terhubung ke nomor Bendahara &amp; Sekretariat Panitia.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
