# TitipSandi

TitipSandi adalah password vault dan mekanisme akses darurat keluarga yang
bersifat open source dan dapat di-self-host.

> [!IMPORTANT]
> Belum ada perangkat lunak yang dapat menjamin kerahasiaan secara absolut.
> TitipSandi mengenkripsi data sensitif di server sebelum menyimpannya, tetapi
> saat ini **bukan zero-knowledge vault**: proses aplikasi yang memiliki
> `ENCRYPTION_KEY` dapat mendekripsi data. Jangan gunakan untuk data kritis
> sebelum melakukan security review independen, pengujian penetrasi, backup,
> monitoring, dan prosedur rotasi kunci.

## Model keamanan

- Password login di-hash dengan bcrypt dan tidak dapat dikembalikan ke bentuk
  asli.
- Isi vault, termasuk judul, username, email akun, password, PIN, URL, dan
  catatan, dienkripsi dengan AES-256-GCM sebelum masuk ke PostgreSQL.
- Nama dan email pengguna serta data pribadi kontak terpercaya juga dienkripsi.
  Pencarian email login menggunakan blind index berbasis HMAC.
- Kode darurat menggunakan random 128-bit, hanya ditampilkan sekali, dan hanya
  hash SHA-256-nya yang disimpan.
- Cookie sesi bersifat `HttpOnly`, `SameSite=Strict`, dan `Secure` di production.
- API dan halaman privat menggunakan `Cache-Control: no-store`; service worker
  tidak menyimpan halaman atau respons vault.
- Supabase dipakai hanya sebagai PostgreSQL terkelola. Aplikasi tidak
  membutuhkan Supabase anon key atau service-role key.

Metadata berikut masih terlihat oleh administrator database: ID internal,
kategori vault, waktu pembuatan/perubahan, relasi antar-record, status aktivasi
akses darurat, password hash login, blind index email, dan hash kode darurat.
Lihat [SECURITY.md](SECURITY.md) untuk threat model dan pelaporan kerentanan.

## Prasyarat

- Node.js 20.19 atau lebih baru
- npm
- Project Supabase

## Setup Supabase

1. Buat project di Supabase.
2. Dari halaman **Connect**, salin dua connection string:
   - Transaction pooler port `6543` untuk `DATABASE_URL` di Vercel.
   - Session pooler port `5432` untuk `MIGRATION_DATABASE_URL` bila ingin
     mengaturnya secara eksplisit. Endpoint ini mendukung jaringan IPv4.
3. URL-encode password database bila mengandung karakter khusus.

Migrasi yang tersedia membuat database PostgreSQL baru. Data dari `dev.db`
SQLite lama tidak dipindahkan otomatis; jangan menghapus file lama sebelum
proses export/import terverifikasi.

Salin `.env.example` menjadi `.env`, lalu isi:

```env
DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@REGION.pooler.supabase.com:6543/postgres?sslmode=require"
MIGRATION_DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@REGION.pooler.supabase.com:5432/postgres?sslmode=require"
JWT_SECRET="64-karakter-hex-acak"
ENCRYPTION_KEY="64-karakter-hex-acak"
```

Buat secret terpisah:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Jangan menggunakan nilai yang sama untuk `JWT_SECRET` dan `ENCRYPTION_KEY`.
Kehilangan `ENCRYPTION_KEY` berarti data vault tidak dapat dipulihkan.

## Instalasi dan migrasi

```bash
npm install
npm run db:validate
npm run db:deploy
npm run dev
```

`db:deploy` memakai `MIGRATION_DATABASE_URL`. Jika variabel itu tidak tersedia,
konfigurasi otomatis memakai `DATABASE_URL` dengan session pooler port `5432`.
Jangan menjalankan `prisma db push` pada database production.

## Deployment Vercel

Tambahkan environment variables berikut untuk Production, Preview, dan
Development sesuai kebutuhan:

- `DATABASE_URL`
- `MIGRATION_DATABASE_URL` (opsional jika memakai derivasi otomatis)
- `JWT_SECRET`
- `ENCRYPTION_KEY`

Jalankan migration secara terkontrol dengan `npm run db:deploy` sebelum
mengalihkan traffic. Build Vercel otomatis menjalankan `prisma generate`.

Jangan memasukkan `.env`, connection string, token Supabase, atau hasil dump
database ke Git. `.gitignore` sudah menolak seluruh `.env*` kecuali
`.env.example`.

## Pengembangan

```bash
npm run dev
npm run check
npm run build
```

## Kontribusi

Kontribusi dipersilakan melalui issue dan pull request. Baca
[CONTRIBUTING.md](CONTRIBUTING.md) dan [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
sebelum mulai. Jangan memasukkan credential, data vault asli, dump database,
atau detail kerentanan yang belum diperbaiki ke issue maupun pull request.

Kerentanan keamanan harus dilaporkan secara privat sesuai
[SECURITY.md](SECURITY.md).

## Batasan penting

- Enkripsi berlangsung di server, bukan di browser.
- Akses darurat adalah bearer capability: siapa pun yang memiliki kode dapat
  membuka vault terkait.
- Belum tersedia MFA, recovery key, rotasi kunci otomatis, session revocation,
  rate limiter terdistribusi, audit log tahan-rusak, atau security audit
  independen.
- Untuk deployment publik, aktifkan rate limiting/WAF pada endpoint `/api/auth/*`
  dan `/api/emergency` di depan aplikasi.
- Jangan menyatakan aplikasi “dijamin aman”, “zero knowledge”, atau
  “enkripsi lokal” sebelum arsitekturnya benar-benar mendukung klaim tersebut.

## Lisensi

[MIT](LICENSE)
