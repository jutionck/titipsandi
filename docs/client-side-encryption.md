# Fondasi enkripsi sisi klien

Status: **aktif untuk entry vault baru setelah cutover zero-knowledge**.

TitipSandi telah beralih dari enkripsi entry sisi server menuju vault yang hanya dapat
dibuka di perangkat pengguna. API vault hanya menerima payload terenkripsi. Recovery
key dan akses darurat menggunakan salinan vault key yang dibungkus di browser.

## Batas kepercayaan

Target akhirnya:

- plaintext entry dan kunci vault tidak pernah dikirim ke API;
- database hanya menyimpan ciphertext, IV, versi protokol, dan kunci vault yang sudah
  dibungkus;
- server tetap menangani autentikasi, sinkronisasi ciphertext, rate limit, dan metadata
  operasional minimum;
- perubahan ciphertext, pemindahan entry antar-pengguna, atau antar-entry terdeteksi
  oleh AES-GCM.

Password asli tidak dikirim ke server. Browser menurunkan authentication secret
terpisah untuk login, sedangkan API vault hanya menerima ciphertext. Klaim keamanan
tetap harus dibatasi sampai migrasi production dan audit independen selesai.

## Hierarki kunci versi 1

1. Browser membuat `vaultKey` acak 256-bit per pengguna.
2. Browser menurunkan key-encryption key (KEK) dari password dengan
   PBKDF2-HMAC-SHA-256, salt acak 128-bit, dan 600.000 iterasi.
3. KEK membungkus `vaultKey` menggunakan AES-256-GCM.
4. `vaultKey` mengenkripsi payload setiap entry menggunakan AES-256-GCM dan IV acak
   96-bit.
5. Associated authenticated data (AAD) mengikat kunci ke pengguna, serta ciphertext
   entry ke pengguna, ID entry, dan versi protokol.

PBKDF2 dipakai pada versi awal karena tersedia secara native melalui Web Crypto API.
Format dibuat berversi agar Argon2id dapat ditambahkan tanpa menafsirkan ulang
ciphertext lama.

## Invariant keamanan

- IV tidak boleh digunakan ulang dengan kunci yang sama.
- Parameter KDF versi 1 harus tepat 600.000 iterasi; nilai dari database tidak boleh
  menurunkan biaya derivasi.
- Material mentah `vaultKey` hanya diekspor sementara di memori saat membuat pembungkus
  akses darurat, lalu buffer sementara dibersihkan.
- Kegagalan autentikasi AES-GCM harus menghentikan dekripsi.
- Server tidak boleh melakukan pencarian terhadap plaintext. Pencarian dilakukan pada
  data yang sudah dibuka di browser.
- Metadata rahasia, termasuk kategori dan judul, berada di dalam payload terenkripsi.

## Tahapan rollout

1. ✅ **Fondasi:** primitive, test vector, dan kolom database.
2. ✅ **Provisioning:** protected vault key dibuat saat registrasi.
3. ✅ **Recovery:** recovery key dibuat di browser dan dapat membungkus ulang vault key.
4. ✅ **Emergency access:** request, masa tunggu, persetujuan/penolakan, dan emergency
   vault key yang dibungkus di browser.
5. ✅ **Cutover:** API vault berhenti menerima plaintext dan kolom plaintext lama
   dihapus.
6. ⏳ **Assurance:** threat-model testing lanjutan dan audit keamanan independen.

## Keputusan UX yang masih harus diwujudkan

- Pengguna wajib diberi tahu bahwa kehilangan password dan recovery key dapat
  menyebabkan isi vault tidak dapat dipulihkan.
- Perubahan password membungkus ulang `vaultKey`; tidak mengenkripsi ulang seluruh
  entry.
- Reset password administratif tidak otomatis membuka vault lama.
- Akses darurat hanya tersedia jika pemilik mengaturnya sebelum kehilangan akses.
