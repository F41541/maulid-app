"use client";

import React, { useState } from "react";
import { MapPin, Navigation, Send, Phone, Mail, CheckCircle2, MessageCircle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export function LocationContactSection() {
  const { success } = useToast();
  const [formData, setFormData] = useState({
    nama: "",
    noHp: "",
    majelis: "",
    pesan: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama || !formData.noHp) {
      alert("Mohon lengkapi nama dan nomor kontak WhatsApp Anda.");
      return;
    }

    setSubmitted(true);
    success("Pesan atau konfirmasi kehadiran Anda telah diterima panitia!");
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ nama: "", noHp: "", majelis: "", pesan: "" });
    }, 4000);
  };

  return (
    <section id="kontak" className="w-full py-16 sm:py-24 bg-white dark:bg-slate-900 transition-colors scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-brand-forest rounded-3xl p-6 sm:p-10 lg:p-12 text-white relative shadow-xl overflow-hidden">
        {/* Background Islamic Dome Silhouette */}
        <div className="absolute -right-20 -bottom-20 opacity-10 pointer-events-none">
          <svg className="w-96 h-96" fill="currentColor" viewBox="0 0 200 200">
            <path d="M100 10 C 130 50 170 80 170 140 C 170 170 140 190 100 190 C 60 190 30 170 30 140 C 30 80 70 50 100 10 Z" />
          </svg>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
          {/* Left Side: Map Simulation & Venue Information */}
          <div className="lg:col-span-6 space-y-5">
            <h2 className="text-3xl sm:text-4xl font-serif text-white leading-tight">
              Panduan Lokasi &amp;<br />
              Sekretariat Panitia
            </h2>

            <p className="text-white/80 text-xs sm:text-sm leading-relaxed">
              Acara berpusat di Mushola Nurul Hidayah. Lokasi strategis dan mudah diakses kendaraan roda 2 maupun roda 4, serta disiapkan fasilitas tempat wudhu dan sarana ibadah representatif untuk kenyamanan jamaah.
            </p>

            {/* Map Simulation Card */}
            <div className="rounded-2xl overflow-hidden border border-white/20 shadow-md h-56 relative bg-slate-800">
              <div className="absolute inset-0 bg-[#e5e3df] dark:bg-slate-800 flex flex-col items-center justify-center p-6 text-gray-700 dark:text-gray-200 text-center">
                <div className="w-12 h-12 rounded-full bg-brand-forest text-brand-accent flex items-center justify-center mb-3 shadow-md animate-bounce">
                  <MapPin className="w-6 h-6" />
                </div>
                <span className="font-bold text-sm text-brand-dark dark:text-white">
                  Mushola Nurul Hidayah
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-300 mt-1 max-w-md leading-relaxed">
                  Blok III Citoke Indah, Desa Sedonglor, Kecamatan Sedong, Kabupaten Cirebon
                </span>
                <a
                  href="https://maps.google.com/?q=Mushola+Nurul+Hidayah+Sedonglor+Sedong+Cirebon"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 bg-brand-forest hover:bg-brand-dark text-white px-4 py-1.5 rounded-full text-xs font-semibold shadow-xs transition"
                >
                  <Navigation className="w-3 h-3 text-brand-accent" />
                  <span>Petunjuk Arah Google Maps</span>
                </a>
              </div>
            </div>

            {/* Venue Amenities */}
            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="bg-white/10 rounded-xl p-3 border border-white/15">
                <span className="font-bold text-brand-accent block mb-0.5">&bull; Tempat Parkir</span>
                <span className="text-white/80 text-[11px]">Kapasitas 300+ motor &amp; 50+ mobil</span>
              </div>
              <div className="bg-white/10 rounded-xl p-3 border border-white/15">
                <span className="font-bold text-brand-accent block mb-0.5">&bull; Area Ibadah</span>
                <span className="text-white/80 text-[11px]">Tempat wudhu terpisah &amp; ramah lansia</span>
              </div>
            </div>
          </div>

          {/* Right Side: Form Pertanyaan / Konfirmasi Kehadiran */}
          <div className="lg:col-span-6 bg-brand-accent text-brand-dark rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-forest block mb-1">
                Buku Tamu &amp; Hubungi Panitia
              </span>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-brand-dark">
                Ada Pertanyaan atau Konfirmasi?
              </h3>
              <p className="text-xs text-brand-dark/80 mt-1">
                Tinggalkan pesan Anda, sekretariat panitia akan segera merespons melalui WhatsApp.
              </p>
            </div>

            {submitted ? (
              <div className="bg-white/90 p-6 rounded-2xl text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h4 className="font-serif font-bold text-base text-gray-900">
                  Jazakumullah Khairan Katsiran!
                </h4>
                <p className="text-xs text-gray-600">
                  Pesan dan konfirmasi Anda telah tercatat dalam sistem kepanitiaan.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-brand-forest mb-1">
                    Nama Lengkap / Instansi:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: H. Fathurrahman / Majelis An-Nur"
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-forest/20 bg-white text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-forest"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-forest mb-1">
                    Nomor WhatsApp / HP:
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 081234567890"
                    value={formData.noHp}
                    onChange={(e) => setFormData({ ...formData, noHp: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-forest/20 bg-white text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-forest"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-forest mb-1">
                    Pesan / Pertanyaan:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Tuliskan pertanyaan mengenai rundown, lokasi parkir, atau konfirmasi rombongan..."
                    value={formData.pesan}
                    onChange={(e) => setFormData({ ...formData, pesan: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-forest/20 bg-white text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-forest"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-brand-forest hover:bg-brand-dark text-white py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md transition duration-200"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim ke Sekretariat Panitia</span>
                </button>
              </form>
            )}

            {/* Quick WhatsApp Link */}
            <div className="pt-2 text-center">
              <a
                href="https://wa.me/6281234567890?text=Assalamualaikum%20Panitia%20Maulid,%20saya%20ingin%20bertanya..."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-forest hover:underline"
              >
                <MessageCircle className="w-4 h-4 text-brand-forest" />
                <span>Atau langsung chat WhatsApp Panitia &rarr;</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  );
}
