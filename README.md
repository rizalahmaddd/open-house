# OpenHouse

Aplikasi manajemen kos dan properti sewa modern berbasis Cloudflare Edge. Cek kamar kosong, simpan KTP & deposit, tagih sewa via WA 1-klik, komplain QR, dan pantau laba bersih tanpa bocor ke penjaga kos.

[![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers_·_D1_·_R2-F38020?logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/workers/)
[![Hono](https://img.shields.io/badge/Hono-API-E36002?logo=hono&logoColor=white)](https://hono.dev)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle&logoColor=black)](https://orm.drizzle.team)
[![PWA](https://img.shields.io/badge/PWA-ready-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Demo](https://img.shields.io/badge/Demo-openhouse.my.id-084732?logo=googlechrome&logoColor=white)](https://openhouse.my.id)

![Demo OpenHouse: dashboard manajemen kos, detail kamar, tagihan WA, kwitansi digital, dan laporan laba bersih](./docs/media/demo.png)

<p align="center">
  <img src="./docs/media/mobile-preview.png" alt="Tampilan Mobile OpenHouse: responsif dan siap dipasang di layar HP" width="360" />
</p>

---

## Fitur Unggulan

### 1. Tagihan WhatsApp, Pembayaran Tunai & Kwitansi Instan
- **Terima Bayar Tunai di Tempat:** Konfirmasi pembayaran tunai langsung dari anak kos dalam 2 ketukan tanpa syarat unggah foto bukti transfer.
- **Tautan Bayar Transfer Bank & QRIS (`/inv/:token`):** Anak kos dapat mengecek tagihan dan mengunggah bukti transfer tanpa perlu login.
- **Kwitansi Digital Resmi:** Otomatis menerbitkan kwitansi berstempel sah yang siap dibagikan ke WhatsApp penghuni dalam 1 klik.
- **Pengingat H-7 & Konfirmasi Perpanjang:** Sistem otomatis mendeteksi tagihan yang mendekati jatuh tempo dan menyiapkan pesan konfirmasi sewa via WhatsApp untuk mencegah kamar mendadak kosong.

### 2. Buku Kas Kecil Penjaga Kos & Laba Bersih Pemilik
- **Buku Kas Kecil Operasional (Petty Cash):** Pantau uang pegangan penjaga kos untuk kebutuhan darurat (beli token PLN listrik darurat, kran bocor, galon air, sapu). Saldo kas di tangan terpantau realtime.
- **Rekap Nota WA 1-Klik:** Penjaga dapat mengirimkan rekap pengeluaran operasional langsung ke WhatsApp pemilik kos untuk proses reimbursement.
- **Proteksi Omzet & Laba Bersih:** Data laba bersih dan total omzet kos terkunci khusus untuk akun pemilik. Penjaga kos bekerja dengan fokus operasional harian.
- **Tampilan Bersih untuk Penjaga Kos:** Menu yang tidak boleh diakses (manajemen staf, langganan paket, omzet) disembunyikan sepenuhnya tanpa ikon gembok yang membingungkan.

### 3. Kelola Properti, Kamar & Check-in Penghuni
- **Multi-Properti:** Kelola beberapa cabang kos dalam satu dashboard akun pemilik.
- **Katalog Kamar Dinamis:** Pantau status kamar terisi, kosong, atau perbaikan secara realtime.
- **Siklus Fleksibel:** Dukungan tarif bulanan, 3 bulanan, semesteran (6 bulan), hingga tahunan.
- **Check-in Cepat & KTP Digital:** Simpan data penghuni, nomor kontak darurat orang tua/wali, serta foto KTP terkompresi otomatis.
- **Tanda Terima Deposit ke WhatsApp:** Kirim bukti penerimaan uang jaminan kunci & kamar langsung ke WhatsApp saat check-in agar tidak terjadi sengketa saat check-out.

### 4. Halaman Publik & PWA
- **Katalog Kos Publik (`/kos/:slug`):** Microsite kamar kosong yang siap dipasang di bio media sosial. Calon anak kos bisa langsung chat WhatsApp dengan nomor kamar dan tipe yang otomatis terisi.
- **Poster QR Lapor Kerusakan (`/lapor/:slug`):** Fasilitas lapor fasilitas rusak tanpa login, dilengkapi poster QR Code siap cetak untuk ditempel di lorong kos.
- **Progressive Web App (PWA):** Dapat di-install langsung di layar utama smartphone dengan navigasi 1-ketukan yang sangat ringan dan cepat.

---

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [Panduan Memulai](./docs/getting-started.md) | Menjalankan OpenHouse di komputer lokal |
| [Deploy ke Cloudflare](./docs/deployment.md) | Setup Workers, D1, R2, migrasi, dan custom domain |
| [Arsitektur](./docs/architecture.md) | Penjelasan tech stack, struktur folder, dan aturan keamanan |

---

## Berkontribusi

Pull request dan laporan kendala sangat diterima. Silakan pelajari [CONTRIBUTING.md](./CONTRIBUTING.md) sebelum mulai. Laporan celah keamanan dapat disampaikan secara privat sesuai [SECURITY.md](./SECURITY.md).

---

## Lisensi

Dirilis di bawah [Lisensi MIT](./LICENSE).

---

## Kontak

Dibuat oleh [@rizalahmaddd](https://github.com/rizalahmaddd). Butuh bantuan atau kustomisasi?

- WhatsApp: [+62 857-7777-5477](https://wa.me/6285777775477)
- Website: [solusikoding.com](https://solusikoding.com)
