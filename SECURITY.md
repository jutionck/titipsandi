# Security Policy

## Status keamanan

TitipSandi menangani data dengan dampak tinggi. Proyek ini masih membutuhkan
security audit independen sebelum direkomendasikan untuk penggunaan publik.
Tidak ada jaminan absolut bahwa perangkat lunak bebas dari kerentanan.

## Versi yang didukung

Hanya commit terbaru pada branch default yang menerima pembaruan keamanan
selama proyek masih berada pada versi `0.x`. Belum ada dukungan keamanan
jangka panjang untuk release lama.

## Threat model ringkas

Perlindungan yang dituju:

- Kebocoran database Supabase saja tidak mengungkap field vault dan data
  pribadi yang dienkripsi.
- Repo publik tidak memuat credential atau encryption key.
- Ciphertext yang diubah atau dipindahkan antar-field gagal diautentikasi.
- Kode akses darurat tidak dapat dipulihkan dari hash database.

Di luar perlindungan saat ini:

- Kompromi runtime Vercel atau `ENCRYPTION_KEY`.
- JavaScript berbahaya yang disajikan dari origin aplikasi.
- Perangkat pengguna, browser extension, clipboard, screenshot, dan phishing.
- Pengambilalihan akun tanpa MFA.
- Traffic flooding dan brute force terdistribusi tanpa rate limiter eksternal.
- Administrator aplikasi yang sengaja memodifikasi server.

## Pengelolaan secret

- Simpan `DATABASE_URL`, `MIGRATION_DATABASE_URL`, `JWT_SECRET`, dan
  `ENCRYPTION_KEY` hanya di secret manager environment.
- Gunakan nilai berbeda per environment.
- Jangan mengirim secret melalui issue, log, screenshot, atau chat publik.
- Backup terenkripsi harus diuji pemulihannya.
- Rotasi `JWT_SECRET` mengakhiri semua sesi. Rotasi `ENCRYPTION_KEY` memerlukan
  migrasi/re-enkripsi data terlebih dahulu.

## Pelaporan kerentanan

Jangan membuat public issue untuk kerentanan yang belum diperbaiki. Gunakan
GitHub Private Vulnerability Reporting pada tab **Security** repository. Sertakan
dampak, langkah reproduksi minimal, dan versi/commit yang diuji.

Maintainer repository harus mengaktifkan **Private vulnerability reporting**
sebelum menerima deployment publik. Jangan menyertakan credential, data
pengguna, atau isi vault asli dalam laporan.
