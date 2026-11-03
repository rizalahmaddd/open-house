# Panduan Memulai (Getting Started)

Panduan ini menjelaskan cara menjalankan OpenHouse di komputer lokal untuk keperluan pengembangan (*development*).

---

## Prasyarat

- [Bun](https://bun.sh) (v1.1+) atau Node.js (v20+)
- Akun Cloudflare (opsional saat di lokal, namun diperlukan untuk deploy)

---

## Langkah Instalasi

### 1. Clone Repository & Install Dependencies

```bash
git clone https://github.com/rizalahmaddd/open-house.git
cd open-house
bun install
```

### 2. Siapkan File Konfigurasi Wrangler

Salin template konfigurasi lokal:

```bash
cp wrangler.example.jsonc wrangler.jsonc
```

### 3. Terapkan Migrasi Database SQLite D1 Lokal

OpenHouse menggunakan Cloudflare D1 yang diemulasi secara lokal via Miniflare/Wrangler:

```bash
bun run db:migrate:local
```

Perintah di atas akan mengeksekusi migrasi Drizzle ke database D1 lokal di dalam `.wrangler/state/v3/d1`.

### 4. Jalankan Server Pengembangan

```bash
bun run dev
```

Buka peramban di `http://localhost:5173`.

---

## Akun Demo Siap Pakai (Lokal)

Di halaman awal atau tombol **Masuk / Demo 1-Klik**, Anda dapat masuk langsung menggunakan data simulasi:

1. **Akun Pemilik Kos (Owner)**:
   - Email: `juragan@malangkos.id`
   - Password: `malang123`
   - *Akses penuh: ringkasan omzet, laba bersih, manajemen kamar, tarif, dan staf.*

2. **Akun Penjaga Kos (Staff)**:
   - Email: `penjaga@malangkos.id`
   - Password: `malang123`
   - *Akses operasional: check-in, input pengeluaran harian, penanganan tiket komplain. Total laba/kas bersih disembunyikan.*

