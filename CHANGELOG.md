# Changelog

Semua perubahan penting TitipSandi dicatat di dokumen ini. Format mengikuti
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) dan versi mengikuti
[Semantic Versioning](https://semver.org/) selama masa alpha.

## [0.3.0-alpha] - 2026-07-30

### Added

- Enkripsi vault sisi klien dengan AES-256-GCM dan per-user vault key.
- Recovery key dan pembungkusan vault key untuk akses darurat.
- Alur akses darurat berupa request, countdown, approval, rejection, dan grant.
- TOTP RFC 6238 sebagai verifikasi kedua login Master Password.
- Sepuluh recovery code TOTP sekali pakai yang disimpan sebagai blind index.
- Manajemen sesi individual per perangkat dengan masa aktif maksimal 12 jam.
- Riwayat aktivitas keamanan untuk login, password, TOTP, sesi, kontak
  tepercaya, dan akses darurat.
- Halaman Keamanan khusus untuk TOTP, passkey, sesi, dan aktivitas akun.
- Email verifikasi, pemulihan akun, undangan kontak, dan notifikasi keamanan
  dengan template visual TitipSandi.

### Changed

- Password asli tidak lagi dikirim ke server; browser menurunkan authentication
  secret terpisah.
- API vault hanya menerima ciphertext setelah cutover zero-knowledge.
- Login Master Password memerlukan OTP email atau TOTP sebelum sesi diterbitkan.
- Registrasi memerlukan verifikasi email sebelum pengguna dapat login.
- Reset password mencabut seluruh sesi lama.
- Akses darurat tidak lagi langsung membuka vault hanya dengan kode akses.
- Navigasi desktop dan mobile memisahkan Keamanan dari Informasi aplikasi.

### Security

- Menambahkan blind index email dan pemisahan subkey HKDF untuk metadata akun.
- Menambahkan rotasi encryption key dengan `ENCRYPTION_KEY_PREVIOUS`.
- Menambahkan rate limiter PostgreSQL lintas-instance untuk endpoint sensitif.
- Menambahkan CSP production berbasis nonce dan `strict-dynamic`.
- Menambahkan passkey WebAuthn dengan user verification wajib.
- Memastikan challenge OTP hanya sekali pakai, dibatasi percobaan, dan dikonsumsi
  secara atomik bersama pembuatan sesi.

### Known limitations

- Belum menjalani audit keamanan independen.
- Audit log aplikasi belum tahan-rusak.
- Export/backup vault terenkripsi dan prosedur restore belum tersedia.
- Self-hosting dengan paket Docker belum disiapkan.

## [0.2.0-alpha] - 2026-07-29

### Added

- Passkey WebAuthn dengan dukungan discoverable credential.
- Email verifikasi registrasi dan pemulihan password melalui Resend.
- Rotasi encryption key untuk metadata akun dan kontak.
- CI untuk lint, typecheck, test, validasi migration, audit dependency, dan build.
- PWA serta pemisahan konfigurasi development dan production.

### Security

- Memperkuat autentikasi, rate limiting, CSP, cookie sesi, dan validasi
  environment production.
- Menambahkan blind index email serta dukungan migrasi key encryption.

## [0.1.0-alpha] - 2026-07-28

- Release alpha awal TitipSandi.

[0.3.0-alpha]: https://github.com/jutionck/titipsandi/compare/v0.2.0-alpha...v0.3.0-alpha
[0.2.0-alpha]: https://github.com/jutionck/titipsandi/compare/v0.1.0-alpha...v0.2.0-alpha
[0.1.0-alpha]: https://github.com/jutionck/titipsandi/releases/tag/v0.1.0-alpha
