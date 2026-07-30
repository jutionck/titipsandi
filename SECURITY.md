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
- Ciphertext v2 memisahkan subkey field encryption dan blind index dengan HKDF,
  serta menyimpan fingerprint non-secret untuk memilih key saat rotasi.
- Kode akses darurat tidak dapat dipulihkan dari hash database.
- Login passkey memverifikasi challenge, origin, RP ID, signature counter, dan
  user verification. Data biometrik maupun PIN perangkat tidak diterima server.
- Token pemulihan password dibuat acak, disimpan sebagai hash, berlaku singkat,
  hanya dapat digunakan sekali, dan reset mencabut seluruh sesi lama.
- Registrasi baru wajib memverifikasi email dengan token acak hash-only sebelum
  sesi login dapat diterbitkan.
- Login dengan Master Password belum menerbitkan sesi sebelum OTP email enam
  digit diverifikasi. Challenge OTP memakai cookie HttpOnly, kode disimpan
  sebagai hash yang terikat ke challenge, berlaku lima menit, dibatasi lima
  percobaan, dan hanya dapat digunakan sekali.
- Setiap login membuat sesi individual berumur maksimal 12 jam. Pemilik dapat
  melihat perangkat aktif dan mencabut satu atau seluruh sesi perangkat lain.
  Reset password mencabut seluruh sesi lama.
- Opsi “ingat sampai tab ditutup” menyimpan vault key pada `sessionStorage`.
  Saat refresh, aplikasi hanya memulihkannya setelah user ID pada sesi server
  cocok. Logout, sesi yang tidak valid, data storage rusak, dan penutupan tab
  menghapus atau mengakhiri akses terhadap salinan tersebut.
- Pengguna dapat mengganti OTP email dengan TOTP RFC 6238 dari aplikasi
  authenticator. Secret TOTP dienkripsi menggunakan application key. Sepuluh
  recovery code dibuat secara acak, hanya ditampilkan saat dibuat, disimpan
  sebagai blind index, dan masing-masing hanya dapat digunakan satu kali.
- Challenge login mengikat metode verifikasi yang dipilih. Endpoint kirim ulang
  email menolak challenge TOTP, dan konsumsi challenge beserta pembuatan sesi
  dilakukan dalam transaksi database.
- Aktivitas login, perubahan password, perubahan kontak tepercaya, dan akses
  darurat, pengelolaan TOTP, serta pencabutan sesi dicatat tanpa menyimpan
  password, OTP, recovery code, kode akses, email, atau plaintext vault. Log
  aplikasi ini belum tahan-rusak sehingga tetap memerlukan observability
  eksternal untuk deployment publik.
- CSP production memakai nonce acak per-request dan tidak mengizinkan
  `unsafe-inline` maupun `unsafe-eval` untuk script.

Di luar perlindungan saat ini:

- Kompromi runtime Vercel atau `ENCRYPTION_KEY`.
- JavaScript berbahaya yang disajikan dari origin aplikasi.
- `sessionStorage` dapat dibaca JavaScript pada origin yang sama. Mengaktifkan
  opsi ingat-tab memperpanjang jendela risiko XSS sampai tab ditutup.
- Perangkat pengguna, browser extension, clipboard, screenshot, dan phishing.
- Pengambilalihan mailbox pengguna yang dapat menerima OTP login dan tautan
  pemulihan.
- Serangan volumetrik/DDoS yang harus dihentikan sebelum mencapai aplikasi dan
  database. Rate limiter aplikasi ditujukan untuk brute force, bukan menyerap
  traffic flooding.
- Administrator aplikasi yang sengaja memodifikasi server.
- Kehilangan Master Password sekaligus recovery key pengguna.
- Pemulihan melalui backup/export terenkripsi belum tersedia pada release
  `v0.3.0-alpha`.

## Pengelolaan secret

- Simpan `DATABASE_URL`, `MIGRATION_DATABASE_URL`, `JWT_SECRET`, dan
  `ENCRYPTION_KEY` hanya di secret manager environment. Simpan `RESEND_API_KEY`
  dengan perlindungan yang sama dan jangan memakai API key lintas-environment.
  Perlakukan seluruh nilai `ENCRYPTION_KEY_PREVIOUS` dengan tingkat perlindungan
  yang sama.
- Tetapkan `APP_ORIGIN` ke origin HTTPS canonical agar tautan pemulihan tidak
  dapat diarahkan oleh header request yang dikendalikan client.
- Tetapkan `WEBAUTHN_ORIGIN` dan `WEBAUTHN_RP_ID` ke domain canonical production.
  Endpoint passkey gagal secara tertutup jika nilai production hilang atau tidak
  cocok. Perubahan domain membuat passkey lama tidak dapat dipakai pada domain baru.
- Gunakan nilai berbeda per environment.
- Jangan mengirim secret melalui issue, log, screenshot, atau chat publik.
- Backup terenkripsi harus diuji pemulihannya.
- Rotasi `JWT_SECRET` mengakhiri semua sesi. Rotasi `ENCRYPTION_KEY` memerlukan
  key lama tetap tersedia di `ENCRYPTION_KEY_PREVIOUS` sampai re-enkripsi dan
  migrasi blind index selesai. Jangan menghapus key lama hanya karena key baru
  sudah aktif.

## Checklist deployment keamanan

- Terapkan seluruh Prisma migration dengan `prisma migrate deploy`; jangan
  memakai `prisma db push` pada production.
- Gunakan key dan database yang berbeda untuk development, preview, dan
  production.
- Pastikan `APP_ORIGIN`, `WEBAUTHN_ORIGIN`, dan `WEBAUTHN_RP_ID` menunjuk domain
  canonical yang sama.
- Verifikasi login OTP email, TOTP, recovery code sekali pakai, passkey,
  pencabutan sesi, serta audit log setelah deployment.
- Aktifkan WAF/rate limiting di edge dan observability yang tidak menyimpan
  password, OTP, token, recovery code, atau plaintext vault.
- Pertahankan `ENCRYPTION_KEY_PREVIOUS` sampai seluruh ciphertext dan blind index
  yang masih membutuhkannya selesai dimigrasikan.

## Pelaporan kerentanan

Jangan membuat public issue untuk kerentanan yang belum diperbaiki. Gunakan
GitHub Private Vulnerability Reporting pada tab **Security** repository. Sertakan
dampak, langkah reproduksi minimal, dan versi/commit yang diuji.

Maintainer repository harus mengaktifkan **Private vulnerability reporting**
sebelum menerima deployment publik. Jangan menyertakan credential, data
pengguna, atau isi vault asli dalam laporan.
