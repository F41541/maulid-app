# Original User Request

## 2026-09-17T17:17:29Z

Lakukan pengujian end-to-end (E2E) secara menyeluruh dari A sampai Z pada seluruh 9 halaman Maulid App menggunakan Playwright dalam mode Headed (jendela browser fisik terbuka), di mana setiap agen didedikasikan untuk menguji 1 halaman secara mendalam dengan sesi/port Playwright terisolasi tanpa mengabaikan elemen interaktif atau mikro-interaksi sekecil apa pun.

Working directory: /home/laxcyyfa/Documents/Projects/Maulid App
Integrity mode: development

## Requirements

### R1. Dedicated Agent Per Page & Isolated Headed Playwright Session
Tim harus mengalokasikan satu agen spesialis untuk masing-masing dari 9 halaman aplikasi:
1. Landing Page (/)
2. Login & Autentikasi (/login & Auth flow)
3. Dashboard Portal (/(portal)/dashboard)
4. Keuangan Kas (/(portal)/keuangan)
5. Rundown Acara (/(portal)/rundown)
6. Tugas per Seksi (/(portal)/tugas)
7. Tamu Undangan (/(portal)/tamu)
8. Struktur Organisasi (/(portal)/struktur)
9. Kelola Akun Pengguna (/(portal)/pengguna)

Setiap agen wajib menjalankan browser Playwright dalam mode Headed (terbuka di layar) dengan konteks/sesi terisolasi (cookies, storage, dan tab terpisah) agar tidak terjadi konflik otentikasi maupun tabrakan state.

### R2. Pengujian Menyeluruh A-Z Tanpa Mengabaikan Hal Sepele
Setiap agen wajib menguji seluruh alur interaktif pada halamannya tanpa ada yang dilewati:
- Perubahan Status: Menguji transisi status langsung dari kontrol UI (contoh: ubah status kehadiran tamu Hadir/Tidak Hadir/Belum Konfirmasi, ubah status tugas Belum Mulai -> Proses -> Selesai, ubah status akun pengguna Aktif/Nonaktif).
- Seluruh Tombol & Modal: Membuka dan menutup semua modal, klik tombol batal, simpan, speed dial, tab filter, pagination, collapse/expand organogram, trigger print, dan tombol download export Excel.
- Validasi Formulir: Menguji skenario form kosong (required check), input invalid, hingga input valid dengan notifikasi/toast feedback.
- Integritas Transaksi & Void (Keuangan): Pencatatan transaksi masuk dan keluar, mutasi kas, hingga pembatalan transaksi (VOID) dengan verifikasi koreksi perhitungan saldo kas secara real-time.
- Upload Dokumentasi & Media: Menguji upload file gambar bukti tugas, preview gambar (modal popup), dan penghapusan bukti.

### R3. Verifikasi Persistensi Database & Teardown Bersih
- Setiap data baru atau perubahan status wajib diverifikasi persistensinya setelah reload browser (page.reload()) atau pengecekan database langsung.
- Seluruh data uji wajib menggunakan prefix E2E-TEST-... dan dibersihkan (teardown) di akhir sesi pengujian agar kondisi database tetap bersih dan konsisten.
- Memastikan tidak ada unhandled exception atau error fatal pada browser console selama pengujian.

## Acceptance Criteria

### Team & Isolation
- [ ] 9 agen spesialis berjalan menguji masing-masing halamannya secara terisolasi tanpa saling tumpang tindih sesi auth.
- [ ] Pengujian dijalankan dengan browser mode Headed (terbuka di layar).

### Interactive & Status Coverage
- [ ] 100% tombol, form, modal, dan tab pada ke-9 halaman berhasil diuji dan diverifikasi.
- [ ] Seluruh perubahan status (Tamu, Tugas, Pengguna) terbukti mengubah visual badge UI dan data persisten di database setelah reload.
- [ ] Alur keuangan (Pemasukan, Pengeluaran, Mutasi, Void) terbukti menghitung saldo secara presisi.
- [ ] Zero unhandled exception atau console errors fatal di browser.

### Reporting
- [ ] Setiap agen menghasilkan laporan checklist hasil uji (PASS/FAIL) beserta rekaman ringkasan hasil pengujian untuk tiap modul.
