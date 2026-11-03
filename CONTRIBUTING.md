# Berkontribusi

Terima kasih sudah tertarik berkontribusi ke OpenHouse!

## Alur Kontribusi

1. Buka issue terlebih dahulu untuk perubahan besar atau usulan fitur baru, agar arah perbaikan dapat disepakati bersama sebelum mulai menulis kode.
2. Fork repository ini, buat branch baru dari `main`.
3. Jalankan project di komputer lokal mengikuti panduan [docs/getting-started.md](./docs/getting-started.md).
4. Pastikan build dan typecheck lolos sebelum mengajukan Pull Request:

   ```bash
   bun run build
   ```

5. Jika ada perubahan skema database di `src/worker/db/schema.ts`, buat file migrasinya menggunakan:

   ```bash
   bun run db:generate
   ```

   Sertakan file migrasi yang dihasilkan di folder `drizzle/migrations`.

## Panduan Kode

- Gunakan TypeScript strict tanpa `any` implisit.
- Teks antarmuka yang terlihat pengguna menggunakan Bahasa Indonesia yang komunikatif dan ramah pengguna.
- Tulis komentar kode hanya untuk menjelaskan *alasan* (*why*), bukan mengulang apa yang sudah jelas dari kode (*what*).
- **Penting:** Jangan pernah meng-commit file kredensial lokal seperti `.dev.vars` atau file `wrangler.jsonc` privat milik Anda.

## Melaporkan Masalah (Bug)

Gunakan fitur **Issues** di GitHub untuk melaporkan bug. Untuk laporan celah keamanan, ikuti instruksi privat di [SECURITY.md](./SECURITY.md).

