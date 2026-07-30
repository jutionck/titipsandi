# TitipSandi

[![CI](https://github.com/jutionck/titipsandi/actions/workflows/ci.yml/badge.svg)](https://github.com/jutionck/titipsandi/actions/workflows/ci.yml)

TitipSandi adalah password vault dan mekanisme akses darurat keluarga yang
bersifat open source dan dapat di-self-host.

## Fitur utama

- Vault terenkripsi di browser menggunakan AES-256-GCM.
- Recovery key untuk membuka kembali vault tanpa mengirim plaintext ke server.
- Akses darurat keluarga dengan request, masa tunggu, persetujuan, dan penolakan.
- Login Master Password dengan verifikasi kedua melalui OTP email atau TOTP.
- Recovery codes TOTP yang hanya dapat digunakan satu kali.
- Passkey WebAuthn dengan verifikasi pengguna.
- Manajemen sesi per perangkat dan pencabutan sesi jarak jauh.
- Riwayat aktivitas keamanan untuk peristiwa akun penting.

> [!IMPORTANT]
> Belum ada perangkat lunak yang dapat menjamin kerahasiaan secara absolut.
> Isi vault dienkripsi di browser sebelum dikirim ke server. Arsitektur ini belum
> memperoleh audit keamanan independen; jangan menganggapnya menjamin kerahasiaan
> absolut sebelum pengujian penetrasi, backup, monitoring, dan review kriptografi.

## Model keamanan

- Browser menurunkan authentication secret terpisah; password asli tidak dikirim
  ke server. Authentication secret tetap di-hash dengan bcrypt.
- Isi vault, termasuk judul, username, email akun, password, PIN, URL, dan
  catatan, dienkripsi dengan AES-256-GCM sebelum masuk ke PostgreSQL.
- Nama dan email pengguna serta data pribadi kontak terpercaya juga dienkripsi.
  Pencarian email login menggunakan blind index berbasis HMAC.
- Enkripsi metadata akun di server memakai format ciphertext v2 dan subkey
  HKDF-SHA-256 yang terpisah dari blind index.
- Kode darurat 256-bit dibuat di browser dan hanya hash SHA-256-nya yang
  disimpan. Akses memerlukan persetujuan atau melewati masa tunggu.
- Cookie sesi bersifat `HttpOnly`, `SameSite=Strict`, dan `Secure` di production.
- Pemulihan password memakai tautan acak 256-bit yang berlaku 10 menit, hanya
  dapat digunakan sekali, dan disimpan sebagai hash. Reset password mencabut
  seluruh sesi lama melalui versi sesi per pengguna.
- Registrasi baru tidak membuat sesi sebelum alamat email diverifikasi melalui
  token hash-only sekali pakai yang berlaku 30 menit.
- Login dengan Master Password memerlukan verifikasi kedua sebelum sesi dibuat.
  Akun memakai OTP email enam digit secara default; setelah TOTP diaktifkan,
  pengguna memakai kode aplikasi authenticator atau recovery code sekali pakai.
  Challenge dibatasi lima percobaan dan berlaku lima menit.
- Passkey memakai WebAuthn dengan verifikasi pengguna wajib. Biometrik dan PIN
  perangkat tidak pernah dikirim ke server; database hanya menyimpan public key.
- Setiap login membuat sesi individual dengan umur maksimal 12 jam. Pengguna
  dapat melihat perangkat aktif serta mencabut satu atau seluruh sesi lain.
- Secara opsional, pengguna dapat mengingat vault sampai tab ditutup. Vault key
  disimpan pada `sessionStorage`, divalidasi terhadap user sesi saat refresh,
  dan dihapus ketika logout atau tab ditutup. Opsi ini tidak memakai
  `localStorage` dan tidak bertahan antar-sesi browser.
- Login, perubahan password, perubahan kontak tepercaya, pengelolaan TOTP dan
  sesi, serta akses darurat dicatat dalam riwayat aktivitas keamanan tanpa
  menyimpan secret atau plaintext vault.
- Endpoint login, registrasi, passkey, dan akses darurat memakai rate limiter
  PostgreSQL lintas-instance. Identifier bucket disimpan sebagai blind index,
  bukan email, IP, atau kode darurat mentah.
- CSP production memakai nonce unik per-request dan `strict-dynamic`; script
  inline tanpa nonce ditolak. Konsekuensinya, halaman dirender dinamis agar
  Next.js dapat menerapkan nonce pada script framework.
- API dan halaman privat menggunakan `Cache-Control: no-store`; service worker
  tidak menyimpan halaman atau respons vault.
- Supabase dipakai hanya sebagai PostgreSQL terkelola. Aplikasi tidak
  membutuhkan Supabase anon key atau service-role key.

Metadata berikut masih terlihat oleh administrator database: ID internal,
kategori vault, waktu pembuatan/perubahan, relasi antar-record, status aktivasi
akses darurat, password hash login, blind index email versi lama dan baru, hash
kode darurat, serta metadata dan public key passkey.
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

Isi seluruh konfigurasi development di `.env.development.local`. Jangan memakai
`.env` bersama untuk secret karena Next.js dan Prisma dapat memakainya sebagai
fallback lintas-environment:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/titipsandi_dev"
MIGRATION_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/titipsandi_dev"
JWT_SECRET="64-karakter-hex-acak"
ENCRYPTION_KEY="64-karakter-hex-acak"
ENCRYPTION_KEY_PREVIOUS=""
ENCRYPTION_WRITE_VERSION="v1"
APP_ORIGIN="http://localhost:3000"
RESEND_API_KEY=""
EMAIL_FROM="TitipSandi <noreply@example.com>"
```

Buat secret terpisah:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Jangan menggunakan nilai yang sama untuk `JWT_SECRET` dan `ENCRYPTION_KEY`.
Kehilangan `ENCRYPTION_KEY` membuat metadata akun dan kontak tidak dapat dibaca.
Isi vault bergantung pada Master Password atau recovery key pengguna.

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
- `ENCRYPTION_KEY_PREVIOUS` (kosong jika belum melakukan rotasi)
- `ENCRYPTION_WRITE_VERSION=v1` untuk rollout awal
- `APP_ORIGIN=https://titipsandi.vercel.app`
- `RESEND_API_KEY`
- `EMAIL_FROM=TitipSandi <noreply@domain-yang-terverifikasi>`
- `WEBAUTHN_ORIGIN=https://titipsandi.vercel.app`
- `WEBAUTHN_RP_ID=titipsandi.vercel.app`

Jangan menyalin nilai production tersebut ke `.env.development.local`.
Untuk pengujian production lokal, gunakan `.env.production.local`. Pada Vercel,
tetap gunakan Environment Variables di dashboard dan jangan mengunggah file
environment lokal.
Jika memakai Vercel Preview, gunakan project/database terpisah dari production.
Jangan memasang nilai WebAuthn production pada Preview karena passkey terikat pada
origin dan RP ID. Di production, endpoint passkey menolak berjalan bila kedua
variabel WebAuthn kosong, origin bukan HTTPS, atau RP ID tidak cocok. Passkey pada
Preview hanya dapat digunakan bila Preview memiliki domain stabil dan nilai
WebAuthn khusus environment tersebut; tanpa itu, gunakan Master Password.
Passkey yang dibuat pada `titipsandi.vercel.app` tidak dapat digunakan pada
custom domain yang berbeda. Saat custom domain siap, pengguna perlu login dengan
fallback lalu mendaftarkan passkey baru pada domain tersebut.

Jalankan migration secara terkontrol dengan `npm run db:deploy` sebelum
mengalihkan traffic. Migration juga membuat tabel rate-limit yang diperlukan
endpoint autentikasi. Build Vercel otomatis menjalankan `prisma generate`.

## Rollout key separation dan rotasi

Bagian ini hanya berlaku untuk enkripsi metadata akun/kontak di server, bukan
untuk isi vault yang dienkripsi di browser.

1. Deploy migration dan kode dengan `ENCRYPTION_WRITE_VERSION=v1`.
2. Verifikasi login Master Password beserta OTP email/TOTP, recovery code,
   passkey, sesi perangkat, audit log, dan blind index email.
3. Setelah deployment stabil, ubah `ENCRYPTION_WRITE_VERSION=v2`. Record baru
   dan record yang diedit mulai memakai subkey HKDF dan format ciphertext v2.
4. Untuk mengganti master key, pindahkan nilai lama ke
   `ENCRYPTION_KEY_PREVIOUS`, tetapkan key baru sebagai `ENCRYPTION_KEY`, lalu
   deploy kedua nilai secara bersamaan.
5. Jangan menghapus key previous sampai seluruh metadata v1/v2 dan blind index
   yang bergantung pada key tersebut sudah dimigrasikan dan diverifikasi.

`ENCRYPTION_KEY_PREVIOUS` menerima maksimal delapan key hex yang dipisahkan koma.
Key aktif dan key sebelumnya tidak boleh sama. Kehilangan seluruh key yang dapat
membuka suatu ciphertext berarti data tersebut tidak dapat dipulihkan.

Jangan memasukkan `.env`, connection string, token Supabase, atau hasil dump
database ke Git. `.gitignore` sudah menolak seluruh `.env*` kecuali
`.env.example`.

Untuk mengarahkan tombol dukungan ke profil Saweria maintainer, isi
`NEXT_PUBLIC_DEVELOPER_DONATION_URL`. Jika kosong, tombol tetap tampil dan
mengarah ke halaman utama Saweria.

## Login dengan passkey

Setelah login memakai Master Password, buka halaman **Keamanan** lalu pilih
**Aktifkan Face ID / Sidik Jari / PIN**. Browser dan sistem operasi akan membuat
passkey yang terikat pada domain aplikasi. Master Password harus dikonfirmasi
saat menambahkan passkey baru. Login berikutnya dapat langsung memilih
**Masuk dengan Passkey** tanpa memasukkan email.

Master Password tetap tersedia sebagai fallback. Hapus passkey yang tidak lagi
digunakan dari halaman Keamanan. WebAuthn memerlukan HTTPS, kecuali localhost
yang diizinkan untuk development.

## TOTP dan recovery codes

Aktifkan TOTP dari halaman **Keamanan**, pindai QR dengan aplikasi authenticator,
lalu konfirmasi satu kode enam digit. Setelah aktif, login Master Password tidak
lagi mengirim OTP email dan meminta kode authenticator.

Saat aktivasi, TitipSandi menampilkan sepuluh recovery code. Simpan kode tersebut
di tempat terpisah dari perangkat authenticator. Setiap kode hanya berlaku satu
kali, tidak dapat ditampilkan kembali, dan regenerasi akan membatalkan seluruh
kode lama. Menonaktifkan TOTP mengembalikan login ke OTP email.

## Sesi perangkat dan aktivitas keamanan

Halaman **Keamanan** menampilkan sesi aktif, informasi perangkat ringkas, waktu
aktivitas, serta kontrol untuk mencabut sesi. Pencabutan berlaku pada request
berikutnya; reset password mencabut seluruh sesi lama.

Riwayat aktivitas mencatat peristiwa penting seperti login, perubahan password,
pengelolaan TOTP, kontak tepercaya, dan akses darurat. Riwayat ini membantu
pemilik mendeteksi aktivitas tidak dikenal, tetapi belum tahan-rusak dan bukan
pengganti observability eksternal.

## Verifikasi email

Registrasi baru mengirim tautan verifikasi melalui Resend dan tidak langsung
memberikan sesi. Pengguna baru hanya dapat login setelah verifikasi berhasil.
Permintaan kirim ulang memakai respons generik dan rate limit untuk mengurangi
enumerasi akun. Migrasi menandai akun yang sudah ada sebagai terverifikasi agar
rollout tidak mengunci pengguna lama.

## Pemulihan akun

Tautan **Lupa password?** mengirim email melalui Resend. Domain pengirim harus
diverifikasi di dashboard Resend dan `APP_ORIGIN` harus sama dengan origin
production. Respons endpoint selalu generik agar tidak mengungkap apakah suatu
email terdaftar.

Tautan pemulihan berlaku 10 menit, hanya dapat digunakan sekali, dan permintaan
baru membatalkan tautan lama. Token mentah tidak disimpan di database atau
dicatat ke log. Setelah password berubah, seluruh sesi sebelumnya ditolak dan
pengguna harus login kembali. Passkey tetap menjadi metode login utama; email
pemulihan adalah fallback dan keamanan akun tetap bergantung pada keamanan
mailbox pengguna.

## Pengembangan

```bash
npm run dev
npm run check
npm run build
```

## Release

Versi aplikasi mengikuti Semantic Versioning selama masa alpha. Sebelum membuat
tag, pastikan migration production sudah sinkron, CI berhasil, dan smoke test
production selesai. Catatan perubahan tersedia di [CHANGELOG.md](CHANGELOG.md).
Naskah release kandidat saat ini tersedia di
[docs/release-v0.3.0-alpha.md](docs/release-v0.3.0-alpha.md).

Contoh pembuatan tag setelah commit dokumentasi masuk ke `main`:

```bash
git tag -a v0.3.0-alpha -m "TitipSandi v0.3.0-alpha"
git push origin v0.3.0-alpha
```

## Kontribusi

Kontribusi dipersilakan melalui issue dan pull request. Baca
[CONTRIBUTING.md](CONTRIBUTING.md) dan [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
sebelum mulai. Jangan memasukkan credential, data vault asli, dump database,
atau detail kerentanan yang belum diperbaiki ke issue maupun pull request.

Kerentanan keamanan harus dilaporkan secara privat sesuai
[SECURITY.md](SECURITY.md).

## Batasan penting

- Enkripsi vault berlangsung di browser. Metadata akun dan kontak yang diperlukan
  untuk pengiriman email masih dilindungi menggunakan key aplikasi server.
- Recovery key harus disimpan pengguna; kehilangan master password dan recovery
  key membuat vault tidak dapat dipulihkan.
- Riwayat aktivitas keamanan tersedia untuk pemilik akun, tetapi belum bersifat
  tahan-rusak dan belum menggantikan log operasional eksternal. Security audit
  independen juga belum dilakukan.
- Sesi login dikelola per perangkat, berumur maksimal 12 jam, dan dapat dicabut
  pemilik melalui halaman Keamanan.
- TOTP authenticator dan recovery code sekali pakai dapat dikelola melalui
  halaman Keamanan.
- Opsi mengingat vault dalam satu tab memperpanjang waktu vault key tersedia
  bagi JavaScript pada origin aplikasi. Jangan aktifkan pada perangkat bersama.
- Export/backup vault terenkripsi dan prosedur restore yang teruji belum
  tersedia pada release ini.
- Rate limiter aplikasi mengurangi brute force, tetapi bukan perlindungan DDoS.
  Untuk deployment publik, tetap aktifkan WAF dan pembatasan traffic di depan
  endpoint `/api/auth/*` dan `/api/emergency`. Pastikan reverse proxy mengganti,
  bukan meneruskan mentah, header `X-Forwarded-For` dari client.
- Jangan menyatakan aplikasi “dijamin aman” sebelum audit independen.

## Lisensi

[MIT](LICENSE)
