# TitipSandi v0.3.0-alpha

Release ini memperkuat fondasi TitipSandi sebagai password vault keluarga.
Perubahan utamanya adalah enkripsi vault di browser, akses darurat berbasis
persetujuan, dan lapisan keamanan akun yang lebih lengkap.

## Sorotan

- Vault dienkripsi di browser dengan per-user vault key.
- Server tidak lagi menerima plaintext entry vault.
- Akses darurat memakai request, masa tunggu, approval/rejection, dan emergency
  vault key yang dibungkus di browser.
- Login Master Password dilindungi OTP email atau TOTP authenticator.
- Tersedia recovery codes TOTP sekali pakai.
- Passkey WebAuthn tetap tersedia sebagai metode login kuat.
- Pengguna dapat melihat dan mencabut sesi perangkat.
- Aktivitas keamanan penting tampil di halaman Keamanan.
- Email akun memakai template TitipSandi yang konsisten.

## Upgrade

1. Backup database sesuai prosedur operator.
2. Pastikan environment production lengkap dan key lama tetap tersedia ketika
   melakukan rotasi.
3. Jalankan:

   ```bash
   npm ci
   npm run db:deploy
   npm run build
   ```

4. Verifikasi `npx prisma migrate status` menampilkan database up to date.
5. Smoke test login OTP email/TOTP, recovery code, passkey, sesi perangkat,
   audit log, dan akses darurat.

Release ini menggunakan 11 Prisma migration. Jangan memakai `prisma db push`
untuk melakukan upgrade production.

## Catatan keamanan

TitipSandi masih berstatus alpha dan belum menjalani audit keamanan independen.
Audit log belum tahan-rusak, export/backup terenkripsi belum tersedia, dan paket
self-hosting Docker belum disiapkan. Jangan menganggap release ini memberikan
jaminan keamanan absolut.

Detail lengkap tersedia di [CHANGELOG.md](../CHANGELOG.md) dan
[SECURITY.md](../SECURITY.md).
