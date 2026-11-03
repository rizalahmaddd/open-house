# Arsitektur & Struktur Proyek

OpenHouse mengadopsi pola full-stack monorepo modern yang menggabungkan backend Hono di Cloudflare Worker dan client React 19 dalam satu siklus hidup pengembangan.

---

## Tech Stack

- **Runtime & Bundler:** [Cloudflare Workers](https://workers.cloudflare.com) + [Vite](https://vite.dev) + [@cloudflare/vite-plugin](https://github.com/cloudflare/workers-sdk)
- **Frontend:** [React 19](https://react.dev), [Tailwind CSS v4](https://tailwindcss.com), [Lucide React](https://lucide.dev)
- **Backend API:** [Hono v4](https://hono.dev)
- **Database & ORM:** [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite) + [Drizzle ORM](https://orm.drizzle.team)
- **Object Storage:** [Cloudflare R2](https://developers.cloudflare.com/r2/) (Penyimpanan foto terkompresi)
- **Automation / Scheduled Jobs:** Cloudflare Cron Triggers (`0 1 * * *` untuk evaluasi jatuh tempo tagihan sewa harian)

---

## Struktur Direktori

```
open-house/
├── drizzle/                    # Migrasi database SQL otomatis
│   └── migrations/
├── public/                     # Aset statis publik (ikon PWA, manifest, sw.js)
├── src/
│   ├── client/                 # Aplikasi Frontend (Single-Page Application)
│   │   ├── components/         # Komponen UI tab dan modal
│   │   │   ├── SaasLandingPage.tsx
│   │   │   ├── DashboardOverviewTab.tsx
│   │   │   ├── RoomsAndTenantsTab.tsx
│   │   │   ├── BillingAndReceiptsTab.tsx
│   │   │   ├── OperationsAndFinanceTab.tsx
│   │   │   ├── PublicCatalogPage.tsx
│   │   │   ├── PublicComplaintPage.tsx
│   │   │   └── PublicInvoicePage.tsx
│   │   ├── utils/              # Helper kanvas kwitansi & kompresi WebP
│   │   ├── App.tsx             # Root layout & navigasi state
│   │   ├── router.ts           # Router berbasis history API
│   │   └── index.css           # Styling dasar Tailwind CSS v4
│   └── worker/                 # Backend API Cloudflare Worker
│       ├── db/
│       │   ├── schema.ts       # Definisi skema tabel Drizzle ORM
│       │   └── seed-malang.ts  # Seeder data simulasi kos
│       ├── middleware/         # Middleware autentikasi token & kuota paket
│       ├── routes/             # Endpoint REST API (Hono routes)
│       │   ├── auth.ts
│       │   ├── organization.ts
│       │   ├── properties-rooms.ts
│       │   ├── tenants-leases.ts
│       │   ├── invoices.ts
│       │   ├── operations-public.ts
│       │   └── storage.ts
│       └── index.ts            # Entry point Worker & handler cron harian
├── wrangler.example.jsonc      # Template konfigurasi publik Cloudflare
├── wrangler.jsonc              # Konfigurasi lokal (diabaikan oleh git)
└── vite.config.ts
```

---

## Pola Keamanan & Privasi Data

1. **RBAC (Role-Based Access Control):**
   - Pemilik Kos (`owner`) memiliki hak akses penuh ke seluruh transaksi finansial, konfigurasi tarif, dan penghitungan laba bersih.
   - Penjaga Kos (`staff`) hanya diizinkan mengakses data operasional (kamar, identitas dasar anak kos, pengeluaran harian, tiket fasilitas). Informasi laba dan omzet otomatis dikunci di tingkat database dan API.
2. **Halaman Publik Tanpa Login:**
   - Halaman katalog (`/kos/:slug`), komplain kerusakan QR (`/lapor/:slug`), dan verifikasi tagihan (`/inv/:token`) dirancang untuk diakses oleh penghuni/calon penghuni secara instan tanpa perlu mendaftar akun.
3. **Kompresi KTP di Sisi Klien:**
   - Foto KTP anak kos dikonversi ke format WebP dan dikompresi di peramban sebelum diunggah ke R2, menghemat kuota transmisi serta meminimalkan jejak penyimpanan.

