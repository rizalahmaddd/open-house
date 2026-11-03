# Panduan Deployment Cloudflare

OpenHouse dirancang untuk berjalan 100% *serverless* di jaringan edge global Cloudflare tanpa memerlukan server VPS tradisional.

---

## Layanan Cloudflare yang Digunakan

| Layanan | Peran |
|---|---|
| **Cloudflare Workers** | Backend API (Hono) + Cron Trigger tagihan harian |
| **Cloudflare D1** | Database relasional SQLite serverless |
| **Cloudflare R2** | Penyimpanan aset file (Foto KTP WebP, bukti bayar, QRIS) |
| **Cloudflare Static Assets** | Frontend SPA (React 19 + Tailwind CSS) |

---

## Langkah Deployment

### 1. Login ke Cloudflare via Wrangler

```bash
bunx wrangler login
```

### 2. Buat Database D1 & Bucket R2 di Akun Anda

```bash
# Buat database D1
bunx wrangler d1 create openhouse-db

# Buat bucket penyimpanan R2
bunx wrangler r2 bucket create openhouse-storage
```

Wrangler akan mencetak output berisi `database_id`.

### 3. Sesuaikan `wrangler.jsonc`

Perbarui file `wrangler.jsonc` lokal Anda:

```jsonc
{
  "name": "openhouse",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "openhouse-db",
      "database_id": "<salin-database-id-anda-di-sini>",
      "migrations_dir": "drizzle/migrations"
    }
  ],
  "r2_buckets": [
    {
      "binding": "BUCKET",
      "bucket_name": "openhouse-storage"
    }
  ]
}
```

Jika Anda ingin mengaitkannya ke custom domain, tambahkan blok `routes`:

```jsonc
"routes": [
  { "pattern": "kos.domainanda.com", "custom_domain": true }
]
```

### 4. Terapkan Migrasi Database ke Cloudflare D1 Produksi

```bash
bun run db:migrate:prod
```

### 5. Build & Deploy

Jalankan perintah deployment tunggal:

```bash
bun run deploy
```

Skrip ini akan mengompilasi frontend React & backend Worker secara otomatis dan mengunggahnya ke Cloudflare.

