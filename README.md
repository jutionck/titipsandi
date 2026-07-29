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
- Passkey memakai WebAuthn dengan verifikasi pengguna wajib. Biometrik dan PIN
  perangkat tidak pernah dikirim ke server; database hanya menyimpan public key.
- API dan halaman privat menggunakan `Cache-Control: no-store`; service worker
  tidak menyimpan halaman atau respons vault.
- Supabase dipakai hanya sebagai PostgreSQL terkelola. Aplikasi tidak
  membutuhkan Supabase anon key atau service-role key.

Metadata berikut masih terlihat oleh administrator database: ID internal,
kategori vault, waktu pembuatan/perubahan, relasi antar-record, status aktivasi
akses darurat, password hash login, blind index email, hash kode darurat, serta
metadata dan public key passkey.
Lihat [SECURITY.md](SECURITY.md) untuk threat model dan pelaporan kerentanan.

## Prasyarat

- Node.js 20.19 atau lebih baru
- npm
- PostgreSQL lokal untuk development
- Project Supabase untuk deployment production

## Setup development lokal

1. Jalankan PostgreSQL lokal.
2. Buat database kosong bernama `titipsandi_dev`.
3. Salin `.env.example` menjadi `.env.development.local`, lalu sesuaikan
   username dan password PostgreSQL lokal.

Migrasi yang tersedia membuat database PostgreSQL baru. Data dari `dev.db`
SQLite lama tidak dipindahkan otomatis; jangan menghapus file lama sebelum
proses export/import terverifikasi.

Isi secret development di `.env` atau `.env.development.local`:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/titipsandi_dev"
MIGRATION_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/titipsandi_dev"
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
konfigurasi otomatis memakai `DATABASE_URL`. Prisma memuat file environment
dengan urutan yang sama seperti aplikasi, sehingga migrasi lokal juga tidak
mengarah ke Supabase.
Jangan menjalankan `prisma db push` pada database production.

## Deployment Vercel

Di Vercel, buat project Supabase lalu salin connection string dari halaman
**Connect**. Gunakan transaction pooler port `6543` untuk `DATABASE_URL` dan
session pooler port `5432` untuk `MIGRATION_DATABASE_URL`. URL-encode password
database bila mengandung karakter khusus.

Tambahkan environment variables berikut untuk Production:

- `DATABASE_URL`
- `MIGRATION_DATABASE_URL` (opsional jika memakai derivasi otomatis)
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `WEBAUTHN_ORIGIN=https://titipsandi.com`
- `WEBAUTHN_RP_ID=titipsandi.com`

Jangan menyalin nilai production tersebut ke `.env.development.local`.
Jika memakai Vercel Preview, gunakan project/database terpisah dari production.
Jangan memasang nilai WebAuthn production pada Preview karena passkey terikat
pada origin dan RP ID. Tanpa variabel tersebut, aplikasi memakai origin request.

Jangan menyalin nilai production tersebut ke `.env.development.local`.
Jika memakai Vercel Preview, gunakan project/database terpisah dari production.

Jalankan migration secara terkontrol dengan `npm run db:deploy` sebelum
mengalihkan traffic. Build Vercel otomatis menjalankan `prisma generate`.

Jangan memasukkan `.env`, connection string, token Supabase, atau hasil dump
database ke Git. `.gitignore` sudah menolak seluruh `.env*` kecuali
`.env.example`.

Untuk mengarahkan tombol dukungan ke profil Saweria maintainer, isi
`NEXT_PUBLIC_DEVELOPER_DONATION_URL`. Jika kosong, tombol tetap tampil dan
mengarah ke halaman utama Saweria.

## Login dengan passkey

Setelah login memakai Master Password, buka halaman **Informasi** lalu pilih
**Aktifkan Face ID / Sidik Jari / PIN**. Browser dan sistem operasi akan membuat
passkey yang terikat pada domain aplikasi. Master Password harus dikonfirmasi
saat menambahkan passkey baru. Login berikutnya cukup memasukkan email dan
memilih **Masuk dengan Passkey**.

Master Password tetap tersedia sebagai fallback. Hapus passkey yang tidak lagi
digunakan dari halaman Informasi. WebAuthn memerlukan HTTPS, kecuali localhost
yang diizinkan untuk development.

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
- Belum tersedia recovery key, rotasi kunci otomatis, session revocation,
  rate limiter terdistribusi, audit log tahan-rusak, atau security audit
  independen.
- Untuk deployment publik, aktifkan rate limiting/WAF pada endpoint `/api/auth/*`
  dan `/api/emergency` di depan aplikasi.
- Jangan menyatakan aplikasi “dijamin aman”, “zero knowledge”, atau
  “enkripsi lokal” sebelum arsitekturnya benar-benar mendukung klaim tersebut.

## Lisensi

[MIT](LICENSE)
