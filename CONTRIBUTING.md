# Contributing to TitipSandi

Terima kasih telah membantu TitipSandi. Karena proyek ini menangani data
berdampak tinggi, perubahan kecil pun harus mempertimbangkan keamanan dan
kompatibilitas data.

## Sebelum membuat perubahan

1. Cari issue atau pull request yang sudah membahas topik yang sama.
2. Untuk perubahan besar, buka discussion atau issue desain terlebih dahulu.
3. Kerentanan yang belum diperbaiki harus dilaporkan secara privat sesuai
   `SECURITY.md`, bukan melalui public issue.

## Setup

```bash
npm install
cp .env.example .env
npm run db:validate
npm run dev
```

Gunakan database dan secret khusus development. Jangan pernah memakai data
production, data vault asli, atau credential pribadi dalam test, fixture,
screenshot, log, issue, dan pull request.

## Pemeriksaan wajib

```bash
npm run check
npm run build
npm audit --omit=dev
```

Perubahan schema harus menyertakan Prisma migration. Jangan mengubah migration
yang sudah pernah dirilis; buat migration baru.

## Pull request

- Buat perubahan sekecil dan sefokus mungkin.
- Jelaskan masalah, solusi, risiko keamanan, dan cara verifikasi.
- Tambahkan atau perbarui dokumentasi ketika perilaku atau konfigurasi berubah.
- Jangan memasukkan generated Prisma Client, `.env`, database, dump, atau
  artifact build.
- Dengan mengirim kontribusi, Anda menyetujui kontribusi tersebut dilisensikan
  di bawah lisensi MIT proyek.
